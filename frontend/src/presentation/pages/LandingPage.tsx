import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModulesCatalogue } from '../hooks/useShopAuth'


// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
    { name: 'Kwame Asante', shop: 'Accra AutoFix', text: 'Transformed how we track jobs. Our mechanics love the job cards module.', avatar: 'KA' },
    { name: 'Abena Mensah', shop: 'Kumasi Tech Garage', text: 'The invoicing module alone saved us hours every week.', avatar: 'AM' },
    { name: 'Yaw Darko', shop: 'Tema Motors', text: "The Global Database lets us see service history from other shops — a game changer.", avatar: 'YD' },
]

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
    { value: '500+', label: 'Workshops' },
    { value: '12k+', label: 'Jobs Tracked' },
    { value: '98%', label: 'Uptime' },
    { value: '6', label: 'Modules' },
]

export default function LandingPage() {
    const navigate = useNavigate()
    const modulesRef = useRef<HTMLElement>(null)
    const suggestRef = useRef<HTMLElement>(null)

    // suggestion form state
    const [form, setForm] = useState({ name: '', email: '', title: '', desc: '', file: null as File | null })
    const [submitted, setSubmitted] = useState(false)
    const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'suggest'>('overview')

    const { data: catalogue = [], isLoading: isCatalogueLoading } = useModulesCatalogue()
    
    // Extend catalogue with empty features list if needed, to match landing format
    const LANDING_MODULES = catalogue.map((m: any) => ({
        ...m,
        features: m.features ?? []
    }))

    const scrollTo = (ref: React.RefObject<HTMLElement | null>, tab: typeof activeTab) => {
        setActiveTab(tab)
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // In a real app, this would POST to an API
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 4000)
        setForm({ name: '', email: '', title: '', desc: '', file: null })
    }

    return (
        <div className="landing-page">
            {/* ── Sticky Nav ─────────────────────────────────────────────── */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-nav-logo">
                        <span><strong>CarrySpanner</strong></span>
                    </div>
                    <div className="landing-nav-links">
                        <button className={`landing-nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => scrollTo({ current: document.querySelector('.landing-hero') as HTMLElement }, 'overview')}>Overview</button>
                        <button className={`landing-nav-link ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => scrollTo(modulesRef, 'modules')}>Modules</button>
                        <button className={`landing-nav-link ${activeTab === 'suggest' ? 'active' : ''}`} onClick={() => scrollTo(suggestRef, 'suggest')}>Suggest a Module</button>
                    </div>
                    <div className="landing-nav-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/shop/login')}>Login</button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/shop/register')}>Register Your Shop</button>
                    </div>
                </div>
            </nav>

            {/* ── Hero ───────────────────────────────────────────────────── */}
            <section className="landing-hero">
                <div className="landing-hero-bg">
                    <div className="landing-hero-orb landing-hero-orb-1" />
                    <div className="landing-hero-orb landing-hero-orb-2" />
                    <div className="landing-hero-orb landing-hero-orb-3" />
                    <div className="landing-hero-grid" />
                </div>
                <div className="landing-hero-content">
                    <div className="landing-hero-badge">
                        <span>🇬🇭</span> Built for Ghanaian Auto Workshops
                    </div>
                    <h1 className="landing-hero-title">
                        Run Your Workshop<br />
                        <span className="landing-hero-gradient">Smarter &amp; Faster</span>
                    </h1>
                    <p className="landing-hero-subtitle">
                        CarrySpanner is a modular ERP platform designed for automotive repair shops.
                        Pick only the tools your team needs — job cards, invoicing, inventory and more.
                    </p>
                    <div className="landing-hero-cta">
                        <button className="btn btn-primary btn-lg landing-hero-btn-primary" onClick={() => navigate('/shop/register')}>
                            🏪 Register Your Shop
                        </button>
                        <button className="btn btn-secondary btn-lg" onClick={() => navigate('/shop/login')}>
                            🔑 Mechanic Login
                        </button>
                    </div>
                    <div className="landing-hero-stats">
                        {STATS.map(s => (
                            <div key={s.label} className="landing-stat">
                                <span className="landing-stat-value">{s.value}</span>
                                <span className="landing-stat-label">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="landing-hero-scroll-hint" onClick={() => scrollTo(modulesRef, 'modules')}>
                    <span>Explore Modules</span>
                    <span className="landing-scroll-arrow">↓</span>
                </div>
            </section>

            {/* ── How It Works ───────────────────────────────────────────── */}
            <section className="landing-section landing-how">
                <div className="landing-section-inner">
                    <div className="landing-section-label">How It Works</div>
                    <h2 className="landing-section-title">Up and running in minutes</h2>
                    <div className="landing-steps">
                        {[
                            { icon: '🏪', step: '01', title: 'Register Your Shop', desc: 'Create your shop account with your business name, location and admin credentials.' },
                            { icon: '🧩', step: '02', title: 'Pick Your Modules', desc: 'Browse the marketplace and subscribe to the tools your workshop actually needs.' },
                            { icon: '👨‍🔧', step: '03', title: 'Add Your Mechanics', desc: 'Invite your team. Each mechanic gets a login tied to your shop ID.' },
                            { icon: '🚀', step: '04', title: 'Start Working', desc: 'Log jobs, track vehicles, generate invoices — all from one dashboard.' },
                        ].map(s => (
                            <div key={s.step} className="landing-step">
                                <div className="landing-step-number">{s.step}</div>
                                <div className="landing-step-icon">{s.icon}</div>
                                <h3 className="landing-step-title">{s.title}</h3>
                                <p className="landing-step-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Modules ────────────────────────────────────────────────── */}
            <section className="landing-section landing-modules-section" ref={modulesRef}>
                <div className="landing-section-inner">
                    <div className="landing-section-label">Module Marketplace</div>
                    <h2 className="landing-section-title">Everything your workshop needs</h2>
                    <p className="landing-section-desc">
                        Each module is a standalone add-on. Subscribe to what you need, cancel anytime.
                    </p>
                    {isCatalogueLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            Loading modules...
                        </div>
                    ) : (
                        <div className="landing-modules-grid">
                            {LANDING_MODULES.map((mod: any, i: number) => (
                                <div key={mod.id} className="landing-module-card" style={{ animationDelay: `${i * 60}ms` }}>
                                    <div className="landing-module-card-top">
                                        <span className="landing-module-icon">{mod.icon}</span>
                                        <div className="landing-module-pricing">
                                            <span className="landing-module-price">GH₵{mod.price?.monthly ?? 0}</span>
                                            <span className="landing-module-price-period">/mo</span>
                                        </div>
                                    </div>
                                    <h3 className="landing-module-name">{mod.name}</h3>
                                    <p className="landing-module-desc">{mod.desc}</p>
                                    <ul className="landing-module-features">
                                        {mod.features?.map((f: string) => (
                                            <li key={f} className="landing-module-feature">
                                                <span className="landing-feature-check">✓</span> {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <button className="btn btn-primary w-full landing-module-cta" onClick={() => navigate('/shop/register')}>
                                        Get Started
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Testimonials ───────────────────────────────────────────── */}
            <section className="landing-section landing-testimonials">
                <div className="landing-section-inner">
                    <div className="landing-section-label">Testimonials</div>
                    <h2 className="landing-section-title">Trusted by workshops across Ghana</h2>
                    <div className="landing-testimonials-grid">
                        {TESTIMONIALS.map(t => (
                            <div key={t.name} className="landing-testimonial-card">
                                <div className="landing-testimonial-stars">★★★★★</div>
                                <p className="landing-testimonial-text">"{t.text}"</p>
                                <div className="landing-testimonial-author">
                                    <div className="landing-testimonial-avatar">{t.avatar}</div>
                                    <div>
                                        <div className="landing-testimonial-name">{t.name}</div>
                                        <div className="landing-testimonial-shop">{t.shop}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Portal Links CTA ───────────────────────────────────────── */}
            <section className="landing-section landing-portals">
                <div className="landing-section-inner">
                    <div className="landing-portals-grid">
                        <div className="landing-portal-card landing-portal-shop">
                            <div className="landing-portal-icon">🏪</div>
                            <h3>Shop Admin Portal</h3>
                            <p>Register your workshop, manage modules, add mechanics and view analytics from the admin dashboard.</p>
                            <div className="landing-portal-actions">
                                <button className="btn btn-primary" onClick={() => navigate('/shop/register')}>Register Shop</button>
                                <button className="btn btn-ghost" onClick={() => navigate('/shop/login')}>Admin Login</button>
                            </div>
                        </div>
                        <div className="landing-portal-card landing-portal-mechanic">
                            <div className="landing-portal-icon">🔧</div>
                            <h3>Mechanic Portal</h3>
                            <p>Access your assigned modules, view job cards, log repair work and download the offline mobile PWA.</p>
                            <div className="landing-portal-actions">
                                <button className="btn btn-primary" onClick={() => navigate('/shop/login')}>Mechanic Login</button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Module Suggestion ──────────────────────────────────────── */}
            <section className="landing-section landing-suggest" ref={suggestRef}>
                <div className="landing-section-inner">
                    <div className="landing-section-label">Community</div>
                    <h2 className="landing-section-title">Suggest a Module</h2>
                    <p className="landing-section-desc">
                        Got an idea for a feature your workshop needs? Tell us about it and we may build it next.
                    </p>

                    {submitted ? (
                        <div className="landing-suggest-success">
                            <div className="landing-suggest-success-icon">🎉</div>
                            <h3>Thank you for your suggestion!</h3>
                            <p>We review all submissions and will reach out if we need more details.</p>
                        </div>
                    ) : (
                        <form className="landing-suggest-form" onSubmit={handleSubmit}>
                            <div className="landing-suggest-row">
                                <div className="form-group">
                                    <label className="form-label">Your Name</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="Kwame Asante"
                                        value={form.name}
                                        required
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        className="form-input"
                                        type="email"
                                        placeholder="kwame@garage.com"
                                        value={form.email}
                                        required
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Module Title</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g. Customer SMS Notifications"
                                    value={form.title}
                                    required
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input landing-suggest-textarea"
                                    placeholder="Describe what the module should do and why it would be useful for workshops..."
                                    value={form.desc}
                                    required
                                    rows={5}
                                    onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Attachment <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional – wireframe, doc, etc.)</span></label>
                                <label className="landing-file-upload">
                                    <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        style={{ display: 'none' }}
                                        onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
                                    />
                                    <span className="landing-file-upload-icon">📎</span>
                                    <span>{form.file ? form.file.name : 'Click to upload a file'}</span>
                                </label>
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg landing-suggest-submit">
                                Submit Suggestion →
                            </button>
                        </form>
                    )}
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="landing-footer-logo">
                        <span>🔩</span> MechanicsOnWheels
                    </div>
                    <p className="landing-footer-tagline">The modular ERP for Ghanaian auto workshops.</p>
                    <div className="landing-footer-links">
                        <button className="landing-footer-link" onClick={() => navigate('/shop/register')}>Register Shop</button>
                        <button className="landing-footer-link" onClick={() => navigate('/shop/login')}>Login</button>
                        <button className="landing-footer-link" onClick={() => scrollTo(suggestRef, 'suggest')}>Suggest Module</button>
                    </div>
                    <p className="landing-footer-copy">© {new Date().getFullYear()} MechanicsOnWheels. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
