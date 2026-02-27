"use client";

import { useSupplier } from "@/hooks/use-supplier";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

export function TopBar() {
  const { supplier, saveStatus } = useSupplier();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold tracking-tight">
          Doorbell Health
        </span>
        {supplier?.company_name && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">
              {supplier.company_name}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            <span>All changes saved</span>
          </>
        )}
        {saveStatus === "error" && (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            <span>Save failed</span>
          </>
        )}
      </div>
    </header>
  );
}
