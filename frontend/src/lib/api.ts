const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const TOKEN_KEY = "dh_access_token";

export function setAccessToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function clearAccessToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  verifyToken: (token: string) =>
    request<{
      supplier_id: string;
      email: string;
      email_verified: boolean;
      company_name: string | null;
      current_step: number;
      status: string;
      access_token: string | null;
    }>("/auth/verify-token", {
      method: "POST",
      body: JSON.stringify({ invite_token: token }),
    }),

  sendMagicLink: (email: string) =>
    request<{ message: string }>("/auth/send-magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyMagicLink: (token: string) =>
    request<{ access_token: string; token_type: string; supplier_id: string }>(
      "/auth/verify-magic-link",
      { method: "POST", body: JSON.stringify({ token }) }
    ),

  // Supplier
  getSupplier: (id: string) =>
    request<import("@/types/supplier").Supplier>(`/suppliers/${id}`),

  updateSupplier: (id: string, data: Record<string, unknown>) =>
    request<import("@/types/supplier").Supplier>(`/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  submitSupplier: (id: string) =>
    request<{ id: string; status: string; submitted_at: string }>(
      `/suppliers/${id}/submit`,
      { method: "POST" }
    ),

  getSupplierStatus: (id: string) =>
    request<{ id: string; status: string; current_step: number; submitted_at: string | null; approved_at: string | null }>(
      `/suppliers/${id}/status`
    ),

  // Products
  uploadCatalog: async (supplierId: string, file: File) => {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/suppliers/${supplierId}/products/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json() as Promise<import("@/types/supplier").CatalogUpload>;
  },

  getUploadStatus: (supplierId: string) =>
    request<{
      upload_id: string | null;
      original_filename: string | null;
      processing_status: string;
      product_count: number;
    }>(`/suppliers/${supplierId}/products/upload-status`),

  getProducts: (supplierId: string) =>
    request<{ products: import("@/types/supplier").Product[]; total: number }>(
      `/suppliers/${supplierId}/products`
    ),

  addProduct: (supplierId: string, data: {
    product_name: string;
    hcpcs_code?: string | null;
    category?: string | null;
    retail_price?: number | null;
    variant_size?: string | null;
    sku?: string | null;
    manufacturer?: string | null;
    fulfillment_types?: string[] | null;
  }) =>
    request<import("@/types/supplier").Product>(
      `/suppliers/${supplierId}/products`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  updateProduct: (productId: string, data: Record<string, unknown>) =>
    request<import("@/types/supplier").Product>(`/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  approveProducts: (supplierId: string) =>
    request<{ approved_count: number }>(
      `/suppliers/${supplierId}/products/approve`,
      { method: "POST" }
    ),

  deleteProduct: (productId: string) =>
    request<void>(`/products/${productId}`, { method: "DELETE" }),

  // Payers
  getPayers: (supplierId: string) =>
    request<{ payers: import("@/types/supplier").Payer[]; total: number }>(
      `/suppliers/${supplierId}/payers`
    ),

  addPayers: (supplierId: string, payers: { payer_name: string; network_type: string }[]) =>
    request<import("@/types/supplier").Payer[]>(
      `/suppliers/${supplierId}/payers`,
      { method: "POST", body: JSON.stringify({ payers }) }
    ),

  deletePayer: (payerId: string) =>
    request<void>(`/payers/${payerId}`, { method: "DELETE" }),

  // Exclusions
  getExclusions: (supplierId: string) =>
    request<{ exclusions: import("@/types/supplier").PayerExclusion[]; total: number }>(
      `/suppliers/${supplierId}/exclusions`
    ),

  addExclusion: (supplierId: string, data: { payer_id: string; product_id?: string; category?: string }) =>
    request<import("@/types/supplier").PayerExclusion>(
      `/suppliers/${supplierId}/exclusions`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  deleteExclusion: (exclusionId: string) =>
    request<void>(`/exclusions/${exclusionId}`, { method: "DELETE" }),

  // Service Areas
  getServiceAreas: (supplierId: string) =>
    request<{ service_areas: import("@/types/supplier").ServiceArea[]; total: number }>(
      `/suppliers/${supplierId}/service-areas`
    ),

  addServiceArea: (supplierId: string, data: { state: string; cities?: string[]; zip_codes?: string[]; standard_delivery_days?: number; expedited_delivery_days?: number }) =>
    request<import("@/types/supplier").ServiceArea>(
      `/suppliers/${supplierId}/service-areas`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  deleteServiceArea: (areaId: string) =>
    request<void>(`/service-areas/${areaId}`, { method: "DELETE" }),

  // Chat
  sendChatMessage: (supplierId: string, message: string, currentStep: number) =>
    request<{ message: string }>("/chat", {
      method: "POST",
      body: JSON.stringify({
        supplier_id: supplierId,
        message,
        current_step: currentStep,
      }),
    }),

  // Stripe
  createStripeAccountLink: (supplierId: string) =>
    request<{ url: string }>(`/suppliers/${supplierId}/stripe/create-account-link`, {
      method: "POST",
    }),

  checkStripeStatus: (supplierId: string) =>
    request<{
      stripe_account_id: string | null;
      details_submitted: boolean;
      charges_enabled: boolean;
      onboarding_complete: boolean;
    }>(`/suppliers/${supplierId}/stripe/check-status`, {
      method: "POST",
    }),

  // Corrections (supplier-facing)
  getCorrections: (supplierId: string) =>
    request<Array<{
      id: string;
      supplier_id: string;
      step_number: number;
      comment: string;
      resolved: boolean;
      created_by: string;
      created_at: string;
    }>>(`/suppliers/${supplierId}/corrections`),
};

// --- Admin API (separate due to different auth) ---

function adminRequest<T>(path: string, password: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-admin-password": password,
    ...(options?.headers as Record<string, string>),
  };
  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || "Request failed");
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  });
}

export const adminApi = {
  listSuppliers: (password: string, status?: string) =>
    adminRequest<{
      suppliers: Array<{
        id: string;
        company_name: string | null;
        primary_contact_name: string | null;
        primary_contact_email: string | null;
        tier: string | null;
        status: string;
        current_step: number;
        submitted_at: string | null;
        updated_at: string;
      }>;
      total: number;
    }>(`/admin/suppliers${status && status !== "all" ? `?status=${status}` : ""}`, password),

  getSupplier: (password: string, id: string) =>
    adminRequest<AdminSupplierDetail>(`/admin/suppliers/${id}`, password),

  claim: (password: string, id: string) =>
    adminRequest<{ id: string; status: string; message: string }>(
      `/admin/suppliers/${id}/claim`, password, { method: "POST" }
    ),

  requestCorrections: (password: string, id: string, data: {
    reviewer_name: string;
    corrections: Array<{ step_number: number; comment: string }>;
  }) =>
    adminRequest<{ id: string; status: string; message: string }>(
      `/admin/suppliers/${id}/request-corrections`, password,
      { method: "POST", body: JSON.stringify(data) }
    ),

  approve: (password: string, id: string) =>
    adminRequest<{ id: string; status: string; message: string }>(
      `/admin/suppliers/${id}/approve`, password, { method: "POST" }
    ),

  goLive: (password: string, id: string) =>
    adminRequest<{ id: string; status: string; message: string }>(
      `/admin/suppliers/${id}/go-live`, password, { method: "POST" }
    ),
};

export interface AdminSupplierDetail {
  id: string;
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
  escalation_contact_title: string | null;
  escalation_contact_email: string | null;
  escalation_contact_phone: string | null;
  tier: string | null;
  order_transmittal_preference: string | null;
  transmittal_destination: string | null;
  shipping_fee_structure: Record<string, unknown> | null;
  return_policy: Record<string, unknown> | null;
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
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  products: Array<{
    id: string;
    product_name: string;
    hcpcs_code: string | null;
    category: string | null;
    retail_price: number | null;
    variant_size: string | null;
    fulfillment_types: string[] | null;
    sku: string | null;
    manufacturer: string | null;
    approved_by_supplier: boolean;
  }>;
  payers: Array<{ id: string; payer_name: string; network_type: string }>;
  exclusions: Array<{ id: string; payer_id: string; product_id: string | null; category: string | null }>;
  service_areas: Array<{
    id: string;
    state: string;
    cities: string[] | null;
    zip_codes: string[] | null;
    standard_delivery_days: number | null;
    expedited_delivery_days: number | null;
  }>;
  corrections: Array<{
    id: string;
    supplier_id: string;
    step_number: number;
    comment: string;
    resolved: boolean;
    created_by: string;
    created_at: string;
  }>;
}
