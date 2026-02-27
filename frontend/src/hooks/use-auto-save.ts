"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave(supplierId: string | undefined) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, unknown>>({});

  const flush = useCallback(async () => {
    if (!supplierId || Object.keys(pendingRef.current).length === 0) return;
    const data = { ...pendingRef.current };
    pendingRef.current = {};
    setSaveStatus("saving");
    try {
      await api.updateSupplier(supplierId, data);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [supplierId]);

  const save = useCallback(
    (fields: Record<string, unknown>, immediate = false) => {
      pendingRef.current = { ...pendingRef.current, ...fields };
      if (timerRef.current) clearTimeout(timerRef.current);
      if (immediate) {
        flush();
      } else {
        timerRef.current = setTimeout(flush, 500);
      }
    },
    [flush]
  );

  return { save, saveStatus, flush };
}
