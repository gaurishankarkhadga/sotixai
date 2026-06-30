import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import '../styles/EarlyAccess.css'; // Isolated scoped CSS for this page only

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const EarlyAccess = () => {
    const [formData, setFormData] = useState({ name: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/earlyaccess/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSuccess(true);
                setFormData({ name: '', email: '' });
            } else {
                setError(data.error || 'Failed to join early access. Please try again.');
            }
        } catch (err) {
            setError('Network error. Please ensure you are connected to the internet.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ea-wrapper">
            <div className="ea-container">
                
                {/* Left Side: Banner / Image */}
                <div className="ea-banner">
                    <div className="ea-banner-content">
                        <img 
                            src="/assets/logo-icon-transparent.png" 
                            alt="Sotix Logo" 
                            className="ea-banner-logo"
                        />
                        <h1 className="ea-banner-title">Join the Waitlist</h1>
                        <p className="ea-banner-subtitle">
                            Be the first to experience the most powerful, AI-driven social automation platform. 
                            Built for creators who value engagement and scale.
                        </p>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="ea-form-section">
                    {success ? (
                        <div className="ea-success">
                            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                            <div>
                                <h3>You're on the list!</h3>
                                <p>We'll notify you via email as soon as a spot opens up. Thank you for your interest!</p>
                            </div>
                            <button 
                                onClick={() => window.location.href = '/'}
                                className="ea-back-btn"
                            >
                                Return Home
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="ea-form-header">
                                <h2>Request Access</h2>
                                <p>Enter your details below to secure your spot.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="ea-form">
                                {error && (
                                    <div className="ea-message ea-error">
                                        {error}
                                    </div>
                                )}
                                
                                <div className="ea-input-group">
                                    <label htmlFor="name" className="ea-label">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="John Doe"
                                        className="ea-input"
                                    />
                                </div>

                                <div className="ea-input-group">
                                    <label htmlFor="email" className="ea-label">Email Address</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="john@example.com"
                                        className="ea-input"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="ea-submit-btn"
                                >
                                    <span className="ea-btn-content">
                                        {loading ? 'Securing Spot...' : 'Join Waitlist'}
                                        {!loading && <ArrowRight size={18} />}
                                    </span>
                                </button>
                            </form>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default EarlyAccess;
