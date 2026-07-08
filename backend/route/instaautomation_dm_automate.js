const mongoose = require('mongoose');
const {
    Message,
    Conversation,
    DmAutoReplySetting,
    Token,
    DmAutoReplyLog
} = require('../model/Instaautomation');
const CreatorAsset = require('../model/CreatorAsset');
const CreatorPersona = require('../model/CreatorPersona');
const aiService = require('../service/aiService');
const inboxTriageService = require('../service/inboxTriageService');
const { processDealNegotiation } = require('./instaautomation_deal_negoseator');

// Config
const INSTAGRAM_CONFIG = {
    graphBaseUrl: process.env.INSTAGRAM_GRAPH_API_BASE_URL || 'https://graph.instagram.com',
    version: process.env.INSTAGRAM_GRAPH_API_VERSION || 'v24.0',
};

/**
 * Main Direct Message Automator and Handler
 */
async function processDirectMessage(event, igUserId, helpers) {
    const { 
        resolveUserIdMapping, 
        acquireConversationLock, 
        sendDirectMessage, 
        sendGenericTemplate,
        passThreadControl
    } = helpers;

    const senderId = String(event.sender.id);
    const recipientId = String(event.recipient.id);

    // Skip echo messages (messages sent BY the page account)
    if (event.message.is_echo) {
        console.log('[Webhook] Skipping echo message (sent by page)');
        return;
    }

    // ==================== 1. WEBHOOK REPLAY IDEMPOTENCY ====================
    const isDuplicate = await Message.exists({ messageId: event.message.mid });
    if (isDuplicate) {
        console.log(`[Webhook] Duplicate message ID ${event.message.mid} detected. Skipping replay.`);
        return;
    }

    const messageData = {
        messageId: event.message.mid,
        senderId,
        recipientId,
        text: event.message.text || null,
        attachments: event.message.attachments || [],
        timestamp: event.timestamp,
        received: new Date()
    };

    console.log('[Webhook] Message received from:', senderId);
    console.log('[Webhook] Message text:', messageData.text);

    // Store message in DB
    let igUserIdMapped = null;
    try {
        igUserIdMapped = await resolveUserIdMapping(igUserId);
        messageData.userId = igUserIdMapped;
        await Message.create(messageData);
    } catch (err) {
        console.error('[Webhook] Failed to save message natively:', err.message);
    }

    // Update conversation in DB
    const conversationId = `${senderId}_${recipientId}`;
    
    // Conversation Locking
    // Pass initialData so first-time DMs can instantly create a conversation without deadlocking
    const lockAcquired = await acquireConversationLock(conversationId, 5, {
        userId: igUserIdMapped,
        senderId,
        recipientId,
        unreadCount: 0
    });
    if (!lockAcquired) {
        console.log(`[Webhook] Conversation ${conversationId} is currently locked. Batching rapid message.`);
        return;
    }

    const existingConv = await Conversation.findOne({ conversationId });
    const currentUnread = existingConv ? existingConv.unreadCount : 0;
    
    // ==================== 1. HUMAN HANDOVER PROTOCOL (META COMPLIANCE) ====================
    if (existingConv && existingConv.automationPausedUntil && new Date() < existingConv.automationPausedUntil) {
        console.log(`[Webhook] ⏸️ Automation is PAUSED for ${conversationId} until ${existingConv.automationPausedUntil}`);
        // Still update the message history but DO NOT reply.
        await Conversation.updateOne({ conversationId }, { lastMessage: messageData, lastMessageTime: event.timestamp, $inc: { unreadCount: 1 } });
        return;
    }

    // ==================== 2. MESSAGE TYPE SAFETY (META COMPLIANCE) ====================
    const msgText = (messageData.text || '').toLowerCase().trim();
    if (!msgText) {
        console.log(`[Webhook] 📎 Message from ${senderId} contains no text (likely media/audio). Bypassing AI processing.`);
        await Conversation.updateOne(
            { conversationId }, 
            { 
                conversationId, userId: igUserIdMapped, senderId, recipientId,
                lastMessage: messageData, lastMessageTime: event.timestamp, 
                unreadCount: currentUnread + 1 
            },
            { upsert: true }
        );
        return;
    }

    const handoverKeywords = ['human', 'agent', 'stop bot', 'real person', 'talk to human', 'customer service'];
    if (handoverKeywords.some(kw => msgText === kw || msgText.includes(` ${kw} `) || msgText.startsWith(`${kw} `) || msgText.endsWith(` ${kw}`))) {
        console.log(`[Webhook] 🚨 Human Handover requested by ${senderId}. Pausing automation for 24h.`);
        const pausedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await Conversation.findOneAndUpdate(
            { conversationId },
            { 
                conversationId, userId: igUserIdMapped, senderId, recipientId,
                automationPausedUntil: pausedUntil,
                lastMessage: messageData, 
                lastMessageTime: event.timestamp, 
                unreadCount: currentUnread + 1,
                priorityTag: 'Support'
            },
            { upsert: true, new: true }
        );
        
        // Send a polite handover message
        const tokenData = await Token.findOne({ userId: igUserIdMapped }).lean();
        if (tokenData && tokenData.accessToken) {
            await sendDirectMessage(igUserId, senderId, "I've paused the bot. A human will be with you shortly! 🙌", tokenData.accessToken);
            
            // ── META HANDOVER PROTOCOL (COMPLIANCE) ──
            if (passThreadControl) {
                await passThreadControl(igUserId, senderId, tokenData.accessToken);
            }
        }
        return;
    }
    // ====================================================================================

    const isActivelyNegotiating = existingConv && existingConv.negotiationData && ['negotiating', 'drafted', 'contract_prep'].includes(existingConv.negotiationData.status);

    // Triage the message to determine priority
    let priorityTag = 'Untriaged';
    
    if (isActivelyNegotiating) {
        priorityTag = 'Collaboration';
        console.log(`[Webhook] Deal Lock Active. Forcing priority to Collaboration.`);
    } else {
        try {
            const dmSettings = await DmAutoReplySetting.findOne({ userId: igUserIdMapped });
            if (dmSettings && dmSettings.inboxTriageEnabled) {
                priorityTag = await inboxTriageService.triageMessage(messageData.text);
                console.log(`[Webhook] Inbox Triage tagged as: ${priorityTag}`);
            }
        } catch (err) {
            console.error('[Webhook] Failed to query user settings for triage:', err.message);
        }
    }

    await Conversation.findOneAndUpdate(
        { conversationId },
        {
            conversationId,
            userId: igUserIdMapped,
            senderId,
            recipientId,
            lastMessage: messageData,
            lastMessageTime: event.timestamp,
            unreadCount: currentUnread + 1,
            priorityTag
        },
        { upsert: true, new: true }
    );

    // ==================== FEATURE: AI DEAL NEGOTIATOR ====================
    if (priorityTag === 'Collaboration') {
        await processDealNegotiation(conversationId, messageData, igUserIdMapped, senderId, igUserId, sendDirectMessage);
    }

    // ==================== FEATURE: SMART FAN ENGAGEMENT (PRODUCTS/ASSETS) ====================
    if (priorityTag !== 'Collaboration' && priorityTag !== 'Spam') {
        const dmSettingsForFan = await DmAutoReplySetting.findOne({ userId: igUserIdMapped }).lean();
        
        const isStandardEnabled = dmSettingsForFan && dmSettingsForFan.enabled;
        const isAutonomousEnabled = dmSettingsForFan && dmSettingsForFan.autonomousMode;

        if (isStandardEnabled || isAutonomousEnabled) {
            console.log(`[Webhook] 🎯 Smart Router: DM Auto-Reply active (Priority: ${priorityTag}). Generating creator reply...`);
            
            // ==================== 4. SEQUENTIAL QUERY BOTTLENECK (N+1) ====================
            const [fanPersona, fanTokenData, creatorAssets, fanConv] = await Promise.all([
                CreatorPersona.findOne({ userId: igUserIdMapped }).lean(),
                Token.findOne({ userId: igUserIdMapped }).lean(),
                CreatorAsset.find({ userId: igUserIdMapped, isActive: true }).lean(),
                Conversation.findOne({ conversationId }).lean()
            ]);
            
            // ==================== 10. INEFFICIENT TOKEN PRE-VALIDATION ====================
            if (!fanTokenData || !fanTokenData.accessToken) {
                console.log(`[Webhook] 🎯 Smart Router: No access token found. Aborting Fan Engagement.`);
                return;
            }

            // ==================== 2. CONVERSATIONAL MEMORY BUG ====================
            // Ensure the user's message is pushed to history so the AI has context
            await Conversation.findOneAndUpdate(
                { conversationId },
                { $push: { "negotiationData.history": { action: 'received', text: messageData.text, timestamp: new Date() } } }
            );

            const fanHistory = (fanConv?.negotiationData?.history || []).map(h => ({
                role: h.action === 'sent' ? 'assistant' : 'user',
                text: h.text,
                timestamp: h.timestamp || new Date()
            }));

            let fanProductHandled = false;
            
            if (creatorAssets.length > 0) {
                try {
                    // Pass last 8 messages of history for contextual AI understanding, filtering out old sessions (> 3 hours)
                    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
                    const recentFanHistory = fanHistory
                        .filter(h => new Date(h.timestamp) > threeHoursAgo)
                        .slice(-8);

                    // ==================== 7. SPAM THROTTLING ====================
                    const userMessagesInLastMinute = recentFanHistory.filter(h => h.role === 'user' && new Date(h.timestamp) > new Date(Date.now() - 60 * 1000)).length;
                    if (userMessagesInLastMinute >= 5) {
                        console.log(`[Webhook] 🛑 Spam detected from ${senderId}. Throttling AI response.`);
                        return;
                    }

                    const fanMatchResult = await aiService.matchCreatorAssets(messageData.text, creatorAssets, recentFanHistory);
                    
                    if (!fanMatchResult.isGenericMessage) {
                        console.log(`[Webhook] 🎯 Fan has PRODUCT INTENT — Matched: ${fanMatchResult.matchedAssets.length}`);
                        fanProductHandled = true;

                        const fanDmReplyRaw = await aiService.generateSmartDMReply(
                            igUserIdMapped,
                            messageData.text,
                            'there',
                            fanMatchResult.matchedAssets,
                            false, 
                            [],
                            fanMatchResult.isUnavailableRequest,
                            recentFanHistory,
                            fanMatchResult.shouldSendCards
                        );

                        // ==================== 6. NO CHARACTER LIMIT SAFETY ====================
                        const fanDmReplyText = fanDmReplyRaw.text ? fanDmReplyRaw.text.substring(0, 999) : '';
                        let textSuccess = false;

                        if (fanDmReplyText) {
                            // ==================== 3. FALSE POSITIVE "SENT" LOGS ====================
                            const res = await sendDirectMessage(igUserId, senderId, fanDmReplyText, fanTokenData.accessToken);
                            textSuccess = res && res.success;
                            
                            if (textSuccess) {
                                // Save AI memory
                                await Conversation.findOneAndUpdate(
                                    { conversationId },
                                    { $push: { "negotiationData.history": { action: 'sent', text: fanDmReplyText, timestamp: new Date() } } }
                                );
                            }
                        }

                        // ==================== 9. HARDCODED DELAYS RISK WEBHOOK TIMEOUTS ====================
                        if (fanMatchResult.matchedAssets.length > 0 && fanMatchResult.shouldSendCards) {
                            // setTimeout removed for speed
                            const fanCardResult = await sendGenericTemplate(igUserId, { id: senderId }, fanMatchResult.matchedAssets, fanTokenData.accessToken);
                            
                            if (!fanCardResult.success) {
                                console.error('[Webhook] Fan card delivery failed, falling back to text links...');
                                const textLinks = fanMatchResult.matchedAssets.map(a => `\n${a.title}:\n${a.url}`).join('\n').substring(0, 999);
                                await sendDirectMessage(igUserId, senderId, textLinks, fanTokenData.accessToken);
                            }
                        }

                        await DmAutoReplyLog.create({
                            userId: igUserIdMapped,
                            senderId: senderId,
                            messageText: messageData.text,
                            replyText: fanDmReplyText,
                            replyType: 'product_recommendation',
                            assetsShared: fanDmReplyRaw.recommendedAssets || [],
                            status: textSuccess ? 'sent' : 'failed', // Accurate logging
                            scheduledAt: new Date(),
                            repliedAt: new Date()
                        });
                    }
                } catch (matchErr) {
                    // ==================== 8. DOUBLE-ERROR CASCADE ON AI OUTAGES ====================
                    console.error('[Webhook] Fan product intent detection failed:', matchErr.message);
                    return; // Abort early instead of falling back to broken AI
                }
            }

            // Fallback: Generic fan reply (no specific product intent detected)
            if (!fanProductHandled) {
                try {
                    // ==================== 5. GHOSTING VIA DETACHED PROMISES ====================
                    const fanReplyTextRaw = await inboxTriageService.generateFanReply(
                        messageData.text,
                        priorityTag,
                        fanPersona,
                        fanHistory,
                        creatorAssets
                    );

                    if (fanReplyTextRaw) {
                        const fanReplyText = fanReplyTextRaw.substring(0, 999);
                        console.log(`[Webhook] 🎯 Fan Generic Reply: "${fanReplyText}"`);
                        
                        const res = await sendDirectMessage(igUserId, senderId, fanReplyText, fanTokenData.accessToken);
                        const isSuccess = res && res.success;
                        
                        if (isSuccess) {
                            await Conversation.findOneAndUpdate(
                                { conversationId },
                                { $push: { "negotiationData.history": { action: 'sent', text: fanReplyText, timestamp: new Date() } } }
                            );
                        }

                        await DmAutoReplyLog.create({
                            userId: igUserIdMapped,
                            senderId: senderId,
                            messageText: messageData.text,
                            replyText: fanReplyText,
                            replyType: 'text',
                            status: isSuccess ? 'sent' : 'failed', // Accurate logging
                            scheduledAt: new Date(),
                            repliedAt: new Date()
                        });
                    }
                } catch (err) {
                    console.error('[Webhook] Fan Reply Error:', err.message);
                }
            }
        }
    }
}

module.exports = {
    processDirectMessage
};
