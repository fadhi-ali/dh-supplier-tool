export interface Supplier {
  id: string;
  invite_token: string;
  email: string;
  email_verified: boolean;
  company_name: string | null;
  company_address: string | null;
  tax_id: string | null;
  npi: string | null;
  primary_contact_name: string | null;
  primary_contact_title: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  escalation_contact_name: string | null;
  escalation_contact_email: string | null;
  escalation_contact_phone: string | null;
  tier: "tier_1" | "tier_2" | null;
  order_transmittal_preference: "secure_email" | "fax" | "api" | null;
  transmittal_destination: string | null;
  shipping_fee_structure: ShippingFeeStructure | null;
  return_policy: ReturnPolicy | null;
  support_hours: string | null;
  support_phone: string | null;
  support_email: string | null;
  after_hours_process: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  sla_acknowledged: boolean;
  sla_acknowledged_by: string | null;
  sla_acknowledged_at: string | null;
  current_step: number;
  status: SupplierStatus;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SupplierStatus =
  | "in_progress"
  | "submitted"
  | "under_review"
  | "action_needed"
  | "approved"
  | "live";

export interface ShippingFeeStructure {
  free_shipping_threshold?: number;
  flat_rate?: number;
  is_variable?: boolean;
  fee_schedule?: string;
}

export interface ReturnPolicy {
  return_window_days?: number;
  restocking_fee?: number;
  restocking_fee_type?: "percentage" | "flat";
  return_shipping_responsibility?: "supplier" | "patient";
  condition_requirements?: string[];
}

export interface Product {
  id: string;
  supplier_id: string;
  product_name: string;
  hcpcs_code: string | null;
  category: string | null;
  retail_price: number | null;
  hcpcs_fee_schedule: Record<string, unknown> | null;
  sku: string | null;
  manufacturer: string | null;
  variant_size: string | null;
  fulfillment_types: string[] | null;
  ai_confidence: Record<string, string> | null;
  approved_by_supplier: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payer {
  id: string;
  supplier_id: string;
  payer_name: string;
  network_type: string;
  created_at: string;
}

export interface PayerExclusion {
  id: string;
  supplier_id: string;
  payer_id: string;
  product_id: string | null;
  category: string | null;
  created_at: string;
}

export interface ServiceArea {
  id: string;
  supplier_id: string;
  state: string;
  cities: string[] | null;
  zip_codes: string[] | null;
  standard_delivery_days: number | null;
  expedited_delivery_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogUpload {
  upload_id: string;
  original_filename: string;
  processing_status: "uploaded" | "processing" | "completed" | "failed";
}

export interface StepConfig {
  number: number;
  label: string;
  key: string;
  requiresTier1?: boolean;
}

export const ONBOARDING_STEPS: StepConfig[] = [
  { number: 1, label: "Company Information", key: "company-info" },
  { number: 2, label: "Tier Selection", key: "tier-selection" },
  { number: 3, label: "Product Catalog", key: "product-catalog" },
  { number: 4, label: "Accepted Payers", key: "accepted-payers" },
  { number: 5, label: "Payer Exclusions", key: "payer-exclusions" },
  { number: 6, label: "Service Areas", key: "service-areas" },
  { number: 7, label: "Operations Setup", key: "operations-setup" },
  { number: 8, label: "Order Transmittal", key: "order-transmittal" },
  { number: 9, label: "Stripe Setup", key: "stripe-setup", requiresTier1: true },
  { number: 10, label: "SLAs & Agreements", key: "sla" },
  { number: 11, label: "Review & Submit", key: "review-submit" },
];
