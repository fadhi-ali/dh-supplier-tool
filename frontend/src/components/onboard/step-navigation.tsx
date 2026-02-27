"use client";

import { Button } from "@/components/ui/button";
import { useSupplier } from "@/hooks/use-supplier";
import { ONBOARDING_STEPS } from "@/types/supplier";

interface StepNavigationProps {
  onValidate?: () => boolean;
}

export function StepNavigation({ onValidate }: StepNavigationProps) {
  const { supplier, currentStep, setCurrentStep, flush } = useSupplier();

  const visibleSteps = ONBOARDING_STEPS.filter(
    (s) => !s.requiresTier1 || supplier?.tier === "tier_1"
  );

  const currentIndex = visibleSteps.findIndex((s) => s.number === currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === visibleSteps.length - 1;

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(visibleSteps[currentIndex - 1].number);
    }
  };

  const handleContinue = async () => {
    if (onValidate && !onValidate()) return;
    await flush();
    if (!isLast) {
      setCurrentStep(visibleSteps[currentIndex + 1].number);
    }
  };

  return (
    <div className="flex items-center justify-between border-t pt-6 mt-8">
      <Button
        variant="outline"
        onClick={handleBack}
        disabled={isFirst}
      >
        Back
      </Button>
      {!isLast && (
        <Button onClick={handleContinue}>
          Continue
        </Button>
      )}
    </div>
  );
}
