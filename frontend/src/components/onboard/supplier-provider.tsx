"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SupplierContext, type CorrectionNote } from "@/hooks/use-supplier";
import { useAutoSave } from "@/hooks/use-auto-save";
import { api } from "@/lib/api";
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
      save({ current_step: step }, true);
    },
    [save]
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
