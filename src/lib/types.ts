// Shapes returned by the Zenerlink API (internal/app in the backend).
export type Tenant = { id: string; slug: string; name: string; status: string; vending_mode: 'sandbox' | 'live'; is_platform: boolean }

export type Integration = {
  id: string
  manufacturer: string
  base_url: string
  timezone: string
  status: string
  last_ingest_at?: string
  last_error?: string
  updated_at: string
  ingest_token?: string
}

export type OperatorDashboard = {
  onboarding_status: string
  regulatory_status: string
  sites: number
  sites_operational: number
  customers: number
  meters_by_status: Record<string, number>
  meters_total: number
  meters_online: number
  meters_offline: number
  meters_rights_unverified: number
  tariff_plans: number
  tariff_versions_pending: number
  control_requests_pending: number
  open_debt_kobo: number
  quotes_in_period: number
  quoted_kobo_in_period: number
  integrations: Integration[]
  recent_events: { meter_id: string; meter_number: string; code: string; level: string; message: string; reported_at: string }[]
  sales_available: boolean
}

export type Site = {
  id: string
  code: string
  name: string
  state: string
  lga: string
  community: string
  address: string
  latitude?: number
  longitude?: number
  project_type: string
  generation_capacity_w: number
  battery_capacity_wh: number
  status: string
  meter_count: number
  customer_count: number
  created_at: string
}

export type Customer = {
  id: string
  account_number: string
  name: string
  phone: string
  email: string
  category: string
  mini_grid_id?: string
  address: string
  status: string
  debt_kobo: number
  meter_count: number
  created_at: string
}

export type Debt = { id: string; reason: string; principal_kobo: number; balance_kobo: number; recovery_bps: number; status: string; created_at: string }

export type Meter = {
  id: string
  meter_number: string
  serial_number?: string
  manufacturer: string
  model: string
  firmware_version: string
  mini_grid_id?: string
  customer_account_id?: string
  meter_type: string
  comms_mode: string
  gateway_id: string
  install_location: string
  status: string
  connectivity: string
  last_seen_at?: string
  commissioned_at?: string
  vending_mechanism: string
  credit_model: string
  sts?: { sgc: string; krn: number; ti: number }
  operating_rights: string
  capabilities: Record<string, string>
  created_at: string
}

export type MeterDetail = Meter & {
  history: { kind: string; related_meter_id?: string; customer_account_id?: string; notes: string; created_at: string }[]
  assignments: { customer_account_id: string; started_at: string; ended_at?: string; end_reason?: string }[]
}

export type MeterModel = { id: string; manufacturer: string; model: string; description: string; phases: number; capabilities: Record<string, string>; notes: string }

export type Telemetry = {
  source: string
  reported_at: string
  received_at: string
  online?: boolean
  energy_import_wh?: number
  power_w?: number
  voltage_mv?: (number | null)[]
  current_ma?: (number | null)[]
  switch_on?: boolean
  balance_raw?: string
  value_kind: string
}

export type MeterEvent = { code: string; level: string; message: string; reported_at: string }

export type TariffStructure = {
  rate_kobo_per_kwh?: number
  blocks?: { up_to_kwh: number | null; rate_kobo_per_kwh: number }[]
  periods?: { name: string; start: string; end: string; rate_kobo_per_kwh: number }[]
}

export type TariffVersion = {
  id: string
  plan_id: string
  version: number
  kind: 'flat' | 'tiered' | 'tou'
  structure: TariffStructure
  fixed_charge_kobo: number
  service_fee_kobo: number
  vat_bps: number
  min_purchase_kobo: number
  max_purchase_kobo: number
  effective_from: string
  effective_to?: string
  status: string
  regulatory_reference: string
  notes: string
  created_by?: string
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
}

export type TariffPlan = {
  id: string
  code: string
  name: string
  description: string
  mini_grid_id?: string
  customer_category?: string
  active: boolean
  current_version?: TariffVersion
}

export type QuoteBreakdown = {
  amount_kobo: number
  fixed_charge_kobo: number
  service_fee_kobo: number
  debt_recovery_kobo: number
  vat_bps: number
  vat_kobo: number
  energy_value_kobo: number
  credit_model: 'energy' | 'money'
  energy_wh: number
  credit_kobo: number
  estimated_energy_wh?: number
  blocks?: { rate_kobo_per_kwh: number; energy_wh: number }[]
  tariff_kind: string
  note?: string
}

export type Quote = { id: string; meter_number: string; tariff_version: number; breakdown: QuoteBreakdown; expires_at: string }

export type ControlRequest = {
  id: string
  meter_id: string
  meter_number: string
  action: string
  reason: string
  requested_by: string
  status: string
  decided_by?: string
  decided_at?: string
  result?: string
  created_at: string
}

export type Permit = { id: string; kind: string; reference: string; issuer: string; issued_on?: string; expires_on?: string; evidence_ref: string; verification: string; notes: string; created_at: string }

export type Profile = {
  tenant_id: string
  onboarding_status: string
  legal_name: string
  trading_name: string
  registration_number: string
  business_address: string
  contacts: { name: string; role: string; email: string; phone: string }[]
  service_areas: string[]
  settlement_bank: string
  settlement_account_name: string
  settlement_account_last4: string
  subscription_plan_code: string
  agreement_reference: string
  manufacturers: string[]
  review_notes: string
  regulatory_status: string
  permits: Permit[]
}

export type StaffUser = { id: string; email: string; name: string; role: string; staff_role?: string; status: string; created_at: string }

export type PlatformOperator = {
  tenant_id: string
  slug: string
  name: string
  status: string
  vending_mode: string
  onboarding_status: string
  legal_name: string
  sites: number
  customers: number
  meters: number
  meters_online: number
  permits_verified: number
  permits_pending: number
  last_ingest_at?: string
  integration_error?: string
  created_at: string
}

export type PlatformOverview = {
  operators: number
  operators_active: number
  operators_in_review: number
  sites: number
  customers: number
  meters: number
  meters_online: number
  meters_offline: number
  permits_pending: number
  meters_rights_unverified: number
  integration_errors: number
  list: PlatformOperator[]
  sales_available: boolean
}

export type AuditLog = { id: number; tenant_id?: string; actor_type: string; action: string; target_type: string; target_id: string; metadata: unknown; ip: string; created_at: string }

export type Paged<K extends string, T> = { [k in K]: T[] } & { total: number; limit: number; offset: number }
