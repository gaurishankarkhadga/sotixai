const mongoose = require('mongoose');
const {
    Message,
    Conversation,
    DmAutoReplySetting,
    Token,
    BrainAnalytics,
    DmAutoReplyLog
} = require('../model/Instaautomation');
const CreatorAsset = require('../model/CreatorAsset');
const CreatorPersona = require('../model/CreatorPersona');
const axios = require('axios');
const aiService = require('../service/aiService');
const inboxTriageService = require('../service/inboxTriageService');

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
        sendGenericTemplate 
    } = helpers;

    const senderId = String(event.sender.id);
    const recipientId = String(event.recipient.id);

    // Skip echo messages (messages sent BY the page account)
    if (event.message.is_echo) {
        console.log('[Webhook] Skipping echo message (sent by page)');
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
        console.log('[Webhook] 🤖 Entering Autonomous AI Deal Negotiation Flow...');
        
        const [creatorPersona, dmSettings, brandTokenData] = await Promise.all([
            CreatorPersona.findOne({ userId: igUserIdMapped }).lean(),
            DmAutoReplySetting.findOne({ userId: igUserIdMapped }).lean(),
            Token.findOne({ userId: igUserIdMapped }).lean()
        ]);

        if (!brandTokenData || !brandTokenData.accessToken) {
            console.log('[Webhook] 🤖 Skipping negotiation — no access token found.');
        } else {
            let realFollowers = '100,000';
            let realEngagement = '5%';
            try {
                const profileRes = await axios.get(`${INSTAGRAM_CONFIG.graphBaseUrl}/me`, {
                    params: { fields: 'followers_count,media_count', access_token: brandTokenData.accessToken }
                });
                if (profileRes.data?.followers_count) {
                    realFollowers = profileRes.data.followers_count.toLocaleString();
                }
            } catch (profileErr) {}

            const conversation = await Conversation.findOneAndUpdate(
                { conversationId },
                { 
                    $push: { 
                        "negotiationData.history": { action: 'received', text: messageData.text, timestamp: new Date() } 
                    } 
                },
                { new: true, upsert: true }
            );

            const chatHistory = (conversation.negotiationData.history || []).map(h => ({
                role: h.action === 'sent' ? 'assistant' : 'user',
                text: h.text
            }));

            const customInstructionsText = (dmSettings?.customInstructions || [])
                .filter(ci => ci.active)
                .map(ci => ci.instruction)
                .join('\n');
            const negPrefs = dmSettings?.negotiationPreferences || null;

            let pastWonDeals = [];
            try {
                pastWonDeals = await BrainAnalytics.find({ userId: igUserIdMapped, dealWinStatus: 'won' }).sort({ createdAt: -1 }).limit(5).lean();
            } catch (brainErr) {}

            inboxTriageService.continueAutonomousNegotiation(
                chatHistory, realFollowers, realEngagement, creatorPersona, customInstructionsText, negPrefs, pastWonDeals
            ).then(async (aiDecision) => {
                if (!aiDecision) return;

                const isAutonomous = dmSettings?.autonomousMode === true;
                if (!isAutonomous && aiDecision.action === 'REPLY') {
                    console.log(`[Webhook] 🛡️ SAFETY: autonomousMode is OFF — forcing REQUIRE_APPROVAL`);
                    aiDecision.action = 'REQUIRE_APPROVAL';
                    aiDecision.approvalSummary = aiDecision.approvalSummary || `AI wanted to reply: "${aiDecision.replyText}"`;
                }

                if (aiDecision.action === 'REPLY' && aiDecision.replyText && brandTokenData?.accessToken) {
                    console.log(`[Webhook] 🤖 AI chose to REPLY: "${aiDecision.replyText}"`);
                    await sendDirectMessage(igUserId, senderId, aiDecision.replyText, brandTokenData.accessToken);

                    await Conversation.findOneAndUpdate(
                        { conversationId },
                        { 
                            $push: { "negotiationData.history": { action: 'sent', text: aiDecision.replyText, timestamp: new Date() } },
                            "negotiationData.status": 'negotiating',
                            "negotiationData.brandName": aiDecision.brandName || conversation.negotiationData.brandName,
                            "negotiationData.suggestedRate": aiDecision.suggestedRate || conversation.negotiationData.suggestedRate,
                            "negotiationData.metrics.requestedDeliverables": aiDecision.deliverables || conversation.negotiationData.metrics.requestedDeliverables
                        }
                    );
                } else if (aiDecision.action === 'REQUIRE_APPROVAL') {
                    console.log(`[Webhook] 🤖 AI requires APPROVAL for deal`);
                    await Conversation.findOneAndUpdate(
                        { conversationId },
                        { 
                            "negotiationData.status": 'drafted',
                            "negotiationData.draftReply": aiDecision.replyText || 'Draft pending review',
                            "negotiationData.approvalSummary": aiDecision.approvalSummary || '',
                            "negotiationData.suggestedRate": aiDecision.suggestedRate,
                            "negotiationData.brandName": aiDecision.brandName,
                            "negotiationData.metrics.requestedDeliverables": aiDecision.deliverables
                        }
                    );
                }
            }).catch(err => console.error('[Webhook] Autonomous Negotation Error:', err.message));
        }
    }

    // ==================== FEATURE: SMART FAN ENGAGEMENT (PRODUCTS/ASSETS) ====================
    if (priorityTag !== 'Collaboration' && priorityTag !== 'Spam') {
        const dmSettingsForFan = await DmAutoReplySetting.findOne({ userId: igUserIdMapped }).lean();
        
        const isStandardEnabled = dmSettingsForFan && dmSettingsForFan.enabled;
        const isAutonomousEnabled = dmSettingsForFan && dmSettingsForFan.autonomousMode;

        if (isStandardEnabled || isAutonomousEnabled) {
            console.log(`[Webhook] 🎯 Smart Router: DM Auto-Reply active (Priority: ${priorityTag}). Generating creator reply...`);
            
            const fanPersona = await CreatorPersona.findOne({ userId: igUserIdMapped }).lean();
            const fanTokenData = await Token.findOne({ userId: igUserIdMapped }).lean();
            const creatorAssets = await CreatorAsset.find({ userId: igUserIdMapped, isActive: true }).lean();
            
            if (fanTokenData && fanTokenData.accessToken) {
                const fanConv = await Conversation.findOne({ conversationId }).lean();
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
                        const fanMatchResult = await aiService.matchCreatorAssets(messageData.text, creatorAssets, recentFanHistory);
                        
                        // [UPGRADE]: Handle conversational intent even if exact match isn't found
                        if (!fanMatchResult.isGenericMessage) {
                            console.log(`[Webhook] 🎯 Fan has PRODUCT INTENT — Matched: ${fanMatchResult.matchedAssets.length}`);
                            fanProductHandled = true;

                            // Generate a smart conversational product reply
                            const fanDmReply = await aiService.generateSmartDMReply(
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

                            // Step 1: Send text reply (Conversational)
                            if (fanDmReply.text) {
                                await sendDirectMessage(igUserId, senderId, fanDmReply.text, fanTokenData.accessToken);
                            }

                            // Step 2: Send native rich cards ONLY if assets were actually matched AND shouldSendCards is true
                            if (fanMatchResult.matchedAssets.length > 0 && fanMatchResult.shouldSendCards) {
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                const fanCardResult = await sendGenericTemplate(igUserId, { id: senderId }, fanMatchResult.matchedAssets, fanTokenData.accessToken);
                                
                                if (!fanCardResult.success) {
                                    console.error('[Webhook] Fan card delivery failed, falling back to text links...');
                                    const textLinks = fanMatchResult.matchedAssets.map(a => `\n${a.title}:\n${a.url}`).join('\n');
                                    await new Promise(resolve => setTimeout(resolve, 1500));
                                    await sendDirectMessage(igUserId, senderId, textLinks, fanTokenData.accessToken);
                                }
                            }

                            await DmAutoReplyLog.create({
                                userId: igUserIdMapped,
                                senderId: senderId,
                                messageText: messageData.text,
                                replyText: fanDmReply.text,
                                replyType: 'product_recommendation',
                                assetsShared: fanDmReply.recommendedAssets || [],
                                status: 'sent',
                                scheduledAt: new Date(),
                                repliedAt: new Date()
                            });
                        }
                    } catch (matchErr) {
                        console.error('[Webhook] Fan product intent detection failed:', matchErr.message);
                    }
                }

                // Fallback: Generic fan reply (no specific product intent detected)
                if (!fanProductHandled) {
                    inboxTriageService.generateFanReply(
                        messageData.text,
                        priorityTag,
                        fanPersona,
                        fanHistory,
                        creatorAssets
                    ).then(async (fanReplyText) => {
                        if (!fanReplyText) return;
                        
                        console.log(`[Webhook] 🎯 Fan Generic Reply: "${fanReplyText}"`);
                        await sendDirectMessage(igUserId, senderId, fanReplyText, fanTokenData.accessToken);
                        
                        await DmAutoReplyLog.create({
                            userId: igUserIdMapped,
                            senderId: senderId,
                            messageText: messageData.text,
                            replyText: fanReplyText,
                            replyType: 'text',
                            status: 'sent',
                            scheduledAt: new Date(),
                            repliedAt: new Date()
                        });
                    }).catch(err => console.error('[Webhook] Fan Reply Error:', err.message));
                }
            }
        }
    }
}

module.exports = {
    processDirectMessage
};
