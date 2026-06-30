import React, { useState } from 'react';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import '../Base.css';
import '../styles/Connect.css'; // Re-use ambient background styles

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
        <div className="base-theme min-h-screen flex items-center justify-center p-4 overflow-hidden relative">
            {/* Ambient Background from Connect page for consistency */}
            <div className="bg-elements">
                <div className="bg-grid"></div>
                <div className="bg-orb orb-1"></div>
                <div className="bg-orb orb-2"></div>
            </div>

            <div className="glass-panel max-w-md w-full relative z-10 p-8 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md bg-black/40">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 mb-4">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Early Access</h1>
                    <p className="text-white/60 text-sm">
                        Join the waitlist to be among the first to experience the next generation of social automation.
                    </p>
                </div>

                {success ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center reveal-fade-in">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                        <h3 className="text-emerald-400 font-semibold mb-2">You're on the list!</h3>
                        <p className="text-emerald-400/80 text-sm">
                            We'll notify you via email as soon as a spot opens up. Thank you for your interest!
                        </p>
                        <button 
                            onClick={() => window.location.href = '/'}
                            className="mt-6 w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-colors text-sm"
                        >
                            Return Home
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">
                                {error}
                            </div>
                        )}
                        
                        <div className="space-y-1">
                            <label htmlFor="name" className="text-xs font-medium text-white/70 ml-1">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="John Doe"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="email" className="text-xs font-medium text-white/70 ml-1">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="john@example.com"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group overflow-hidden bg-white text-black font-semibold py-3 px-4 rounded-xl mt-4 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            <span className="relative z-10 flex items-center gap-2 text-sm">
                                {loading ? 'Securing Spot...' : 'Join Waitlist'}
                                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                            </span>
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite] z-0" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EarlyAccess;
