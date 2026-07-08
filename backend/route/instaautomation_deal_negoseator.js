/**
 * ============================================================================
 * DEAL NEGOTIATOR MODULE
 * ============================================================================
 * This file handles the "AI Deal Negotiator" logic for SotixAI.
 * It is responsible for autonomously negotiating brand deals, analyzing
 * creator personas, determining suggested rates, and either sending automated 
 * replies or drafting responses for manual approval based on user settings.
 * 
 * Separating this from the main DM automation file ensures the 'Fan Engagement' 
 * (product sales) and 'Brand Deal' logic do not overlap, keeping the codebase 
 * modular, maintainable, and bug-free.
 * ============================================================================
 */

const axios = require('axios');
const {
    Conversation,
    DmAutoReplySetting,
    Token,
    BrainAnalytics
} = require('../model/Instaautomation');
const CreatorPersona = require('../model/CreatorPersona');
const inboxTriageService = require('../service/inboxTriageService');

// Config mapping for Instagram API
const INSTAGRAM_CONFIG = {
    graphBaseUrl: process.env.INSTAGRAM_GRAPH_API_BASE_URL || 'https://graph.instagram.com'
};

/**
 * Process a brand deal negotiation message.
 * @param {string} conversationId - The unique ID for this conversation
 * @param {object} messageData - The message payload received
 * @param {string} igUserIdMapped - The mapped internal user ID
 * @param {string} senderId - The ID of the person sending the message
 * @param {string} igUserId - The raw Instagram user ID for API calls
 * @param {function} sendDirectMessage - Helper function to dispatch DMs
 */
async function processDealNegotiation(conversationId, messageData, igUserIdMapped, senderId, igUserId, sendDirectMessage) {
    console.log('[Webhook] 🤖 Entering Autonomous AI Deal Negotiation Flow...');
    
    try {
        const [creatorPersona, dmSettings, brandTokenData] = await Promise.all([
            CreatorPersona.findOne({ userId: igUserIdMapped }).lean(),
            DmAutoReplySetting.findOne({ userId: igUserIdMapped }).lean(),
            Token.findOne({ userId: igUserIdMapped }).lean()
        ]);

        if (!brandTokenData || !brandTokenData.accessToken) {
            console.log('[Webhook] 🤖 Skipping negotiation — no access token found.');
            return;
        }

        let realFollowers = '100,000';
        let realEngagement = '5%';
        try {
            const profileRes = await axios.get(`${INSTAGRAM_CONFIG.graphBaseUrl}/me`, {
                params: { fields: 'followers_count,media_count', access_token: brandTokenData.accessToken }
            });
            if (profileRes.data?.followers_count) {
                realFollowers = profileRes.data.followers_count.toLocaleString();
            }
        } catch (profileErr) {
            // Ignore failure and use fallback defaults
        }

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
        } catch (brainErr) {
            // Ignore failure
        }

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

    } catch (error) {
        console.error('[Webhook] Error processing Deal Negotiation:', error.message);
    }
}

module.exports = {
    processDealNegotiation
};
