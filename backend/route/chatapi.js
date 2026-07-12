const express = require('express');
const router = express.Router();
const chatService = require('../service/chatService');

// ==================== CHAT API ROUTES ====================

// POST /api/chat/message — Process a chat message
router.post('/message', async (req, res) => {
    try {
        const { userId, message, token } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                success: false,
                error: 'userId and message are required'
            });
        }

        if (message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message cannot be empty'
            });
        }

        console.log(`[ChatAPI] Message from ${userId}: "${message}"`);

        const result = await chatService.processMessage(userId, message.trim(), token);

        res.json(result);
    } catch (error) {
        console.error('[ChatAPI] Error processing message:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to process message',
            message: error.message,
            response: 'Sorry, something went wrong. Please try again!',
            toasts: [{
                type: 'error',
                title: 'Error',
                message: 'Failed to process your message. Please try again.'
            }],
            actions: []
        });
    }
});

// GET /api/chat/history/:userId — Get chat history
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        const result = await chatService.getChatHistory(userId, limit);

        res.json(result);
    } catch (error) {
        console.error('[ChatAPI] Error fetching history:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chat history',
            message: error.message
        });
    }
});

// DELETE /api/chat/history/:userId — Clear chat history
router.delete('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId is required' });
        }
        const result = await chatService.clearChatHistory(userId);
        res.json(result);
    } catch (error) {
        console.error('[ChatAPI] Error clearing history:', error.message);
        res.status(500).json({ success: false, error: 'Failed to clear chat history' });
    }
});

// DELETE /api/chat/message/:messageId — Delete a specific message
router.delete('/message/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId } = req.body;
        if (!userId || !messageId) {
            return res.status(400).json({ success: false, error: 'userId and messageId are required' });
        }
        const result = await chatService.deleteMessage(userId, messageId);
        res.json(result);
    } catch (error) {
        console.error('[ChatAPI] Error deleting message:', error.message);
        res.status(500).json({ success: false, error: 'Failed to delete message' });
    }
});

// GET /api/chat/active-count/:userId — Get count of active automations (for sidebar badge)
router.get('/active-count/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const AutoReplySetting = require('../model/Instaautomation').AutoReplySetting;
        const DmAutoReplySetting = require('../model/Instaautomation').DmAutoReplySetting;
        const CommentToDmSetting = require('../model/Instaautomation').CommentToDmSetting;

        const [commentSettings, dmSettings, c2dSettings] = await Promise.all([
            AutoReplySetting.findOne({ userId }).lean(),
            DmAutoReplySetting.findOne({ userId }).lean(),
            CommentToDmSetting.findOne({ userId }).lean()
        ]);

        let activeCount = 0;
        const activeList = [];

        if (commentSettings?.enabled) {
            activeCount++;
            activeList.push('Comments');
        }
        if (dmSettings?.enabled) {
            activeCount++;
            activeList.push('DMs');
        }
        if (dmSettings?.inboxTriageEnabled) {
            activeCount++;
            activeList.push('Brand Negotiator');
        }
        if (dmSettings?.autonomousMode) {
            activeCount++;
            activeList.push('Autonomous AI');
        }
        if (c2dSettings?.enabled) {
            activeCount++;
            activeList.push('C2D');
        }

        res.json({ success: true, activeCount, activeList });
    } catch (error) {
        res.json({ success: true, activeCount: 0, activeList: [] });
    }
});


// GET /api/chat/quota — Get Gemini API usage
router.get('/quota', async (req, res) => {
    try {
        const { getGeminiUsage } = require('../service/quotaService');
        const { getAvailableKeysCount } = require('../service/geminiClient');
        const used = await getGeminiUsage();
        const limit = 1500 * getAvailableKeysCount(); // 1500 requests per key per day
        res.json({ success: true, used, limit, remaining: Math.max(0, limit - used) });
    } catch (error) {
        res.json({ success: true, used: 0, limit: 1500, remaining: 1500 });
    }
});

// GET /api/chat/deals/:userId — Get grouped brand deals for the CRM
router.get('/deals/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const Conversation = require('../model/Instaautomation').Conversation;

        const deals = await Conversation.find({
            userId: userId,
            'negotiationData.status': { $exists: true, $ne: 'pending' }
        }).sort({ lastMessageTime: -1 }).lean();

        // Group by pipeline status for the CRM board
        const groupedDeals = {
            drafted: [],
            negotiating: [],
            contract_prep: [],
            won: [],
            lost: [],
            rejected: []
        };

        deals.forEach(deal => {
            const status = deal.negotiationData.status;
            if (groupedDeals[status]) {
                groupedDeals[status].push(deal);
            }
        });

        res.json({ success: true, allDeals: deals, groupedDeals });
    } catch (error) {
        console.error('[ChatAPI] Error fetching deals:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch deals' });
    }
});

// DELETE /api/chat/deals/:conversationId — Delete a specific deal
router.delete('/deals/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const Conversation = require('../model/Instaautomation').Conversation;

        // Either delete the entire conversation or just reset the negotiationData status
        // User said "delete button so I can manually delete or through ai in suppose I want to clean something from deal tab"
        // Let's remove the negotiationData status so it drops from the pipeline, but keeps the chat history if needed.
        // Wait, often they just want to delete the whole deal pipeline reference. We can just delete the document or reset `negotiationData.status`.
        // Deleting the document entirely is simplest and ensures it's clean.
        await Conversation.findByIdAndDelete(conversationId);

        res.json({ success: true });
    } catch (error) {
        console.error('[ChatAPI] Error deleting deal:', error.message);
        res.status(500).json({ success: false, error: 'Failed to delete deal' });
    }
});

// GET /api/chat/initial-prompts/:userId — Generate dynamic, AI-based initial suggestion prompts
router.get('/initial-prompts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId is required' });
        }
        const prompts = await chatService.generateDynamicPrompts(userId);
        res.json({ success: true, prompts });
    } catch (error) {
        console.error('[ChatAPI] Error generating prompts:', error.message);
        res.status(500).json({ success: false, error: 'Failed to generate prompts' });
    }
});

// POST /api/chat/resolve-setup-asset — Saves a missing asset and finishes the automation setup
router.post('/resolve-setup-asset', async (req, res) => {
    try {
        const { userId, originalParams, assetData, messageId } = req.body;
        if (!userId || !assetData) {
            return res.status(400).json({ success: false, message: 'Missing required data' });
        }

        // 1. Save the new CreatorAsset
        const CreatorAsset = require('../model/CreatorAsset');
        const newAsset = new CreatorAsset({
            userId,
            type: assetData.type || 'link',
            title: assetData.title,
            description: assetData.description || '',
            url: assetData.url,
            price: assetData.price || '',
            affiliateCode: assetData.affiliateCode || '',
            imageUrl: assetData.imageUrl || '',
            isActive: true
        });
        await newAsset.save();

        // 2. Mark the action as resolved in the chat history
        const ChatHistory = require('../model/ChatHistory');
        const history = await ChatHistory.findOne({ userId });
        if (history && history.messages) {
            if (messageId) {
                // Pinpoint the exact message if messageId is provided
                const exactMsg = history.messages.find(m => m._id && m._id.toString() === messageId);
                if (exactMsg && exactMsg.actions) {
                    const action = exactMsg.actions.find(a => a.intent === 'request_missing_asset' && !a.data?.resolved);
                    if (action) {
                        if (!action.data) action.data = {};
                        action.data.resolved = true;
                        history.markModified('messages');
                        await history.save();
                    }
                }
            } else {
                // Fallback: Find the most recent assistant message with the request_missing_asset action
                for (let i = history.messages.length - 1; i >= 0; i--) {
                    const msg = history.messages[i];
                    if (msg.role === 'assistant' && msg.actions) {
                        const action = msg.actions.find(a => a.intent === 'request_missing_asset' && !a.data?.resolved);
                        if (action) {
                            if (!action.data) action.data = {};
                            action.data.resolved = true;
                            history.markModified('messages');
                            await history.save();
                            break;
                        }
                    }
                }
            }
        }

        // 3. Re-run the commentToDm setup with the original params
        const handlerRegistry = require('../service/chatService');
        // We need to run the commentToDm handler directly, but since we are in chatapi we can require the handler
        const commentToDmHandler = require('../service/handlers/commentToDm.handler');
        
        // Pass originalParams. The handler will now find the asset we just created!
        const context = { userId, token: req.body.token };
        const params = originalParams || {};
        params.forceAssetId = newAsset._id.toString();
        
        const result = await commentToDmHandler.execute('enable_comment_to_dm', params, context);

        if (result.success && !result.intentOverride) {
            res.json({ success: true, message: 'Asset created and automation successfully enabled!' });
        } else {
            res.json({ success: false, message: 'Asset created, but there was an issue enabling automation.', details: result.message });
        }

    } catch (error) {
        console.error('[ChatAPI] Resolve Setup Asset Error:', error.message);
        res.status(500).json({ success: false, message: 'Server error while resolving setup.' });
    }
});

module.exports = router;
