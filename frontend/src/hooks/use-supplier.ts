"use client";

import {
  createContext,
  useContext,
} from "react";
import type { Supplier, Product, Payer, PayerExclusion, ServiceArea } from "@/types/supplier";

export interface CorrectionNote {
  id: string;
  supplier_id: string;
  step_number: number;
  comment: string;
  resolved: boolean;
  created_by: string;
  created_at: string;
}

export interface SupplierContextValue {
  supplier: Supplier | null;
  products: Product[];
  payers: Payer[];
  exclusions: PayerExclusion[];
  serviceAreas: ServiceArea[];
  corrections: CorrectionNote[];
  currentStep: number;
  maxStepReached: number;
  setCurrentStep: (step: number) => void;
  refreshSupplier: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshPayers: () => Promise<void>;
  refreshExclusions: () => Promise<void>;
  refreshServiceAreas: () => Promise<void>;
  saveStatus: "idle" | "saving" | "saved" | "error";
  save: (fields: Record<string, unknown>, immediate?: boolean) => void;
  flush: () => Promise<void>;
}

export const SupplierContext = createContext<SupplierContextValue | null>(null);

export function useSupplier() {
  const ctx = useContext(SupplierContext);
  if (!ctx) throw new Error("useSupplier must be used within SupplierProvider");
  return ctx;
}
