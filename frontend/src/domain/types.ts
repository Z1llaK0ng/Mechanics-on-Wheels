// ─── Auth ─────────────────────────────────────────────────────────────────

export interface Token {
    access_token: string
    token_type: string
}

// ─── Mechanic ──────────────────────────────────────────────────────────────

export interface Mechanic {
    id: number
    first_name: string
    last_name: string
    email: string
    shop_id: number
    active_status: boolean
}

// ─── Shop ──────────────────────────────────────────────────────────────────

export interface Shop {
    shop_id: number
    shop_name: string
    location: string
}

// ─── Subscription / Module ─────────────────────────────────────────────────

export interface Subscription {
    subscription_id: number
    name: string
    payment_period: string // e.g. "monthly" | "yearly"
}

export interface ActiveSub {
    id: number
    shop_id: number
    subscription_id: number
    date_of_activation: string
    subscription: Subscription
}

// ─── Job Card ──────────────────────────────────────────────────────────────

export type JobCardStatus = 'pending' | 'in-progress' | 'completed'

export interface JobCard {
    job_card_id: number
    vehicle_vin: string
    vehicle_registry: string
    upload_mechanic: number
    parts_affected: string
    details: string
    status: JobCardStatus
    created_at?: string
}

export interface JobCardCreate {
    vehicle_vin: string
    vehicle_registry: string
    parts_affected: string
    details: string
}

export interface JobCardUpdate {
    parts_affected?: string
    details?: string
    status?: JobCardStatus
}

// ─── Vehicle ───────────────────────────────────────────────────────────────

export interface Vehicle {
    vin: string
    registry: string
    make?: string
    model?: string
    year?: number
    owner_id?: number
}

// ─── PWA ───────────────────────────────────────────────────────────────────

export interface ModuleFeature {
    label: string
    icon: string
}

/** Derived client-side structure coupling a module to its UI metadata */
export interface AppModule {
    subscription: Subscription
    activeSince: string
    features: ModuleFeature[]
    routeKey: string // e.g. "job-cards" | "vehicles"
}
