const { AbuseManagementSetting } = require('../../model/Instaautomation');

module.exports = {
    name: 'AbuseManagementHandler',
    intents: ['enable_abuse_management', 'disable_abuse_management'],

    async execute(intent, params, context) {
        const { userId } = context;

        try {
            if (intent === 'enable_abuse_management') {
                const setting = await AbuseManagementSetting.findOneAndUpdate(
                    { userId },
                    { 
                        userId, 
                        enabled: true,
                        action: 'delete' // Hardcoded to delete based on user preference
                    },
                    { upsert: true, new: true }
                );

                return {
                    success: true,
                    message: "Abuse Management is now ON. I will actively delete toxic comments and block abusive DMs.",
                    data: setting
                };
            }

            if (intent === 'disable_abuse_management') {
                const setting = await AbuseManagementSetting.findOneAndUpdate(
                    { userId },
                    { userId, enabled: false },
                    { upsert: true, new: true }
                );

                return {
                    success: true,
                    message: "Abuse Management is now OFF. I've stopped monitoring for toxicity.",
                    data: setting
                };
            }
        } catch (error) {
            console.error(`[AbuseManagementHandler] Error:`, error.message);
            return {
                success: false,
                message: "Failed to update Abuse Management settings.",
                data: null
            };
        }
    }
};
