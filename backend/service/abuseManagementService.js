const { AbuseManagementSetting, Token, AutoReplyLog, DmAutoReplyLog } = require('../model/Instaautomation');
const aiService = require('./aiService');
const { emitToUser } = require('./socketService');

// A robust local keyword list to catch 90% of toxic/spam messages INSTANTLY
// This saves massive Gemini API costs because we ONLY trigger the AI if the message contains these words.
// If it contains a suspicious word, the AI does a final context check to avoid false positives.
const SUSPICIOUS_WORDS = [
    // Toxic / Abuse
    'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'slut', 'whore', 'dick', 'pussy', 'bastard', 'faggot', 'nigger', 'nigga', 'kill yourself', 'kys', 'die', 'retard', 'idiot', 'stupid', 'dumb', 'scam', 'fake', 'fraud', 'liar', 'scammer', 'ugly', 'fat',
    // Spam / Promo
    'follow me', 'check my bio', 'check my page', 'dm me', 'free followers', 'crypto', 'bitcoin', 'invest', 'forex', 'whatsapp', 'sugar daddy', 'sugar baby', 'cashapp', 'venmo', 'paypal', 'link in bio', 'subscribe'
];

/**
 * Fast, lightweight check if a text contains any suspicious keywords.
 */
function hasSuspiciousKeywords(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return SUSPICIOUS_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

/**
 * Process a comment for abuse/spam.
 * Returns true if the comment was intercepted and deleted/hidden (so the caller stops processing).
 */
async function processCommentAbuse(igUserId, commentData, helpers) {
    try {
        const { resolveUserIdMapping, deleteComment, hideComment } = helpers;
        
        // 1. Check if the creator enabled Abuse Management
        const mappedUserId = await resolveUserIdMapping(igUserId);
        const settings = await AbuseManagementSetting.findOne({ userId: mappedUserId });
        
        if (!settings || !settings.enabled || !settings.applyToComments) {
            return false; // Not enabled, let comment pass through
        }

        // 2. Local Pre-Filter to save Gemini API money
        if (!hasSuspiciousKeywords(commentData.text)) {
            return false; // Looks clean locally, skip AI check to save money
        }

        console.log(`[AbuseManagement] Suspicious keywords detected in comment by @${commentData.username}. Triggering Gemini analysis...`);

        // 3. AI Contextual Analysis
        const analysis = await aiService.analyzeComment(commentData.text, commentData.username);

        if (analysis.shouldHide) {
            const now = new Date();
            
            // Clean up recentAbuses array to keep only events in the last 24 hours
            settings.recentAbuses = (settings.recentAbuses || []).filter(
                t => (now - new Date(t)) < 24 * 60 * 60 * 1000
            );
            
            // Record this abuse event
            settings.recentAbuses.push(now);
            
            const isHighAbuse = settings.recentAbuses.length >= 3;
            let executedAction = settings.action;
            
            if (isHighAbuse) {
                // Escalate action to delete automatically when abuse is high
                executedAction = 'delete';
                console.log(`[AbuseManagement] High abuse detected (count: ${settings.recentAbuses.length}) for user ${mappedUserId}. Escalating action to delete.`);
                
                // Alert the creator in real-time via Socket
                try {
                    emitToUser(mappedUserId, 'abuse_alert', {
                        count: settings.recentAbuses.length,
                        message: `High volume of toxic comments detected on your account! AI has automatically escalated to deleting them to protect your page.`,
                        timestamp: now
                    });
                } catch (socketErr) {
                    console.error('[AbuseManagement] Socket alert failed:', socketErr.message);
                }
            }

            console.log(`[AbuseManagement] AI confirmed toxicity/spam. Action: ${executedAction}. Reason: ${analysis.reason}`);
            
            // Fetch access token for the user to make Instagram Graph API call
            const tokenData = await Token.findOne({ userId: mappedUserId }).lean();
            const accessToken = tokenData?.accessToken;
            
            let actionResult = { success: false };
            if (accessToken) {
                if (executedAction === 'delete') {
                    actionResult = await deleteComment(commentData.commentId, accessToken);
                } else if (executedAction === 'hide') {
                    actionResult = await hideComment(commentData.commentId, accessToken);
                }
            } else {
                console.error(`[AbuseManagement] Token not found for user: ${mappedUserId}. Cannot execute hide/delete on Instagram.`);
            }
            
            // Save settings (including updated recentAbuses array)
            await settings.save();
            
            // Log the intercepted event in AutoReplyLog
            await AutoReplyLog.create({
                userId: mappedUserId,
                commentId: commentData.commentId,
                commentText: commentData.text,
                commenterUsername: commentData.username,
                mediaId: commentData.mediaId,
                replyText: `[ABUSE INTERCEPTED: ${analysis.category.toUpperCase()}]${isHighAbuse ? ' (HIGH ABUSE DETECTED)' : ''}`,
                status: actionResult.success ? 'sent' : 'failed',
                action: executedAction === 'delete' ? 'deleted' : 'hidden',
                error: accessToken ? (actionResult.success ? null : 'API call failed') : 'No token found',
                scheduledAt: now,
                repliedAt: now
            });
            
            return true; // Abuse intercepted! Caller should STOP further processing (no C2D, no AutoReply)
        }

        return false; // AI said it's a false positive, let it pass
    } catch (error) {
        console.error('[AbuseManagement] Comment processing error:', error.message);
        return false; // Fail open
    }
}

/**
 * Process a DM for abuse/spam.
 * Returns true if the DM was intercepted (so the caller stops processing and does not reply).
 */
async function processDMAbuse(igUserId, messageData, helpers) {
    try {
        const { resolveUserIdMapping } = helpers;
        
        // 1. Check if the creator enabled Abuse Management
        const mappedUserId = await resolveUserIdMapping(igUserId);
        const settings = await AbuseManagementSetting.findOne({ userId: mappedUserId });
        
        if (!settings || !settings.enabled || !settings.applyToDMs) {
            return false;
        }

        // 2. Local Pre-Filter
        if (!hasSuspiciousKeywords(messageData.text)) {
            return false;
        }

        console.log(`[AbuseManagement] Suspicious keywords detected in DM from ${messageData.senderId}. Triggering Gemini analysis...`);

        // 3. AI Contextual Analysis
        // We reuse analyzeComment because it classifies text identically
        const analysis = await aiService.analyzeComment(messageData.text, 'dm_user');

        if (analysis.shouldHide) {
            const now = new Date();
            
            // Clean up recentAbuses array to keep only events in the last 24 hours
            settings.recentAbuses = (settings.recentAbuses || []).filter(
                t => (now - new Date(t)) < 24 * 60 * 60 * 1000
            );
            
            // Record this abuse event
            settings.recentAbuses.push(now);
            
            const isHighAbuse = settings.recentAbuses.length >= 3;
            
            if (isHighAbuse) {
                console.log(`[AbuseManagement] High abuse detected in DMs (count: ${settings.recentAbuses.length}) for user ${mappedUserId}.`);
                
                // Alert the creator in real-time via Socket
                try {
                    emitToUser(mappedUserId, 'abuse_alert', {
                        count: settings.recentAbuses.length,
                        message: `High volume of toxic messages/DMs detected on your account! AI has silenced further automated replies.`,
                        timestamp: now
                    });
                } catch (socketErr) {
                    console.error('[AbuseManagement] Socket alert failed:', socketErr.message);
                }
            }

            console.log(`[AbuseManagement] AI confirmed toxic DM. Reason: ${analysis.reason}. Stopping conversation entirely.`);
            
            // Save settings (including updated recentAbuses array)
            await settings.save();
            
            // Log the intercepted DM event in DmAutoReplyLog
            await DmAutoReplyLog.create({
                userId: mappedUserId,
                senderId: messageData.senderId,
                messageText: messageData.text,
                replyText: `[ABUSE INTERCEPTED: ${analysis.category.toUpperCase()}]${isHighAbuse ? ' (HIGH ABUSE DETECTED)' : ''}`,
                replyType: 'text',
                status: 'sent',
                scheduledAt: now,
                repliedAt: now
            });
            
            return true; // Halt downstream automation
        }

        return false;
    } catch (error) {
        console.error('[AbuseManagement] DM processing error:', error.message);
        return false;
    }
}

module.exports = {
    processCommentAbuse,
    processDMAbuse
};
