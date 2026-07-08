import React from 'react';
import MissingAssetSetupWidget from './MissingAssetSetupWidget';
import '../../styles/ActionStatusWidget.css';

const ActionStatusWidget = ({ actions, messageId }) => {
    // Filter out actions that already have their own dedicated preview widgets 
    // to prevent double-rendering data (like Clarification, BioLink preview, Viral Carousel).
    const excludedIntents = [
        'request_clarification', 
        'create_biolink', 
        'generate_viral_script',
        'enable_comment_autoreply', 
        'enable_dm_autoreply', 
        'enable_all_automation', 
        'disable_comment_autoreply', 
        'disable_dm_autoreply', 
        'disable_all_automation', 
        'set_content_target', 
        'set_time_limit', 
        'set_comment_limit', 
        'find_brand_deals', 
        'list_brand_deals', 
        'enable_comment_to_dm', 
        'enable_gamify_funnel'
    ];

    const filteredActions = actions.filter(action => !excludedIntents.includes(action.intent));

    if (filteredActions.length === 0) return null;

    // Strip emojis from text
    const cleanText = (text) => {
        if (!text) return '';
        // Remove emoji characters
        return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    };

    return (
        <div className="action-status-container">
            {filteredActions.map((action, idx) => {
                if (action.intent === 'request_missing_asset') {
                    return (
                        <div key={idx} className="anim-slide-in" style={{ animationDelay: `${idx * 0.1}s`, width: '100%' }}>
                            <MissingAssetSetupWidget action={action} messageId={messageId} />
                        </div>
                    );
                }

                const isSuccess = action.success;
                const statusClass = isSuccess ? 'status-success' : 'status-error';
                
                // Keep only what happened in one short line
                let shortMessage = action.message || (isSuccess ? "Action completed successfully." : "Action failed.");
                shortMessage = cleanText(shortMessage);

                return (
                    <div 
                        key={idx} 
                        className={`action-status-card ${statusClass} anim-slide-in`}
                        style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                        <div className="action-status-content">
                            <span className="action-status-title" style={{ fontSize: '0.9rem', textTransform: 'none', letterSpacing: 'normal' }}>
                                {shortMessage}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ActionStatusWidget;
