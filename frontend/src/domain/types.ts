// ─── Auth ─────────────────────────────────────────────────────────────────

export interface Token {
    access_token: string
    token_type: string
}

// ─── Mechanic ──────────────────────────────────────────────────────────────

export interface Mechanic {
    id: string
    first_name: string
    last_name: string
    email: string
    shop_id: string
    shop_name?: string
    active_status: boolean
    staffrole?: string   // 'technician' | 'staff'
}

// ─── Shop ──────────────────────────────────────────────────────────────────

export interface Shop {
    shop_id: string
    shop_name: string
    location: string
}

// ─── Subscription / Module ─────────────────────────────────────────────────

export interface Subscription {
    subscription_id: string
    name: string
    payment_period: string // e.g. "monthly" | "yearly"
    description?: string
}

export interface ActiveSub {
    id: string
    shop_id: string
    subscription_id: string
    date_of_activation: string
    subscription: Subscription
}

// ─── Job Card ──────────────────────────────────────────────────────────────

export type JobCardStatus = 'pending' | 'in-progress' | 'completed'

export interface JobCard {
    job_card_id: string
    vehicle_vin: string
    vehicle_registry: string
    upload_mechanic: string
    shop_id?: string
    parts_affected: string
    details: string
    status: JobCardStatus
    created_at?: string
    is_uploaded?: boolean
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
    owner_id?: string
    company?: string
    brand?: string
    active_status?: boolean
    past_registry_num?: string[]
}

// ─── Vehicle Owner (CRM) ───────────────────────────────────────────────────

export interface VehicleOwner {
    id: string
    name: string
    phone?: string
    email?: string
    vehicle_count: number
    phone_verified?: boolean
}

export interface VehicleOwnerDetail extends VehicleOwner {
    vehicles: Vehicle[]
}

export interface NotifyResponse {
    customer_name: string
    customer_email?: string
    customer_phone?: string
    job_card_id: string
    vehicle_registry: string
    status: string
    message: string
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
    icon: string
    shortName: string
}
