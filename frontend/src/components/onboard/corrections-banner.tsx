"use client";

import { useSupplier } from "@/hooks/use-supplier";
import { ONBOARDING_STEPS } from "@/types/supplier";
import { AlertTriangle } from "lucide-react";

export function CorrectionsBanner() {
  const { corrections, setCurrentStep } = useSupplier();

  if (corrections.length === 0) return null;

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-orange-600 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
            Corrections Requested
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Please review and address the following items, then resubmit your application.
          </p>
          <div className="space-y-1.5 mt-3">
            {corrections.map((c) => {
              const step = ONBOARDING_STEPS.find((s) => s.number === c.step_number);
              return (
                <button
                  key={c.id}
                  onClick={() => setCurrentStep(c.step_number)}
                  className="flex items-start gap-2 w-full text-left rounded p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                >
                  <span className="shrink-0 rounded bg-orange-200 px-1.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-800 dark:text-orange-200">
                    Step {c.step_number}
                  </span>
                  <span className="text-sm text-orange-700 dark:text-orange-400">
                    {step?.label}: {c.comment}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
