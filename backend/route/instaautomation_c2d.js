const {
    Token,
    AutoReplyLog,
    DmAutoReplyLog,
    CommentToDmSetting
} = require('../model/Instaautomation');
const CreatorAsset = require('../model/CreatorAsset');
const aiService = require('../service/aiService');

/**
 * Handles the Comment-to-DM (C2D) automation flow.
 * Extracted into a separate file to isolate the implementation.
 * 
 * @param {string} igUserId - The Instagram User ID of the page
 * @param {Object} commentData - The parsed comment webhook payload
 * @param {Object} helpers - Injected helper functions from the main router
 * @returns {Promise<boolean>} - True if C2D handled the comment, false otherwise
 */
async function processCommentToDm(igUserId, commentData, helpers) {
    let commentToDmHandled = false;
    const {
        resolveUserIdMapping,
        deleteComment,
        hideComment,
        replyToComment,
        sendPrivateReply,
        sendGenericTemplate
    } = helpers;

    try {
        const igUserIdMapped = await resolveUserIdMapping(igUserId);
        const c2dSettings = await CommentToDmSetting.findOne({ userId: igUserIdMapped });

        if (c2dSettings && c2dSettings.enabled && commentData.senderId) {
            // ── CHECK 1: Time/Count/Media limits ──
            if (c2dSettings.expiresAt && new Date() > new Date(c2dSettings.expiresAt)) {
                console.log(`[Comment-to-DM] ⏰ Time limit expired. Auto-disabling.`);
                await CommentToDmSetting.findOneAndUpdate({ userId: igUserIdMapped }, { enabled: false });
            } else if (c2dSettings.maxComments > 0 && c2dSettings.processedCount >= c2dSettings.maxComments) {
                console.log(`[Comment-to-DM] 🔢 Comment limit reached. Auto-disabling.`);
                await CommentToDmSetting.findOneAndUpdate({ userId: igUserIdMapped }, { enabled: false });
            } else if (c2dSettings.targetMediaId && commentData.mediaId && String(c2dSettings.targetMediaId) !== String(commentData.mediaId)) {
                console.log(`[Comment-to-DM] 🎯 Media mismatch. Skipping.`);
            } else {
                // ── KEYWORD CHECK ──
                const keyword = (c2dSettings.keyword || '').trim().toLowerCase();
                const commentTextLower = (commentData.text || '').toLowerCase();
                const shouldTrigger = !keyword || commentTextLower.includes(keyword);

                if (shouldTrigger) {
                    console.log(`[Comment-to-DM] ✅ Triggered! Comment: "${commentData.text}"`);

                    const tokenData = await Token.findOne({ userId: igUserIdMapped });
                    if (!tokenData) {
                        console.error('[Comment-to-DM] No token found');
                        commentToDmHandled = true;
                    } else {
                        // ==================== RISK MANAGEMENT (C2D) ====================
                        try {
                            const analysis = await aiService.analyzeComment(commentData.text, commentData.username);
                            if (analysis.shouldHide) {
                                console.log(`[Comment-to-DM] Abuse detected (${analysis.category}). Removing...`);
                                let removeResult = await deleteComment(commentData.commentId, tokenData.accessToken);
                                if (!removeResult.success) removeResult = await hideComment(commentData.commentId, tokenData.accessToken);

                                await AutoReplyLog.create({
                                    userId: igUserIdMapped,
                                    commentId: commentData.commentId,
                                    commentText: commentData.text,
                                    commenterUsername: commentData.username,
                                    mediaId: commentData.mediaId,
                                    replyText: `[REMOVED (C2D): ${analysis.category}]`,
                                    status: removeResult.success ? 'sent' : 'failed',
                                    action: 'hidden',
                                    error: removeResult.error || null,
                                    scheduledAt: new Date(),
                                    repliedAt: new Date()
                                });
                                commentToDmHandled = true;
                            } else {
                                // Comment is clean - proceed with C2D
                                commentToDmHandled = true;
                                await CommentToDmSetting.findOneAndUpdate({ userId: igUserIdMapped }, { $inc: { processedCount: 1 } });

                                // ── STEP 1: Reply on the comment (Dynamic AI) ──
                                const commentDelay = Math.floor(Math.random() * (8 - 3 + 1)) + 3;
                                setTimeout(async () => {
                                    try {
                                        const currentC2d = await CommentToDmSetting.findOne({ userId: igUserIdMapped });
                                        if (currentC2d && currentC2d.enabled) {
                                            // Use AI to generate a creative "check your DM" reply (Dynamic, No Emojis, Creator-based)
                                            let smartReply;
                                            try {
                                                smartReply = await aiService.generateDynamicC2DReply(igUserIdMapped, commentData.text, commentData.username, c2dSettings.commentReply);
                                            } catch (aiErr) {
                                                console.error('[C2D] AI Comment Reply failed, using fallback:', aiErr.message);
                                                let fallback = c2dSettings.commentReply || 'sent it to your dms';
                                                // Strip emojis from fallback too
                                                smartReply = fallback.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                                            }

                                            const result = await replyToComment(commentData.commentId, smartReply, tokenData.accessToken);
                                            await AutoReplyLog.create({
                                                userId: igUserIdMapped,
                                                commentId: commentData.commentId,
                                                commentText: commentData.text,
                                                commenterUsername: commentData.username,
                                                mediaId: commentData.mediaId,
                                                replyText: smartReply,
                                                status: result.success ? 'sent' : 'failed',
                                                action: 'comment_to_dm_reply',
                                                scheduledAt: new Date(),
                                                repliedAt: new Date()
                                            });
                                        }
                                    } catch (e) { console.error('[C2D] Reply error:', e.message); }
                                }, commentDelay * 1000);

                                // ── STEP 2: Send DM (Dynamic AI with Asset Context) ──
                                const dmDelay = commentDelay + Math.floor(Math.random() * (5 - 2 + 1)) + 2;
                                setTimeout(async () => {
                                    try {
                                        const currentC2d = await CommentToDmSetting.findOne({ userId: igUserIdMapped });
                                        if (currentC2d && currentC2d.enabled) {
                                            const creatorAssets = await CreatorAsset.find({ userId: igUserIdMapped }).lean();
                                            let customInstructions = [];
                                            if (currentC2d.dmMessage) customInstructions.push(`CREATOR MESSAGE: "${currentC2d.dmMessage}"`);

                                            try {
                                                let assetsToShare = [];
                                                let isUnavailableRequest = false;
                                                let isGenericMessage = true;

                                                if (currentC2d.verifiedAssetId) {
                                                    const verifiedAsset = creatorAssets.find(a => a._id.toString() === currentC2d.verifiedAssetId);
                                                    if (verifiedAsset) {
                                                        const matchResult = await aiService.matchCreatorAssets(commentData.text, creatorAssets);
                                                        
                                                        // Check if commenter matched this specific verified asset
                                                        const matchedActive = matchResult.matchedAssets.some(a => a._id.toString() === currentC2d.verifiedAssetId);
                                                        const matchedInactive = matchResult.unavailableAssets.some(a => a._id.toString() === currentC2d.verifiedAssetId);
                                                        const hasKeyword = currentC2d.keyword && currentC2d.keyword.trim().length > 0;
                                                        const matchedKeyword = !hasKeyword || commentData.text.toLowerCase().includes(currentC2d.keyword.toLowerCase());

                                                        if (matchedActive || matchedInactive || matchedKeyword) {
                                                            isGenericMessage = false;
                                                            if (verifiedAsset.isActive !== false) {
                                                                assetsToShare = [verifiedAsset];
                                                                isUnavailableRequest = false;
                                                            } else {
                                                                assetsToShare = [];
                                                                isUnavailableRequest = true;
                                                                console.log(`[C2D-Webhook] Verified asset "${verifiedAsset.title}" is INACTIVE. Turning on unavailable flow.`);
                                                            }
                                                        } else {
                                                            isGenericMessage = true;
                                                            isUnavailableRequest = false;
                                                        }
                                                    }
                                                } else {
                                                    console.log('[C2D-Webhook] No verified asset linked to this automation. Text reply only.');
                                                    isGenericMessage = true;
                                                    isUnavailableRequest = false;
                                                }

                                                if (currentC2d.useAssets !== false && assetsToShare.length > 0) {
                                                    // ==================== NATIVE RICH CARDS (Latest API) ====================
                                                    console.log('[C2D] Sending native rich cards (Generic Template) as Private Reply.');
                                                    
                                                    // Add link integration so image automatically shows (Creator verified message + link)
                                                    const assetLink = assetsToShare[0]?.url ? (assetsToShare[0].url.startsWith('http') ? assetsToShare[0].url : `https://${assetsToShare[0].url}`) : '';
                                                    const textWithLink = currentC2d.dmMessage ? `${currentC2d.dmMessage}\n\n🔗 ${assetLink}` : `🔗 ${assetLink}`;
                                                    if (assetLink) {
                                                        await sendPrivateReply(igUserId, commentData.commentId, textWithLink, tokenData.accessToken);
                                                    }
                                                    
                                                    // Keep previous checkout layout exactly as requested
                                                    const result = await sendGenericTemplate(igUserId, { comment_id: commentData.commentId }, assetsToShare, tokenData.accessToken);

                                                    await DmAutoReplyLog.create({
                                                        userId: igUserIdMapped,
                                                        senderId: commentData.senderId,
                                                        messageText: `[C2D] ${commentData.text}`,
                                                        replyText: `[Rich Cards Sent: ${assetsToShare.map(a => a.title).join(', ')}]`,
                                                        replyType: 'product_recommendation',
                                                        status: result.success ? 'sent' : 'failed',
                                                        scheduledAt: new Date(),
                                                        repliedAt: new Date()
                                                    });
                                                } else {
                                                    // ==================== AI TEXT ONLY ====================
                                                    const dmReply = await aiService.generateSmartDMReply(
                                                        igUserIdMapped,
                                                        commentData.text,
                                                        commentData.username,
                                                        assetsToShare,
                                                        isGenericMessage,
                                                        customInstructions,
                                                        isUnavailableRequest
                                                    );
                                                    const textReply = dmReply.text;

                                                    if (textReply) {
                                                        const result = await sendPrivateReply(igUserId, commentData.commentId, textReply, tokenData.accessToken);

                                                        await DmAutoReplyLog.create({
                                                            userId: igUserIdMapped,
                                                            senderId: commentData.senderId,
                                                            messageText: `[C2D] ${commentData.text}`,
                                                            replyText: textReply,
                                                            replyType: 'text',
                                                            status: result.success ? 'sent' : 'failed',
                                                            scheduledAt: new Date(),
                                                            repliedAt: new Date()
                                                        });
                                                    }
                                                }
                                            } catch (aiErr) {
                                                console.error('[C2D] AI DM Reply failed:', aiErr.message);
                                                if (currentC2d.dmMessage) {
                                                    const result = await sendPrivateReply(igUserId, commentData.commentId, currentC2d.dmMessage, tokenData.accessToken);
                                                    await DmAutoReplyLog.create({
                                                        userId: igUserIdMapped,
                                                        senderId: commentData.senderId,
                                                        messageText: `[C2D] ${commentData.text}`,
                                                        replyText: currentC2d.dmMessage,
                                                        replyType: 'text',
                                                        status: result.success ? 'sent' : 'failed',
                                                        scheduledAt: new Date(),
                                                        repliedAt: new Date()
                                                    });
                                                }
                                            }
                                        }
                                    } catch (e) { console.error('[C2D] DM error:', e.message); }
                                }, dmDelay * 1000);
                            }
                        } catch (aiErr) {
                            console.error('[C2D] AI error:', aiErr.message);
                            commentToDmHandled = true; // Still mark as handled to avoid double triggers
                        }
                    }
                } else {
                    console.log(`[Comment-to-DM] Skipped — keyword match failed.`);
                }
            }
        }
    } catch (c2dErr) {
        console.error('[Comment-to-DM] Critical Error:', c2dErr.message);
    }

    return commentToDmHandled;
}

module.exports = {
    processCommentToDm
};
