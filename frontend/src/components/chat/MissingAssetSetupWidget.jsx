import React, { useState, useId } from 'react';
import { CheckCircle2, Loader, Upload, X } from 'lucide-react';
import '../../styles/Assets.css'; // Reuse asset styles for inputs

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const MissingAssetSetupWidget = ({ action, messageId, onComplete }) => {
    const uploadId = useId();
    const { data } = action;
    const suggestedTitle = data?.suggestedTitle || '';
    const [userId] = useState(localStorage.getItem('insta_user_id') || localStorage.getItem('yt_channel_id'));
    
    const [formData, setFormData] = useState({
        title: suggestedTitle,
        type: 'link',
        description: '',
        url: '',
        price: '',
        affiliateCode: '',
        imageUrl: ''
    });
    
    const [imageUploading, setImageUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImageUploading(true);
        const data = new FormData();
        data.append('productImage', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/biolinks/product-image`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: data
            });
            const result = await res.json();
            if (result.success) {
                setFormData(p => ({ ...p, imageUrl: result.imageUrl }));
            }
        } catch (err) {
            console.error('[MissingAsset] Upload error:', err);
        } finally {
            setImageUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.title.trim() || !formData.url.trim()) {
            setErrorMsg("Title and URL are required.");
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            // Instagram token is typically in ig_token for these operations
            const token = localStorage.getItem('token');
            const igToken = localStorage.getItem('ig_token') || token;
            
            // Note: We use a new endpoint /api/chat/resolve-setup-asset
            // which creates the asset AND resumes the setup automation.
            const res = await fetch(`${API_BASE_URL}/api/chat/resolve-setup-asset`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    userId,
                    token: igToken,
                    messageId: messageId,
                    originalParams: data?.originalParams,
                    assetData: formData
                })
            });
            
            const result = await res.json();
            
            if (result.success) {
                setSuccess(true);
                if (onComplete) onComplete(result.message);
            } else {
                setErrorMsg(result.message || 'Failed to resolve setup.');
            }
        } catch (err) {
            setErrorMsg('Network error occurred.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success || data?.resolved) {
        return (
            <div className="action-status-card status-success anim-slide-in">
                <div className="action-status-icon-wrapper">
                    <CheckCircle2 size={18} className="action-status-icon" />
                </div>
                <div className="action-status-content">
                    <h4 className="action-status-title">Asset Saved & Setup Complete</h4>
                    <p className="action-status-message">Your automation is now live.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="asset-add-form" style={{ marginTop: '10px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#fff' }}>Add Missing Asset</h4>
            
            {errorMsg && <div style={{ color: '#ff4d4f', fontSize: '12px', marginBottom: '10px' }}>{errorMsg}</div>}
            
            <select 
                value={formData.type} 
                onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                className="asset-input"
                style={{ marginBottom: '10px', width: '100%' }}
            >
                <option value="link">Link</option>
                <option value="product">Product</option>
                <option value="course">Course</option>
                <option value="affiliate_link">Affiliate</option>
            </select>

            <input
                type="text"
                placeholder="Title *"
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                className="asset-input"
            />
            <input
                type="text"
                placeholder="Description"
                value={formData.description || ''}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                className="asset-input"
            />

            <input
                type="url"
                placeholder="URL Link *"
                value={formData.url}
                onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                className="asset-input"
            />

            {['product', 'course', 'affiliate_link'].includes(formData.type) && (
                <div className="asset-image-upload">
                    <input
                        type="file"
                        accept="image/*"
                        id={`asset-img-upload-${uploadId}`}
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor={`asset-img-upload-${uploadId}`} className="asset-upload-label">
                        {imageUploading ? 'Uploading...' : formData.imageUrl ? 'Change Image' : 'Upload Cover Image'}
                    </label>
                    {formData.imageUrl && (
                        <div className="asset-image-preview">
                            <img src={formData.imageUrl.startsWith('http') ? formData.imageUrl : `${API_BASE_URL}${formData.imageUrl}`} alt="Preview" />
                            <button type="button" className="remove-image-btn" onClick={() => setFormData(p => ({ ...p, imageUrl: '' }))}><X size={12} /></button>
                        </div>
                    )}
                </div>
            )}

            {['product', 'course', 'affiliate_link'].includes(formData.type) && (
                <input
                    type="text"
                    placeholder={formData.type === 'affiliate_link' ? 'Commission / Price' : 'Price'}
                    value={formData.price || ''}
                    onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                    className="asset-input"
                />
            )}

            {formData.type === 'affiliate_link' && (
                <input
                    type="text"
                    placeholder="Affiliate Code / Tracking ID"
                    value={formData.affiliateCode || ''}
                    onChange={e => setFormData(p => ({ ...p, affiliateCode: e.target.value }))}
                    className="asset-input"
                />
            )}

            <button 
                className="asset-save-btn" 
                onClick={handleSubmit} 
                disabled={isSubmitting || !formData.title.trim() || !formData.url.trim()}
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
                {isSubmitting ? <Loader size={14} className="spin" /> : '+ Add'}
            </button>
        </div>
    );
};

export default MissingAssetSetupWidget;
