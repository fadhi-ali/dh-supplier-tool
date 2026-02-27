"use client";

import { useSupplier } from "@/hooks/use-supplier";
import { ONBOARDING_STEPS } from "@/types/supplier";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle } from "lucide-react";

export function Sidebar() {
  const { supplier, currentStep, setCurrentStep, corrections } = useSupplier();

  const visibleSteps = ONBOARDING_STEPS.filter(
    (s) => !s.requiresTier1 || supplier?.tier === "tier_1"
  );

  const correctionSteps = new Set(corrections.map((c) => c.step_number));

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/30 lg:block">
      <nav className="flex flex-col gap-1 p-4">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Onboarding Steps
        </p>
        {visibleSteps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const hasCorrection = correctionSteps.has(step.number);
          const isClickable = step.number <= currentStep || hasCorrection;

          return (
            <button
              key={step.number}
              onClick={() => isClickable && setCurrentStep(step.number)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                isCurrent && "bg-primary text-primary-foreground font-medium",
                isCompleted &&
                  !isCurrent &&
                  "text-foreground hover:bg-accent cursor-pointer",
                !isClickable &&
                  !isCurrent &&
                  "text-muted-foreground/50 cursor-not-allowed",
                hasCorrection && !isCurrent && "ring-1 ring-orange-300 bg-orange-50"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  isCurrent && "bg-primary-foreground text-primary",
                  isCompleted &&
                    !isCurrent &&
                    !hasCorrection &&
                    "bg-green-100 text-green-700",
                  hasCorrection &&
                    !isCurrent &&
                    "bg-orange-200 text-orange-700",
                  !isClickable &&
                    !isCurrent &&
                    !hasCorrection &&
                    "bg-muted text-muted-foreground/50"
                )}
              >
                {hasCorrection && !isCurrent ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : isCompleted && !isCurrent ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  step.number
                )}
              </span>
              <span className="truncate">{step.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
