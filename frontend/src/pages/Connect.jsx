import React, { useState, useEffect } from 'react';
import { Instagram, Youtube, ChevronRight, ShieldCheck, Zap, BarChart2, Lock, Cpu, Globe, HelpCircle, CheckCircle2, ArrowRight, Shield, Activity, Command, ChevronDown, Terminal, Link, TrendingUp, MessageSquare, PlaySquare, DollarSign, ShieldAlert, ShoppingBag, Battery, Wifi, SignalHigh, FileText } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import '../styles/Connect.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const TypewriterText = ({ text, isVisible }) => {
    const [displayed, setDisplayed] = useState('');
    
    useEffect(() => {
        if (!isVisible) {
            setDisplayed('');
            return;
        }
        let i = 0;
        const interval = setInterval(() => {
            setDisplayed(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 15);
        return () => clearInterval(interval);
    }, [text, isVisible]);

    return <>{displayed}</>;
};

function Connect() {
    const [loadingInsta, setLoadingInsta] = useState(false);
    const [loadingYT, setLoadingYT] = useState(false);
    const [error, setError] = useState('');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [faqOpenIndex, setFaqOpenIndex] = useState(null);
    const [visibleElements, setVisibleElements] = useState({});
    const navigate = useNavigate();



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
                <div className="navbar-left reveal-fade-in reveal-stagger-1">
                    <img src="/assets/logo-icon-transparent.png" alt="sotixAI Logo" className="nav-logo" />
                    <span className="nav-brand">sotixAI</span>
                </div>
                <div className="navbar-center hidden-mobile reveal-fade-in reveal-stagger-2">
                    <a href="#features" className="nav-link">Platform</a>
                    <a href="#security" className="nav-link">Security</a>
                    <a href="#customers" className="nav-link">Enterprise</a>
                </div>
                <div className="navbar-right reveal-fade-in reveal-stagger-3">
                    <button
                        className="nav-btn-outline early-access-btn"
                        onClick={() => navigate('/early-access')}
                    >
                        <span>Early Access</span>
                    </button>
                </div>
            </nav>

            {/* Main Split Content */}
            <main id="hero" className={`connect-main-split scroll-reveal ${visibleElements['hero'] ? 'in-view' : ''}`}>

                {/* Left Side: Value Proposition */}
                <div className="connect-info-side">
                    {/* Header Text Group */}
                    <div className="connect-header-group">
                        <div className="info-badge scroll-reveal stagger-4">
                            <ShieldCheck size={16} className="badge-icon" />
                            <span>Secure Authentication</span>
                        </div>
                        <h1 className="info-title scroll-reveal stagger-5">
                            Put your social platforms on <span className="neon-text-gradient">autopilot with AI.</span>
                        </h1>
                        <p className="info-description scroll-reveal stagger-6">
                            Securely link your Instagram and YouTube profiles to unlock intelligent automation. We strictly use official APIs to ensure your data is safe and your accounts remain fully compliant.
                        </p>
                    </div>

                    <div className="trust-indicators scroll-reveal stagger-7">
                        <div className="trust-item">
                            <CheckCircle2 size={16} className="trust-icon" /> <span>100% Policy Compliant</span>
                        </div>
                        <div className="trust-item">
                            <CheckCircle2 size={16} className="trust-icon" /> <span>No Passwords Required</span>
                        </div>
                        <div className="trust-item">
                            <CheckCircle2 size={16} className="trust-icon" /> <span>Enterprise-Grade Security</span>
                        </div>
                    </div>


                </div>

                {/* Right Side: Connection Card */}
                <div className="connect-card-side scroll-reveal stagger-10">
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

            {/* Feature Sections — Each prompt gets its own full section */}
            <div className="features-narrative">
                <div id="demo-header" className={`demo-header scroll-reveal ${visibleElements['demo-header'] ? 'in-view' : ''}`}>
                    <div className="poster-eyebrow scroll-reveal stagger-1">
                        <Command size={14} color="#8b5cf6" />
                        <span>See It In Action</span>
                    </div>
                    <h2 className="poster-title scroll-reveal stagger-2">One prompt. Entire empire.</h2>
                    <p className="poster-reason scroll-reveal stagger-3">Type what you want. Watch the AI build it. No flowcharts. No code. Just results.</p>
                </div>

                {/* Section 1: AI Sales Agent V2 */}
                <div id="feat-1" className={`feature-row scroll-reveal ${visibleElements['feat-1'] ? 'in-view' : ''}`}>
                    <div className="feat-prompt-side">
                        <div className="prompt-box">
                            <div className="pb-header">
                                <div className="pi-avatar"><Command size={14} color="#fff" /></div>
                                <span className="pb-label">Prompt</span>
                                <div className="pb-status"></div>
                            </div>
                            <div className="pb-input">
                                <p className="pb-text">
                                    <TypewriterText text='"Act as my 24/7 storefront assistant. Answer questions and send checkout links."' isVisible={visibleElements['feat-1']} />
                                </p>
                                <span className="pi-cursor"></span>
                            </div>
                            <div className="pb-response">
                                <CheckCircle2 size={14} color="#00ffaa" />
                                <span>Done. Agent Activated <ArrowRight size={12} style={{display: 'inline', margin: '0 4px', verticalAlign: 'middle'}}/> Product Sold</span>
                            </div>
                        </div>
                    </div>
                    <div className="feat-visual-side">
                        <div className="feat-glass">
                            <div className="viz-glow" style={{ background: '#3797F0' }}></div>
                            <div className="insta-dm-ui">
                                {/* Insta Header */}
                                <div className="insta-header">
                                    <div className="ih-left">
                                        <ArrowRight size={18} style={{transform: 'rotate(180deg)'}} color="#fff"/>
                                        <div className="ih-avatar"></div>
                                        <div className="ih-info">
                                            <span className="ih-name">alex.design</span>
                                            <span className="ih-status">Active today</span>
                                        </div>
                                    </div>
                                    <div className="ih-right">
                                        <Command size={18} color="#fff"/>
                                    </div>
                                </div>
                                
                                <div className="insta-thread">
                                    <div className="insta-timestamp">Today 3:14 AM</div>
                                    
                                    <div className="insta-bubble received">
                                        <p>Hey! Do you still have that oversized graphic tee in black?</p>
                                    </div>
                                    
                                    <div className="insta-bubble sent delay-1">
                                        <p>Yes! We just restocked the black colorway in all sizes.</p>
                                    </div>
                                    
                                    {/* Native Rich Card (Meta Generic Template) */}
                                    <div className="insta-rich-card delay-2">
                                        <div className="irc-image"></div>
                                        <div className="irc-content">
                                            <span className="irc-title">Oversized Graphic Tee</span>
                                            <span className="irc-price">$45.00</span>
                                        </div>
                                        <div className="irc-action">
                                            Checkout
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Automation Proof Toast - Moved outside to prevent clipping */}
                            <div className="sotix-toast delay-3">
                                <CheckCircle2 size={14} color="#00ffaa" />
                                <span>Sale Closed • +$45.00 USD</span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Section 2: Auto-Reply Funnel (formerly 1) */}
                <div id="feat-2" className={`feature-row reverse scroll-reveal ${visibleElements['feat-2'] ? 'in-view' : ''}`}>
                    <div className="feat-prompt-side">
                        <div className="prompt-box">
                            <div className="pb-header">
                                <div className="pi-avatar"><Command size={14} color="#fff" /></div>
                                <span className="pb-label">Prompt</span>
                                <div className="pb-status"></div>
                            </div>
                            <div className="pb-input">
                                <p className="pb-text">
                                    <TypewriterText text='"Reply to every comment on my latest Reel with my course link in DM."' isVisible={visibleElements['feat-2']} />
                                </p>
                                <span className="pi-cursor"></span>
                            </div>
                            <div className="pb-response">
                                <CheckCircle2 size={14} color="#00ffaa" />
                                <span>Done. IG DM Sent <ArrowRight size={12} style={{display: 'inline', margin: '0 4px', verticalAlign: 'middle'}}/> Lead Captured</span>
                            </div>
                        </div>
                    </div>
                    <div className="feat-visual-side">
                        <div className="feat-glass">
                            <div className="viz-glow" style={{ background: '#d946ef' }}></div>
                            <div className="viz-output-sim">
                                <div className="sim-comment">
                                    <img className="sim-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Avatar" />
                                    <div className="sim-content">
                                        <span className="sim-user">@aarti_creator</span>
                                        <p>Send me the course link!</p>
                                    </div>
                                </div>
                                <div className="sim-ai-process">
                                    <Command size={16} color="#8b5cf6" />
                                    <span>AI Auto-Reply Triggered</span>
                                </div>
                                <div className="sim-dm">
                                    <div className="sim-dm-header">
                                        <Instagram size={14} color="#d946ef" />
                                        <span>Direct Message Sent</span>
                                    </div>
                                    <div className="sim-dm-body">
                                        <p>Hey! Here is the course link you requested: sotix.ai/course</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: AI Moderation (formerly 2) */}
                <div id="feat-3" className={`feature-row scroll-reveal ${visibleElements['feat-3'] ? 'in-view' : ''}`}>
                    <div className="feat-prompt-side">
                        <div className="prompt-box">
                            <div className="pb-header">
                                <div className="pi-avatar"><Command size={14} color="#fff" /></div>
                                <span className="pb-label">Prompt</span>
                                <div className="pb-status"></div>
                            </div>
                            <div className="pb-input">
                                <p className="pb-text">
                                    <TypewriterText text='"Delete any toxic or spam comments on my posts automatically."' isVisible={visibleElements['feat-3']} />
                                </p>
                                <span className="pi-cursor"></span>
                            </div>
                            <div className="pb-response">
                                <CheckCircle2 size={14} color="#00ffaa" />
                                <span>Done. Toxicity Scanned <ArrowRight size={12} style={{display: 'inline', margin: '0 4px', verticalAlign: 'middle'}}/> Comment Deleted</span>
                            </div>
                        </div>
                    </div>
                    <div className="feat-visual-side">
                        <div className="feat-glass">
                            <div className="viz-glow" style={{ background: '#ef4444' }}></div>
                            <div className="viz-shield-sim">
                                <div className="sim-comment toxic-comment">
                                    <img className="sim-avatar" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100" alt="Hater Avatar" />
                                    <div className="sim-content">
                                        <span className="sim-user">@hater_123</span>
                                        <p className="toxic-text">u trash lmao stop posting</p>
                                    </div>
                                    <div className="shield-overlay">
                                        <ShieldAlert size={16} color="#ef4444" />
                                        <span>Hidden by AI Moderation</span>
                                    </div>
                                </div>
                                <div className="sim-comment safe-comment">
                                    <img className="sim-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Fan Avatar" />
                                    <div className="sim-content">
                                        <span className="sim-user">@real_fan</span>
                                        <p>Love this video! Keep it up.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 4: Viral Finder (formerly 3) */}
                <div id="feat-4" className={`feature-row reverse scroll-reveal ${visibleElements['feat-4'] ? 'in-view' : ''}`}>
                    <div className="feat-prompt-side">
                        <div className="prompt-box">
                            <div className="pb-header">
                                <div className="pi-avatar"><Command size={14} color="#fff" /></div>
                                <span className="pb-label">Prompt</span>
                                <div className="pb-status"></div>
                            </div>
                            <div className="pb-input">
                                <p className="pb-text">
                                    <TypewriterText text='"Show me why my competitor&apos;s last video got 2M views."' isVisible={visibleElements['feat-4']} />
                                </p>
                                <span className="pi-cursor"></span>
                            </div>
                            <div className="pb-response">
                                <CheckCircle2 size={14} color="#00ffaa" />
                                <span>Done. Hook Analyzed <ArrowRight size={12} style={{display: 'inline', margin: '0 4px', verticalAlign: 'middle'}}/> Blueprint Ready</span>
                            </div>
                        </div>
                    </div>
                    <div className="feat-visual-side">
                        <div className="feat-glass">
                            <div className="viz-glow" style={{ background: '#3b82f6' }}></div>
                            <div className="viz-script-sim">
                                <div className="script-doc">
                                    <div className="script-header">
                                        <div className="sh-title">
                                            <FileText size={14} color="#3b82f6" />
                                            <span>Viral Script Blueprint</span>
                                        </div>
                                        <div className="sh-badge">AI Generated</div>
                                    </div>
                                    <div className="script-body">
                                        <div className="script-block">
                                            <span className="sb-label hook">HOOK (0-3s)</span>
                                            <p>"Stop using ChatGPT for your marketing. Do this instead..."</p>
                                        </div>
                                        <div className="script-block">
                                            <span className="sb-label body">BODY (3-15s)</span>
                                            <p>The reason your competitor got 2M views is they used the 'Curiosity Gap' framework combined with rapid B-roll cuts.</p>
                                        </div>
                                        <div className="script-block">
                                            <span className="sb-label cta">CTA (15-20s)</span>
                                            <p>"Comment 'AI' below and I'll DM you the exact prompt."</p>
                                        </div>
                                    </div>
                                    <div className="script-footer">
                                        <div className="sf-typing">
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                        </div>
                                        <span>Drafting captions...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 5: Cross-Platform (formerly 4) */}
                <div id="feat-5" className={`feature-row scroll-reveal ${visibleElements['feat-5'] ? 'in-view' : ''}`}>
                    <div className="feat-prompt-side">
                        <div className="prompt-box">
                            <div className="pb-header">
                                <div className="pi-avatar"><Command size={14} color="#fff" /></div>
                                <span className="pb-label">Prompt</span>
                                <div className="pb-status"></div>
                            </div>
                            <div className="pb-input">
                                <p className="pb-text">
                                    <TypewriterText text='"When someone comments on YouTube, send them my Instagram link in DM."' isVisible={visibleElements['feat-5']} />
                                </p>
                                <span className="pi-cursor"></span>
                            </div>
                            <div className="pb-response">
                                <CheckCircle2 size={14} color="#00ffaa" />
                                <span>Done. YT Detected <ArrowRight size={12} style={{display: 'inline', margin: '0 4px', verticalAlign: 'middle'}}/> IG DM Sent</span>
                            </div>
                        </div>
                    </div>
                    <div className="feat-visual-side">
                        <div className="feat-glass">
                            <div className="viz-glow" style={{ background: '#8b5cf6' }}></div>
                            <div className="viz-cross-sim">
                                <div className="sim-yt-comment">
                                    <img className="sim-avatar" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100" alt="YouTube User" />
                                    <div className="sim-content">
                                        <span className="sim-user">@youtube_fan</span>
                                        <p>Do you have an Instagram?</p>
                                    </div>
                                </div>
                                <div className="sim-cross-process">
                                    <Command size={16} color="#8b5cf6" />
                                    <span>AI Cross-Platform Triggered</span>
                                </div>
                                <div className="sim-ig-dm">
                                    <div className="sim-dm-header">
                                        <Instagram size={14} color="#d946ef" />
                                        <span>Direct Message Sent</span>
                                    </div>
                                    <div className="sim-dm-body">
                                        <p>Yes! Follow me here: instagram.com/sotix</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Section 6: Biolink Generation (formerly 5) */}
                <div id="feat-6" className={`feature-row reverse scroll-reveal ${visibleElements['feat-6'] ? 'in-view' : ''}`}>
                    <div className="feat-prompt-side">
                        <div className="prompt-box">
                            <div className="pb-header">
                                <div className="pi-avatar"><Command size={14} color="#fff" /></div>
                                <span className="pb-label">Prompt</span>
                                <div className="pb-status"></div>
                            </div>
                            <div className="pb-input">
                                <p className="pb-text">
                                    <TypewriterText text='"Create a high-converting link-in-bio page for my new merch drop."' isVisible={visibleElements['feat-6']} />
                                </p>
                                <span className="pi-cursor"></span>
                            </div>
                            <div className="pb-response">
                                <CheckCircle2 size={14} color="#00ffaa" />
                                <span>Done. Biolink Generated <ArrowRight size={12} style={{display: 'inline', margin: '0 4px', verticalAlign: 'middle'}}/> Live URL Ready</span>
                            </div>
                        </div>
                    </div>
                    <div className="feat-visual-side">
                        <div className="feat-glass">
                            <div className="viz-glow" style={{ background: '#f59e0b' }}></div>
                            <div className="viz-biolink-sim">
                                <div className="bio-phone-pro">
                                    {/* iOS Status Bar */}
                                    <div className="ios-status-bar">
                                        <span className="ios-time">9:41</span>
                                        <div className="ios-notch"></div>
                                        <div className="ios-icons">
                                            <SignalHigh size={12} />
                                            <Wifi size={12} />
                                            <Battery size={12} />
                                        </div>
                                    </div>
                                    
                                    {/* Biolink Content */}
                                    <div className="bio-pro-content">
                                        <div className="bio-pro-header">
                                            <div className="bio-pro-avatar-wrapper">
                                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="Avatar" className="bio-pro-avatar" />
                                                <div className="verified-badge">
                                                    <CheckCircle2 size={14} color="#fff" fill="#3b82f6" />
                                                </div>
                                            </div>
                                            <h3 className="bio-pro-name">Aarti Creator</h3>
                                            <p className="bio-pro-desc">Fashion | Tech | Lifestyle<br/>New merch dropping Friday!</p>
                                        </div>
                                        
                                        <div className="bio-pro-links">
                                            <div className="bio-pro-link highlight">
                                                <div className="bpl-icon"><ShoppingBag size={18} /></div>
                                                <span className="bpl-text">Shop the New Collection</span>
                                                <div className="bpl-arrow"><ChevronRight size={16} /></div>
                                            </div>
                                            <div className="bio-pro-link">
                                                <div className="bpl-icon"><Youtube size={18} /></div>
                                                <span className="bpl-text">Watch My Latest Vlog</span>
                                                <div className="bpl-arrow"><ChevronRight size={16} /></div>
                                            </div>
                                            <div className="bio-pro-link">
                                                <div className="bpl-icon"><MessageSquare size={18} /></div>
                                                <span className="bpl-text">Join the Discord</span>
                                                <div className="bpl-arrow"><ChevronRight size={16} /></div>
                                            </div>
                                        </div>
                                        
                                        <div className="bio-pro-footer">
                                            Powered by <Command size={10} color="#8b5cf6" style={{margin: '0 2px'}} /> <strong>sotixAI</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


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
                            a: "It uses Meta's official Graph API. Once you authorize through Facebook OAuth, sotixAI receives comment and DM webhooks in real-time, executing your automations instantly."
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
