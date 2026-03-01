"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SupplierContext, type CorrectionNote } from "@/hooks/use-supplier";
import { useAutoSave } from "@/hooks/use-auto-save";
import { api, getAccessToken, setAccessToken } from "@/lib/api";
import type { Supplier, Product, Payer, PayerExclusion, ServiceArea } from "@/types/supplier";

export function SupplierProvider({
  initialSupplier,
  children,
}: {
  initialSupplier: Supplier;
  children: ReactNode;
}) {
  const [supplier, setSupplier] = useState<Supplier>(initialSupplier);
  const [products, setProducts] = useState<Product[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [exclusions, setExclusions] = useState<PayerExclusion[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [corrections, setCorrections] = useState<CorrectionNote[]>([]);
  const [currentStep, setCurrentStep] = useState(initialSupplier.current_step);
  const [maxStepReached, setMaxStepReached] = useState(initialSupplier.current_step);

  const { save, saveStatus, flush } = useAutoSave(supplier?.id);

  const refreshSupplier = useCallback(async () => {
    if (!supplier?.id) return;
    const data = await api.getSupplier(supplier.id);
    setSupplier(data);
  }, [supplier?.id]);

  const refreshProducts = useCallback(async () => {
    if (!supplier?.id) return;
    const data = await api.getProducts(supplier.id);
    setProducts(data.products);
  }, [supplier?.id]);

  const refreshPayers = useCallback(async () => {
    if (!supplier?.id) return;
    const data = await api.getPayers(supplier.id);
    setPayers(data.payers);
  }, [supplier?.id]);

  const refreshExclusions = useCallback(async () => {
    if (!supplier?.id) return;
    const data = await api.getExclusions(supplier.id);
    setExclusions(data.exclusions);
  }, [supplier?.id]);

  const refreshServiceAreas = useCallback(async () => {
    if (!supplier?.id) return;
    const data = await api.getServiceAreas(supplier.id);
    setServiceAreas(data.service_areas);
  }, [supplier?.id]);

  useEffect(() => {
    if (supplier?.id) {
      refreshProducts().catch(() => toast.error("Failed to load products."));
      refreshPayers().catch(() => toast.error("Failed to load payers."));
      refreshExclusions().catch(() => toast.error("Failed to load exclusions."));
      refreshServiceAreas().catch(() => toast.error("Failed to load service areas."));

      // Load corrections if action_needed
      if (supplier.status === "action_needed") {
        api.getCorrections(supplier.id).then(setCorrections).catch(() => {
          toast.error("Failed to load corrections.");
        });
      }
    }
  }, [supplier?.id, supplier?.status, refreshProducts, refreshPayers, refreshExclusions, refreshServiceAreas]);

  // Auto-refresh JWT when within 1 hour of expiry
  useEffect(() => {
    function getTokenExpiry(): number | null {
      const token = getAccessToken();
      if (!token) return null;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.exp ? payload.exp * 1000 : null;
      } catch {
        return null;
      }
    }

    const interval = setInterval(async () => {
      const expiry = getTokenExpiry();
      if (!expiry) return;
      const timeLeft = expiry - Date.now();
      // Refresh if within 1 hour of expiry
      if (timeLeft > 0 && timeLeft < 60 * 60 * 1000) {
        try {
          const { access_token } = await api.refreshToken();
          setAccessToken(access_token);
        } catch {
          // Token might already be expired — ignore
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const wrappedSave = useCallback(
    (fields: Record<string, unknown>, immediate = false) => {
      setSupplier((prev) => ({ ...prev, ...fields } as Supplier));
      save(fields, immediate);
    },
    [save]
  );

  const wrappedSetStep = useCallback(
    (step: number) => {
      setCurrentStep(step);
      if (step > maxStepReached) {
        setMaxStepReached(step);
        save({ current_step: step }, true);
      }
    },
    [save, maxStepReached]
  );

  return (
    <SupplierContext.Provider
      value={{
        supplier,
        products,
        payers,
        exclusions,
        serviceAreas,
        corrections,
        currentStep,
        maxStepReached,
        setCurrentStep: wrappedSetStep,
        refreshSupplier,
        refreshProducts,
        refreshPayers,
        refreshExclusions,
        refreshServiceAreas,
        saveStatus,
        save: wrappedSave,
        flush,
      }}
    >
      {children}
    </SupplierContext.Provider>
  );
}
