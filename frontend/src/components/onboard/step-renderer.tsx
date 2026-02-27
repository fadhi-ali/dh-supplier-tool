"use client";

import { useSupplier } from "@/hooks/use-supplier";
import { Step1CompanyInfo } from "./steps/step-1-company-info";
import { Step2TierSelection } from "./steps/step-2-tier-selection";
import { Step3ProductCatalog } from "./steps/step-3-product-catalog";
import { Step4AcceptedPayers } from "./steps/step-4-accepted-payers";
import { Step5PayerExclusions } from "./steps/step-5-payer-exclusions";
import { Step6ServiceAreas } from "./steps/step-6-service-areas";
import { Step7OperationsSetup } from "./steps/step-7-operations-setup";
import { Step8OrderTransmittal } from "./steps/step-8-order-transmittal";
import { Step9StripeSetup } from "./steps/step-9-stripe-setup";
import { Step10Sla } from "./steps/step-10-sla";
import { Step11ReviewSubmit } from "./steps/step-11-review-submit";

export function StepRenderer() {
  const { currentStep } = useSupplier();

  switch (currentStep) {
    case 1:
      return <Step1CompanyInfo />;
    case 2:
      return <Step2TierSelection />;
    case 3:
      return <Step3ProductCatalog />;
    case 4:
      return <Step4AcceptedPayers />;
    case 5:
      return <Step5PayerExclusions />;
    case 6:
      return <Step6ServiceAreas />;
    case 7:
      return <Step7OperationsSetup />;
    case 8:
      return <Step8OrderTransmittal />;
    case 9:
      return <Step9StripeSetup />;
    case 10:
      return <Step10Sla />;
    case 11:
      return <Step11ReviewSubmit />;
    default:
      return <Step1CompanyInfo />;
  }
}
