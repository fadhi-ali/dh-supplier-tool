"use client";

import { useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StepNavigation } from "@/components/onboard/step-navigation";
import { useSupplier } from "@/hooks/use-supplier";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    value: "tier_1" as const,
    title: "Marketplace Partner",
    description:
      "Doorbell transacts orders through our marketplace. Requires Stripe Connected Account setup.",
    features: [
      "Doorbell handles patient checkout",
      "Integrated payment processing via Stripe",
      "Marketplace visibility and traffic",
      "Automated order management",
    ],
  },
  {
    value: "tier_2" as const,
    title: "Referral Partner",
    description:
      "You own the transaction. Doorbell packages and sends you the order packet.",
    features: [
      "You handle patient billing directly",
      "Receive order packets from Doorbell",
      "Maintain your existing payment flow",
      "Flexible transaction management",
    ],
  },
];

export function Step2TierSelection() {
  const { supplier, save } = useSupplier();

  const selectedTier = supplier?.tier ?? null;

  const handleSelect = useCallback(
    (tier: "tier_1" | "tier_2") => {
      save({ tier }, true);
    },
    [save]
  );

  const onValidate = useCallback((): boolean => {
    return selectedTier !== null;
  }, [selectedTier]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Tier Selection
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you want to partner with Doorbell Health.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {TIERS.map((tier) => {
          const isSelected = selectedTier === tier.value;

          return (
            <Card
              key={tier.value}
              className={cn(
                "relative cursor-pointer transition-all hover:shadow-md",
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-muted-foreground/50"
              )}
              onClick={() => handleSelect(tier.value)}
            >
              {isSelected && (
                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{tier.title}</CardTitle>
                <CardDescription className="text-sm">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!selectedTier && (
        <p className="text-sm text-muted-foreground text-center">
          Please select a tier to continue.
        </p>
      )}

      <StepNavigation onValidate={onValidate} />
    </div>
  );
}
