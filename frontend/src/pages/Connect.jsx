import React, { useState, useEffect } from 'react';
import { Instagram, Youtube, ChevronRight, ShieldCheck, Zap, BarChart2, Lock, Cpu, Globe, HelpCircle, CheckCircle2, ArrowRight, Shield, Activity, Sparkles, ChevronDown, Terminal, Link, TrendingUp, MessageSquare, PlaySquare, DollarSign, ShieldAlert } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import '../styles/Connect.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function Connect() {
    const [loadingInsta, setLoadingInsta] = useState(false);
    const [loadingYT, setLoadingYT] = useState(false);
    const [error, setError] = useState('');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [faqOpenIndex, setFaqOpenIndex] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
    const [visibleElements, setVisibleElements] = useState({});
    const navigate = useNavigate();

    // DEV ONLY: Admin bypass — sets fake tokens so all UI pages are accessible
    const handleAdminAccess = () => {
        localStorage.setItem('insta_token', 'dev_admin_bypass_token');
        localStorage.setItem('insta_user_id', 'dev_admin_user');
        navigate('/chat');
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -20px 0px',
            threshold: 0.02,
        };

        const observer = new IntersectionObserver((entries) => {
            setVisibleElements((prev) => {
                const next = { ...prev };
                let changed = false;
                entries.forEach((entry) => {
                    const id = entry.target.id;
                    if (id && next[id] !== entry.isIntersecting) {
                        next[id] = entry.isIntersecting;
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, observerOptions);

        const scrollElements = document.querySelectorAll('.scroll-reveal');
        scrollElements.forEach((el) => observer.observe(el));

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            scrollElements.forEach((el) => observer.unobserve(el));
            observer.disconnect();
        };
    }, []);

    const handleConnectInstagram = async () => {
        try {
            setLoadingInsta(true);
            setError('');
            const token = localStorage.getItem('token') || '';
            const response = await fetch(`${API_BASE_URL}/api/instagram/auth?token=${token}`);
            const data = await response.json();
            if (data.success) {
                window.location.href = data.authUrl;
            } else {
                setError(data.error || 'Failed to get auth URL');
                setLoadingInsta(false);
            }
        } catch (err) {
            setError(`Connection error: ${err.message}`);
            setLoadingInsta(false);
        }
    };

    const handleConnectYouTube = async () => {
        try {
            setLoadingYT(true);
            setError('');
            const response = await fetch(`${API_BASE_URL}/api/youtube/auth`);
            const data = await response.json();
            if (data.success) {
                window.location.href = data.authUrl;
            } else {
                setError(data.error || 'Failed to get auth URL');
                setLoadingYT(false);
            }
        } catch (err) {
            setError(`Connection error: ${err.message}`);
            setLoadingYT(false);
        }
    };

    return (
        <div className="connect-layout-expansive">
            {/* Ambient Background */}
            <div 
                className="cursor-glow"
                style={{
                    transform: `translate(${mousePos.x - 400}px, ${mousePos.y - 400}px)`
                }}
            />
            
            <div className="bg-elements">
                <div className="bg-grid"></div>
                <div className="bg-orb orb-1"></div>
                <div className="bg-orb orb-2"></div>
                <div className="bg-orb orb-3"></div>
            </div>

            {/* Premium Navbar */}
            <nav className="premium-navbar">
                <div className="navbar-left">
                    <img src="/assets/logo-icon-transparent.png" alt="Sotix Logo" className="nav-logo" />
                    <span className="nav-brand">Sotix AI</span>
                </div>
                <div className="navbar-center hidden-mobile">
                    <a href="#features" className="nav-link">Platform</a>
                    <a href="#security" className="nav-link">Security</a>
                    <a href="#customers" className="nav-link">Enterprise</a>
                </div>
                <div className="navbar-right">
                    <button 
                        className="nav-btn-outline early-access-btn"
                        onClick={() => navigate('/early-access')}
                    >
                        <span>Early Access</span>
                        <div className="liquid-bg"></div>
                    </button>
                </div>
            </nav>

            {/* Main Split Content */}
            <main className="connect-main-split">
                
                {/* Left Side: Value Proposition */}
                <div className="connect-info-side">
                    {/* Header Text Group */}
                    <div className="connect-header-group">
                        <div className="info-badge reveal-fade-in reveal-stagger-1">
                            <Zap size={16} className="badge-icon" />
                            <span>Next-Gen Automation</span>
                        </div>
                        <h1 className="info-title reveal-fade-in reveal-stagger-2">
                            Scale Your Audience <span className="neon-text-gradient">on Autopilot.</span>
                        </h1>
                        <p className="info-description reveal-fade-in reveal-stagger-3">
                            The easiest way to automate your Instagram and YouTube. Connect your accounts to set up auto-replies, track analytics, and manage your messages automatically.
                        </p>
                    </div>

                    {/* Features List Group */}
                    <div className="connect-features-group">
                        <div className="feature-list">
                            <div className="feature-item reveal-fade-in reveal-stagger-4">
                                <div className="feature-icon-wrapper analytics-glow"><BarChart2 size={20} /></div>
                                <div className="feature-text">
                                    <h3>Comment Auto-Reply</h3>
                                    <p>Instantly reply to comments and send automated links to your viewers.</p>
                                </div>
                            </div>
                            <div className="feature-item reveal-fade-in reveal-stagger-5">
                                <div className="feature-icon-wrapper ai-glow"><Cpu size={20} /></div>
                                <div className="feature-text">
                                    <h3>DM Automation</h3>
                                    <p>Engage with your audience and handle leads directly in their direct messages.</p>
                                </div>
                            </div>
                            <div className="feature-item reveal-fade-in reveal-stagger-6">
                                <div className="feature-icon-wrapper security-glow"><Lock size={20} /></div>
                                <div className="feature-text">
                                    <h3>Growth Analytics</h3>
                                    <p>Track conversion rates, message counts, and overall channel growth.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Connection Card */}
                <div className="connect-card-side reveal-fade-in reveal-stagger-7">
                    <div className="connect-glass-panel-premium expansive-card">
                        <div className="panel-glow-border"></div>
                        <div className="panel-content">
                            <div className="connect-brand-premium">
                                <Globe size={40} className="global-icon" />
                                <h2 className="connect-title">Integrations</h2>
                                <p className="connect-subtitle-premium">
                                    Select a platform to authenticate securely.
                                </p>
                            </div>

                            {error && (
                                <div className="connect-error-premium">
                                    <ShieldCheck size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="connect-actions-premium">
                                <button
                                    className="btn-premium insta-premium"
                                    onClick={handleConnectInstagram}
                                    disabled={loadingInsta || loadingYT}
                                >
                                    <div className="btn-content">
                                        <Instagram size={24} className="btn-icon" />
                                        <span>{loadingInsta ? 'Connecting...' : 'Connect Instagram'}</span>
                                    </div>
                                    <ChevronRight size={20} className="btn-arrow" />
                                    <span className="premium-shine-sweep"></span>
                                </button>

                                <button
                                    className="btn-premium yt-premium"
                                    onClick={handleConnectYouTube}
                                    disabled={loadingInsta || loadingYT}
                                >
                                    <div className="btn-content">
                                        <Youtube size={24} className="btn-icon" />
                                        <span>{loadingYT ? 'Connecting...' : 'Connect YouTube'}</span>
                                    </div>
                                    <ChevronRight size={20} className="btn-arrow" />
                                    <span className="premium-shine-sweep"></span>
                                </button>


                            </div>
                            
                            <div className="security-note expansive-note">
                                <ShieldCheck size={16} />
                                <span>SOC2 Type II Compliant • 256-bit AES Encryption</span>
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* The Ultimate Feature Showcase (6 Pillars) */}
            <section className="feature-showcase-section">
                
                {/* Pillar 1: Instagram Automation */}
                <div id="showcase-1" className={`showcase-row scroll-reveal ${visibleElements['showcase-1'] ? 'in-view' : ''}`}>
                    <div className="showcase-text-container">
                        <div className="showcase-badge"><MessageSquare size={14} /> Instagram Automation</div>
                        <h2 className="showcase-title">Turn Comments into Cash. Instantly.</h2>
                        <p className="showcase-desc">Engage your audience at scale with intelligent Comment-to-DM triggers. Recognize purchase intent, filter out spam, and deliver product links automatically.</p>
                        <div className="showcase-list">
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>AI-Powered Keyword Recognition</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Instant Direct Message Delivery</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Official Meta Human Handover Protocol</p></div>
                        </div>
                    </div>
                    <div className="showcase-image-container">
                        <img src="/assets/mockups/insta_dm.png" alt="Instagram Automation Mockup" className="showcase-image" />
                    </div>
                </div>

                {/* Pillar 2: YouTube Automation */}
                <div id="showcase-2" className={`showcase-row reversed scroll-reveal ${visibleElements['showcase-2'] ? 'in-view' : ''}`}>
                    <div className="showcase-text-container">
                        <div className="showcase-badge red"><PlaySquare size={14} /> YouTube Automation</div>
                        <h2 className="showcase-title">Engage Your Subscribers on Autopilot.</h2>
                        <p className="showcase-desc">Don't let your community go unheard. Auto-reply to top comments, direct fans to your sponsors, and maintain high channel engagement natively.</p>
                        <div className="showcase-list">
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Native YouTube v3 API Integration</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Custom Comment Reply Rules</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Boost Algorithm Rankings via Engagement</p></div>
                        </div>
                    </div>
                    <div className="showcase-image-container">
                        <img src="/assets/mockups/youtube.png" alt="YouTube Automation Mockup" className="showcase-image" />
                    </div>
                </div>

                {/* Pillar 3: Viral Content Finder */}
                <div id="showcase-3" className={`showcase-row scroll-reveal ${visibleElements['showcase-3'] ? 'in-view' : ''}`}>
                    <div className="showcase-text-container">
                        <div className="showcase-badge"><TrendingUp size={14} /> Viral Finder</div>
                        <h2 className="showcase-title">Never Run Out of Content Ideas.</h2>
                        <p className="showcase-desc">Discover trending audio, viral video formats, and high-performing competitor posts in your niche before they peak. Ride the wave of virality.</p>
                        <div className="showcase-list">
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Real-time Trending Audio Tracking</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Competitor Engagement Analysis</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Niche-Specific Content Discovery</p></div>
                        </div>
                    </div>
                    <div className="showcase-image-container">
                        <img src="/assets/mockups/viral_finder.png" alt="Viral Finder Mockup" className="showcase-image" />
                    </div>
                </div>

                {/* Pillar 4: Bio-Links & Mini-Sites */}
                <div id="showcase-4" className={`showcase-row reversed scroll-reveal ${visibleElements['showcase-4'] ? 'in-view' : ''}`}>
                    <div className="showcase-text-container">
                        <div className="showcase-badge blue"><Link size={14} /> Bio-Links</div>
                        <h2 className="showcase-title">One Link to Rule Your Ecosystem.</h2>
                        <p className="showcase-desc">Create beautiful, high-converting Link-in-Bio pages. Capture leads, sell products, and perfectly route traffic from your social profiles.</p>
                        <div className="showcase-list">
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Fully Customizable Glassmorphism UI</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Integrated Lead Capture Forms</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Detailed Traffic Analytics</p></div>
                        </div>
                    </div>
                    <div className="showcase-image-container">
                        <img src="/assets/mockups/biolink.png" alt="Bio-Links Mockup" className="showcase-image" />
                    </div>
                </div>

                {/* Pillar 5: Affiliate Hub */}
                <div id="showcase-5" className={`showcase-row scroll-reveal ${visibleElements['showcase-5'] ? 'in-view' : ''}`}>
                    <div className="showcase-text-container">
                        <div className="showcase-badge"><DollarSign size={14} /> Affiliate Hub</div>
                        <h2 className="showcase-title">Monetize Your Influence Effortlessly.</h2>
                        <p className="showcase-desc">Manage all your partner links in one place. Track affiliate clicks, monitor revenue, and seamlessly integrate them into your DM automations.</p>
                        <div className="showcase-list">
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Centralized Link Management</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Advanced Click & Conversion Tracking</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Direct Automation Integration</p></div>
                        </div>
                    </div>
                    <div className="showcase-image-container">
                        <img src="/assets/mockups/affiliate.png" alt="Affiliate Hub Mockup" className="showcase-image" />
                    </div>
                </div>

                {/* Pillar 6: AI Abuse Moderation */}
                <div id="showcase-6" className={`showcase-row reversed scroll-reveal ${visibleElements['showcase-6'] ? 'in-view' : ''}`}>
                    <div className="showcase-text-container">
                        <div className="showcase-badge red"><ShieldAlert size={14} /> Abuse Moderation</div>
                        <h2 className="showcase-title">Protect Your Brand and Mental Health.</h2>
                        <p className="showcase-desc">A centralized AI Toxicity Shield that automatically detects, hides, or deletes hate speech, spam, and abusive trolls across your channels in real-time.</p>
                        <div className="showcase-list">
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Real-time Hate Speech Filtering</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Auto-Hide/Delete Action Workflows</p></div>
                            <div className="showcase-list-item"><CheckCircle2 size={18} className="showcase-list-icon" /><p>Comprehensive Audit Logging</p></div>
                        </div>
                    </div>
                    <div className="showcase-image-container">
                        <img src="/assets/mockups/shield.png" alt="Abuse Moderation Mockup" className="showcase-image" />
                    </div>
                </div>

            </section>

            {/* "How it Works" Pipeline Section */}
            <section className="pipeline-section">
                <div id="pipeline-header" className={`section-header-centered scroll-reveal ${visibleElements['pipeline-header'] ? 'in-view' : ''}`}>
                    <div className="section-badge">
                        <Activity size={14} />
                        <span>Pipeline</span>
                    </div>
                    <h2 className="section-title-premium">How it Works.</h2>
                    <p className="section-subtitle-premium">A seamless workflow from discovery to monetization.</p>
                </div>
                
                <div className="pipeline-container">
                    <div id="pipeline-step-1" className={`pipeline-step scroll-reveal stagger-1 ${visibleElements['pipeline-step-1'] ? 'in-view' : ''}`}>
                        <div className="pipeline-icon-wrapper"><Sparkles size={24} /></div>
                        <div className="pipeline-content">
                            <h3>1. Discover</h3>
                            <p>Find trending content, viral audio, and analyze competitor performance in your niche using the Viral Finder.</p>
                        </div>
                    </div>
                    
                    <div className="pipeline-divider"></div>
                    
                    <div id="pipeline-step-2" className={`pipeline-step scroll-reveal stagger-2 ${visibleElements['pipeline-step-2'] ? 'in-view' : ''}`}>
                        <div className="pipeline-icon-wrapper"><MessageSquare size={24} /></div>
                        <div className="pipeline-content">
                            <h3>2. Engage</h3>
                            <p>Automate your Instagram and YouTube responses. Deliver value instantly while the AI Abuse Shield keeps your community safe.</p>
                        </div>
                    </div>
                    
                    <div className="pipeline-divider"></div>
                    
                    <div id="pipeline-step-3" className={`pipeline-step scroll-reveal stagger-3 ${visibleElements['pipeline-step-3'] ? 'in-view' : ''}`}>
                        <div className="pipeline-icon-wrapper"><DollarSign size={24} /></div>
                        <div className="pipeline-content">
                            <h3>3. Monetize</h3>
                            <p>Drive engaged users to your Bio-Links and Affiliate Hub, turning followers into customers seamlessly.</p>
                        </div>
                    </div>
                </div>
            </section>

{/* Pricing Section Hidden for now */}

            {/* FAQ Section */}
            <section className="faq-section">
                <div id="faq-header" className={`section-header-centered scroll-reveal ${visibleElements['faq-header'] ? 'in-view' : ''}`}>
                    <div className="section-badge">
                        <HelpCircle size={14} />
                        <span>Faq</span>
                    </div>
                    <h2 className="section-title-premium">Frequently Asked Questions.</h2>
                </div>

                <div className="faq-container">
                    {[
                        {
                            q: "How does the Instagram integration work?",
                            a: "It uses Meta's official Graph API. Once you authorize through Facebook OAuth, Sotix receives comment and DM webhooks in real-time, executing your automations instantly."
                        },
                        {
                            q: "Is my account safe from suspension?",
                            a: "Yes. Since we rely 100% on official APIs and do not use scraping or simulated browsers, your account is fully compliant with Instagram and Google Developer Policies."
                        },
                        {
                            q: "Can I cancel my subscription at any time?",
                            a: "Absolutely. You can cancel, upgrade, or downgrade your plan at any time directly from your account settings page."
                        },
                        {
                            q: "Does it support custom replies based on keywords?",
                            a: "Yes. You can trigger different automations based on exact keywords, partial matches, or let our AI analyze comment intent to reply dynamically."
                        }
                    ].map((item, index) => (
                        <div 
                            key={index} 
                            id={`faq-item-${index}`}
                            className={`faq-item scroll-reveal stagger-${(index % 3) + 1} ${visibleElements[`faq-item-${index}`] ? 'in-view' : ''} ${faqOpenIndex === index ? 'active' : ''}`}
                            onClick={() => setFaqOpenIndex(faqOpenIndex === index ? null : index)}
                        >
                            <div className="faq-question">
                                <h3>{item.q}</h3>
                                <div className="faq-icon-toggle">
                                    <ChevronDown size={18} className="chevron-toggle" />
                                </div>
                            </div>
                            <div className="faq-answer">
                                <p>{item.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="connect-footer-premium expansive-footer">
                <div className="footer-links">
                    <a href="/privacy-policy">Privacy Policy</a>
                    <span className="separator">•</span>
                    <a href="/terms-and-conditions">Terms & Conditions</a>
                    <span className="separator">•</span>
                    <a href="/data-deletion">Data Deletion</a>
                </div>
            </footer>
        </div>
    );
}

export default Connect;
