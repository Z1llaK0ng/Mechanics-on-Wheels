import { useState, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    useShopAuthStore,
    useModulesCatalogue,
    ALL_MODULE_GROUPS,
    MODULE_REQUIREMENTS,
    type CatalogueModule,
    type ModuleGroup,
} from '../../hooks/useShopAuth'
import shopApiClient from '../../../infrastructure/api/shopClient'

type Period = 'monthly' | 'yearly'
type MarketTab = 'individual' | 'groups' | 'create'

// Helper hooks and functions
// ── Hover-preview hook ────────────────────────────────────────────────────────
// Returns event handlers that trigger a callback after 5s of continuous hover.
function useHoverPreview(onShow: () => void, onHide: () => void) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleMouseEnter = useCallback(() => {
        timerRef.current = setTimeout(() => {
            onShow()
        }, 2500)
    }, [onShow])

    const handleMouseLeave = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        onHide()
    }, [onHide])

    return { handleMouseEnter, handleMouseLeave }
}

// ── HoverCard wrapper ─────────────────────────────────────────────────────────
// Wraps a card child and shows a floating detail overlay after hovering.
// On show it measures the card's right edge against the viewport: if there is
// less than 320 px of space on the right it flips the overlay to the left.
const OVERLAY_WIDTH = 314 // px — must match .shop-hover-overlay width + gap

function HoverCardWrapper({ children, overlay }: { children: React.ReactNode; overlay: React.ReactNode }) {
    const [visible, setVisible] = useState(false)
    const [flipLeft, setFlipLeft] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const handleShow = useCallback(() => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect()
            const spaceOnRight = window.innerWidth - rect.right
            setFlipLeft(spaceOnRight < OVERLAY_WIDTH)
        }
        setVisible(true)
    }, [])

    const handleHide = useCallback(() => setVisible(false), [])

    const { handleMouseEnter, handleMouseLeave } = useHoverPreview(handleShow, handleHide)

    return (
        <div
            ref={wrapperRef}
            className="shop-hover-wrapper"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {visible && (
                <div
                    className={`shop-hover-overlay ${flipLeft ? 'flip-left' : ''}`}
                    onClick={e => e.stopPropagation()}
                >
                    {overlay}
                </div>
            )}
        </div>
    )
}

// ── Module detail overlay content ─────────────────────────────────────────────
function ModuleDetailOverlay({ mod, period, modById }: { mod: CatalogueModule; period: Period; modById: (id: string) => CatalogueModule | undefined }) {
    return (
        <div className="shop-detail-card">
            <div className="shop-detail-header">
                <span className="shop-detail-icon">{mod.icon}</span>
                <div>
                    <div className="shop-detail-name">{mod.name}</div>
                    <div className="shop-detail-price">
                        GH₵ {mod.price[period]} <span>/ {period === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                </div>
            </div>
            <p className="shop-detail-desc">{mod.desc}</p>
            {mod.features && (
                <div className="shop-detail-section">
                    <div className="shop-detail-section-title">What's included</div>
                    <ul className="shop-detail-features">
                        {mod.features.map(f => (
                            <li key={f}><span className="shop-feature-check">✓</span> {f}</li>
                        ))}
                    </ul>
                </div>
            )}
            {MODULE_REQUIREMENTS[mod.id] && (
                <div className="shop-detail-requires">
                    <span>⚠️</span>
                    Any group with this module must also include:{' '}
                    <strong>{MODULE_REQUIREMENTS[mod.id].map(rid => modById(rid)?.name ?? rid).join(', ')}</strong>
                </div>
            )}
            <div className="shop-detail-hint">Keep hovering · click Subscribe on the card to activate</div>
        </div>
    )
}

// ── Group detail overlay content ──────────────────────────────────────────────
function GroupDetailOverlay({ group, period, modById }: { group: ModuleGroup; period: Period; modById: (id: string) => CatalogueModule | undefined }) {
    return (
        <div className="shop-detail-card">
            <div className="shop-detail-header">
                <span className="shop-detail-icon">{group.icon}</span>
                <div>
                    <div className="shop-detail-name">{group.name}</div>
                    <div className="shop-detail-price">
                        GH₵ {group.price[period]} <span>/ {period === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                </div>
            </div>
            <p className="shop-detail-desc">{group.desc}</p>
            <div className="shop-detail-section">
                <div className="shop-detail-section-title">Modules in this bundle</div>
                {group.moduleIds.map(mid => {
                    const m = modById(mid)
                    if (!m) return null
                    return (
                        <div key={mid} className="shop-detail-mod-row">
                            <span>{m.icon}</span>
                            <div>
                                <div className="shop-detail-mod-name">{m.name}</div>
                                <div className="shop-detail-mod-desc">{m.desc}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="shop-detail-hint">Subscribing to the bundle activates all modules at once</div>
        </div>
    )
}

// ── Create Group Form ─────────────────────────────────────────────────────────
const ICONS = ['⚙️', '🏗️', '🛠️', '🗂️', '📁', '🔩', '🚘', '💼', '🧰', '📌']

function CreateGroupTab({ catalogue, modById }: { catalogue: CatalogueModule[]; modById: (id: string) => CatalogueModule | undefined }) {
    const [name, setName] = useState('')
    const [icon, setIcon] = useState(ICONS[0])
    const [desc, setDesc] = useState('')
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [saved, setSaved] = useState<ModuleGroup | null>(null)
    const [errors, setErrors] = useState<string[]>([])

    const toggleModule = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
        setErrors([])
    }

    // validate composition rules
    const validate = (): string[] => {
        const errs: string[] = []
        if (!name.trim()) errs.push('Please enter a group name.')
        if (selected.size === 0) errs.push('Select at least one module.')

        for (const [moduleId, requiredIds] of Object.entries(MODULE_REQUIREMENTS)) {
            if (selected.has(moduleId)) {
                const missing = requiredIds.filter(rid => !selected.has(rid))
                if (missing.length > 0) {
                    const modName = modById(moduleId)?.name ?? moduleId
                    const missingNames = missing.map(r => modById(r)?.name ?? r).join(', ')
                    errs.push(`"${modName}" requires: ${missingNames}`)
                }
            }
        }
        return errs
    }

    // estimate price: 10% discount vs sum of individual prices
    const totalMonthly = Array.from(selected).reduce((sum, id) => {
        const m = modById(id)
        return sum + (m?.price.monthly ?? 0)
    }, 0)
    const bundleMonthly = Math.round(totalMonthly * 0.9)
    const bundleYearly  = bundleMonthly * 10

    const handleSave = () => {
        const errs = validate()
        if (errs.length > 0) { setErrors(errs); return }

        const newGroup: ModuleGroup = {
            id:        `custom-${Date.now()}`,
            name:      name.trim(),
            icon,
            desc:      desc.trim() || `Custom group: ${name.trim()}`,
            moduleIds: Array.from(selected),
            price:     { monthly: bundleMonthly, yearly: bundleYearly },
        }
        setSaved(newGroup)
    }

    const handleReset = () => {
        setName(''); setDesc(''); setIcon(ICONS[0])
        setSelected(new Set()); setErrors([]); setSaved(null)
    }

    if (saved) return (
        <div className="shop-create-success">
            <div className="shop-create-success-icon">{saved.icon}</div>
            <h3>"{saved.name}" group created!</h3>
            <p>Your custom group has been saved. Head to the Module Groups tab to view all groups.</p>
            <div className="shop-group-chips" style={{ justifyContent: 'center', marginBottom: 20 }}>
                {saved.moduleIds.map(mid => {
                    const m = modById(mid)
                    return m ? <span key={mid} className="shop-group-chip">{m.icon} {m.name}</span> : null
                })}
            </div>
            <div className="shop-detail-price" style={{ fontSize: 20, marginBottom: 24 }}>
                GH₵ {saved.price.monthly} <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/ mo (10% bundle discount)</span>
            </div>
            <button className="btn btn-secondary" onClick={handleReset}>Create Another Group</button>
        </div>
    )

    return (
        <div className="shop-create-form-wrap">
            {/* Left: module picker */}
            <div className="shop-create-left">
                <div className="shop-create-section-title">1 · Select Modules</div>
                <p className="shop-create-hint">
                    Pick the modules for your group. Composition rules are enforced automatically.
                </p>
                <div className="shop-create-module-grid">
                    {catalogue.map(mod => {
                        const isSelected = selected.has(mod.id)
                        const reqs = MODULE_REQUIREMENTS[mod.id] ?? []
                        const missingReqs = isSelected
                            ? reqs.filter(r => !selected.has(r))
                            : []
                        return (
                            <button
                                key={mod.id}
                                className={`shop-create-mod-tile ${isSelected ? 'selected' : ''} ${missingReqs.length > 0 ? 'warn' : ''}`}
                                onClick={() => toggleModule(mod.id)}
                                type="button"
                            >
                                <span className="shop-create-mod-icon">{mod.icon}</span>
                                <span className="shop-create-mod-name">{mod.name}</span>
                                {isSelected && <span className="shop-create-mod-check">✓</span>}
                                {missingReqs.length > 0 && (
                                    <span className="shop-create-mod-warn">
                                        Needs {missingReqs.map(r => modById(r)?.name).join(', ')}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* live rule hints */}
                <div className="shop-create-rules">
                    <div className="shop-create-rules-title">📋 Composition Rules</div>
                    {Object.entries(MODULE_REQUIREMENTS).map(([moduleId, reqIds]) => {
                        const hasModule  = selected.has(moduleId)
                        const allPresent = reqIds.every(r => selected.has(r))
                        const modName    = modById(moduleId)?.name ?? moduleId
                        const reqNames   = reqIds.map(r => modById(r)?.name ?? r).join(' + ')
                        return (
                            <div
                                key={moduleId}
                                className={`shop-create-rule ${hasModule ? (allPresent ? 'ok' : 'error') : 'idle'}`}
                            >
                                <span className="shop-create-rule-dot" />
                                <span>{modName} → also requires {reqNames}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Right: group details */}
            <div className="shop-create-right">
                <div className="shop-create-section-title">2 · Name Your Group</div>

                {/* Icon picker */}
                <div className="shop-create-icon-row">
                    {ICONS.map(ic => (
                        <button
                            key={ic}
                            className={`shop-create-icon-btn ${icon === ic ? 'selected' : ''}`}
                            onClick={() => setIcon(ic)}
                            type="button"
                        >{ic}</button>
                    ))}
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label">Group Name</label>
                    <input
                        className="form-input"
                        placeholder="e.g. Full Workshop Suite"
                        value={name}
                        onChange={e => { setName(e.target.value); setErrors([]) }}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">
                        Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Describe what this group is for…"
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        style={{ resize: 'vertical' }}
                    />
                </div>

                {/* Price preview */}
                {selected.size > 0 && (
                    <div className="shop-create-price-preview">
                        <div className="shop-create-price-row">
                            <span>Individual total</span>
                            <span>GH₵ {totalMonthly}/mo</span>
                        </div>
                        <div className="shop-create-price-row discount">
                            <span>Bundle discount (10%)</span>
                            <span>− GH₵ {totalMonthly - bundleMonthly}/mo</span>
                        </div>
                        <div className="shop-create-price-row total">
                            <span>Your group price</span>
                            <span>GH₵ {bundleMonthly}/mo · GH₵ {bundleYearly}/yr</span>
                        </div>
                    </div>
                )}

                {/* Errors */}
                {errors.length > 0 && (
                    <div className="shop-create-errors">
                        {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
                    </div>
                )}

                <button
                    className="btn btn-primary w-full"
                    style={{ marginTop: 8 }}
                    onClick={handleSave}
                >
                    ✨ Save Module Group
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════════
export default function ShopMarketplacePage() {
    const user = useShopAuthStore((s) => s.user)
    const qc = useQueryClient()
    const [period, setPeriod] = useState<Period>('monthly')
    const [tab, setTab] = useState<MarketTab>('individual')
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [confirmType, setConfirmType] = useState<'module' | 'group'>('module')
    const { data: catalogue = [] } = useModulesCatalogue()
    
    // Helper: look up a module by id
    const modById = useCallback((id: string) => catalogue.find(m => m.id === id), [catalogue])

    // Calculate group pricing dynamically based on the current catalogue prices
    const dynamicGroups = ALL_MODULE_GROUPS.map(group => {
        const sumMonthly = group.moduleIds.reduce((sum, id) => sum + (modById(id)?.price.monthly || 0), 0)
        return {
            ...group,
            price: {
                monthly: Math.round(sumMonthly * 0.9), // 10% discount
                yearly: Math.round(sumMonthly * 0.9) * 10
            }
        }
    })

    const { data: subscribedModules } = useQuery({
        queryKey: ['shop', 'subscriptions'],
        enabled: !!user,
        queryFn: async () => user?.subscribedModules ?? [],
    })

    const subscribed = new Set(subscribedModules ?? [])

    const confirmMod   = confirmType === 'module' ? modById(confirmId!) : null
    const confirmGroup = confirmType === 'group'  ? ALL_MODULE_GROUPS.find(g => g.id === confirmId) : null

    const subscribeMutation = useMutation({
        mutationFn: async (id: string) => {
            await shopApiClient.post('/subscriptions', { subscription_id: id })
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'subscriptions'] }),
    })

    const cancelMutation = useMutation({
        mutationFn: async (id: string) => {
            await shopApiClient.delete(`/subscriptions/${id}`)
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'subscriptions'] }),
    })

    const handleSubscribeConfirm = () => {
        if (!confirmId) return
        if (confirmType === 'group') {
            const group = ALL_MODULE_GROUPS.find(g => g.id === confirmId)
            group?.moduleIds.forEach(mid => subscribeMutation.mutate(mid))
        } else {
            subscribeMutation.mutate(confirmId)
        }
        setConfirmId(null)
    }

    const openConfirm = (id: string, type: 'module' | 'group') => {
        setConfirmType(type); setConfirmId(id)
    }

    const isGroupSubscribed = (moduleIds: string[]) =>
        moduleIds.every(mid => subscribed.has(mid))

    return (
        <div className="fade-in">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1>Module Marketplace</h1>
                        <p>Extend your workshop with powerful add-ons</p>
                    </div>
                    {tab !== 'create' && (
                        <div className="shop-period-toggle">
                            <button
                                className={`shop-period-btn ${period === 'monthly' ? 'active' : ''}`}
                                onClick={() => setPeriod('monthly')}
                            >Monthly</button>
                            <button
                                className={`shop-period-btn ${period === 'yearly' ? 'active' : ''}`}
                                onClick={() => setPeriod('yearly')}
                            >
                                Yearly
                                <span className="shop-save-badge">Save 17%</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Tab bar ─────────────────────────────────────────────── */}
                <div className="shop-market-tabs">
                    <button
                        className={`shop-market-tab ${tab === 'individual' ? 'active' : ''}`}
                        onClick={() => setTab('individual')}
                    >
                        🧩 Individual Modules
                        <span className="shop-market-tab-count">{catalogue.length}</span>
                    </button>
                    <button
                        className={`shop-market-tab ${tab === 'groups' ? 'active' : ''}`}
                        onClick={() => setTab('groups')}
                    >
                        📦 Module Groups
                        <span className="shop-market-tab-count">{dynamicGroups.length}</span>
                    </button>
                    <button
                        className={`shop-market-tab shop-market-tab-create ${tab === 'create' ? 'active' : ''}`}
                        onClick={() => setTab('create')}
                    >
                        ✨ Create Module Group
                    </button>
                </div>
            </div>

            {/* ── Hover hint banner (individual + groups only) ─────────────── */}
            {(tab === 'individual' || tab === 'groups') && (
                <div className="shop-hover-hint">
                    💡 <strong>Tip:</strong> Hover over a card for 5 seconds to see a detailed overview.
                </div>
            )}

            {/* ── Individual Modules ───────────────────────────────────────── */}
            {tab === 'individual' && (
                <div className="shop-module-grid">
                    {catalogue.map((mod: CatalogueModule) => {
                        const isActive = subscribed.has(mod.id)
                        return (
                            <HoverCardWrapper
                                key={mod.id}
                                overlay={<ModuleDetailOverlay mod={mod} period={period} modById={modById} />}
                            >
                                <div className={`shop-module-card ${isActive ? 'active' : ''}`}>
                                    <div className="shop-module-card-header">
                                        <span className="shop-module-icon">{mod.icon}</span>
                                        {isActive && <span className="badge badge-success">Active</span>}
                                    </div>
                                    <h3 className="shop-module-name">{mod.name}</h3>
                                    <p className="shop-module-desc">{mod.desc}</p>

                                    {MODULE_REQUIREMENTS[mod.id] && (
                                        <div className="shop-module-requires">
                                            <span className="shop-requires-icon">⚠️</span>
                                            Groups with this module also require:{' '}
                                            {MODULE_REQUIREMENTS[mod.id]
                                                .map(rid => modById(rid)?.name ?? rid)
                                                .join(', ')}
                                        </div>
                                    )}

                                    <div className="shop-module-price">
                                        <span className="shop-price-amount">GH₵ {mod.price[period]}</span>
                                        <span className="shop-price-period">/ {period === 'monthly' ? 'mo' : 'yr'}</span>
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                                        {isActive ? (
                                            <button
                                                className="btn btn-danger w-full"
                                                onClick={() => cancelMutation.mutate(mod.id)}
                                            >Cancel Subscription</button>
                                        ) : (
                                            <button
                                                className="btn btn-primary w-full"
                                                onClick={() => openConfirm(mod.id, 'module')}
                                            >Subscribe</button>
                                        )}
                                    </div>
                                </div>
                            </HoverCardWrapper>
                        )
                    })}
                </div>
            )}

            {/* ── Module Groups ────────────────────────────────────────────── */}
            {tab === 'groups' && (
                <>
                    <div className="shop-groups-info">
                        <span className="shop-groups-info-icon">ℹ️</span>
                        Module groups are curated bundles. Subscribing to a group activates all included modules at once.
                        Groups with <strong>Invoicing</strong> always include Job Cards &amp; Parts.
                        Groups with <strong>Global Database</strong> always include Job Cards.
                    </div>
                    <div className="shop-module-grid">
                        {dynamicGroups.map((group: ModuleGroup) => {
                            const isActive = isGroupSubscribed(group.moduleIds)
                            return (
                                <HoverCardWrapper
                                    key={group.id}
                                    overlay={<GroupDetailOverlay group={group} period={period} modById={modById} />}
                                >
                                    <div className={`shop-module-card shop-group-card ${isActive ? 'active' : ''}`}>
                                        <div className="shop-module-card-header">
                                            <span className="shop-module-icon">{group.icon}</span>
                                            <span className="badge badge-accent">Bundle</span>
                                            {isActive && <span className="badge badge-success">Active</span>}
                                        </div>
                                        <h3 className="shop-module-name">{group.name}</h3>
                                        <p className="shop-module-desc">{group.desc}</p>

                                        <div className="shop-module-price">
                                            <span className="shop-price-amount">GH₵ {group.price[period]}</span>
                                            <span className="shop-price-period">/ {period === 'monthly' ? 'mo' : 'yr'}</span>
                                        </div>

                                        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                                            {isActive ? (
                                                <button
                                                    className="btn btn-danger w-full"
                                                    onClick={() =>
                                                        group.moduleIds.forEach(mid => cancelMutation.mutate(mid))
                                                    }
                                                >Cancel Bundle</button>
                                            ) : (
                                                <button
                                                    className="btn btn-primary w-full"
                                                    onClick={() => openConfirm(group.id, 'group')}
                                                >Subscribe to Bundle</button>
                                            )}
                                        </div>
                                    </div>
                                </HoverCardWrapper>
                            )
                        })}
                    </div>
                </>
            )}

            {/* ── Create Module Group ──────────────────────────────────────── */}
            {tab === 'create' && <CreateGroupTab catalogue={catalogue} modById={modById} />}

            {/* ── Confirm modal ────────────────────────────────────────────── */}
            {confirmId && (confirmMod || confirmGroup) && (
                <div className="modal-backdrop" onClick={() => setConfirmId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Confirm Subscription</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>✕</button>
                        </div>

                        {confirmMod && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                                You are subscribing to{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>
                                    {confirmMod.icon} {confirmMod.name}
                                </strong>{' '}
                                for{' '}
                                <strong style={{ color: 'var(--accent-light)' }}>
                                    GH₵ {confirmMod.price[period]} / {period === 'monthly' ? 'month' : 'year'}
                                </strong>.
                            </p>
                        )}

                        {confirmGroup && (
                            <>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                                    You are subscribing to the{' '}
                                    <strong style={{ color: 'var(--text-primary)' }}>
                                        {confirmGroup.icon} {confirmGroup.name}
                                    </strong>{' '}
                                    bundle for{' '}
                                    <strong style={{ color: 'var(--accent-light)' }}>
                                        GH₵ {confirmGroup.price[period]} / {period === 'monthly' ? 'month' : 'year'}
                                    </strong>.
                                </p>
                                <div className="shop-group-chips" style={{ marginBottom: 20 }}>
                                    {confirmGroup.moduleIds.map(mid => {
                                        const m = modById(mid)
                                        return m ? (
                                            <span key={mid} className="shop-group-chip">
                                                {m.icon} {m.name}
                                            </span>
                                        ) : null
                                    })}
                                </div>
                            </>
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setConfirmId(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSubscribeConfirm}>
                                Confirm &amp; Subscribe
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
