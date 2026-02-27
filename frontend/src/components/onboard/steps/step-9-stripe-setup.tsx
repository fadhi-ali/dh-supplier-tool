"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepNavigation } from "@/components/onboard/step-navigation";
import { useSupplier } from "@/hooks/use-supplier";
import { api } from "@/lib/api";
import { Check, Loader2 } from "lucide-react";

type StripeState = "not_started" | "in_progress" | "complete";

export function Step9StripeSetup() {
  const { supplier, refreshSupplier } = useSupplier();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTier2 = supplier?.tier === "tier_2";

  const getStripeStatus = useCallback((): StripeState => {
    if (!supplier) return "not_started";
    if (supplier.stripe_onboarding_complete) return "complete";
    if (supplier.stripe_account_id) return "in_progress";
    return "not_started";
  }, [supplier]);

  const stripeStatus = getStripeStatus();

  // Poll check-status every 5 seconds while step is active and not complete
  useEffect(() => {
    if (isTier2 || !supplier?.id || stripeStatus === "complete") return;

    const poll = async () => {
      try {
        const result = await api.checkStripeStatus(supplier.id);
        if (result.onboarding_complete) {
          await refreshSupplier();
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [supplier?.id, isTier2, stripeStatus, refreshSupplier]);

  const handleSetupStripe = useCallback(async () => {
    if (!supplier?.id) return;
    setLoading(true);
    try {
      const { url } = await api.createStripeAccountLink(supplier.id);
      window.open(url, "_blank");
      // Refresh to pick up the new stripe_account_id
      await refreshSupplier();
    } catch (err) {
      console.error("Failed to create Stripe account link:", err);
    } finally {
      setLoading(false);
    }
  }, [supplier?.id, refreshSupplier]);

  const handleCheckStatus = useCallback(async () => {
    if (!supplier?.id) return;
    setChecking(true);
    try {
      const result = await api.checkStripeStatus(supplier.id);
      if (result.onboarding_complete) {
        await refreshSupplier();
      }
    } catch (err) {
      console.error("Failed to check Stripe status:", err);
    } finally {
      setChecking(false);
    }
  }, [supplier?.id, refreshSupplier]);

  if (isTier2) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Stripe Connected Account
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Payment processing setup.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              This step is not required for Referral Partners. Click Continue to
              proceed.
            </p>
          </CardContent>
        </Card>

        <StepNavigation />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Stripe Connected Account
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set up payment processing for your marketplace orders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Setup</CardTitle>
          <CardDescription>
            To receive payments for orders transacted through the Doorbell
            marketplace, you&apos;ll need to set up a Stripe Connected Account.
            This allows us to securely route payments directly to your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Status:</span>
            {stripeStatus === "not_started" && (
              <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
                Not Started
              </Badge>
            )}
            {stripeStatus === "in_progress" && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50">
                In Progress
              </Badge>
            )}
            {stripeStatus === "complete" && (
              <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
                <Check className="w-3.5 h-3.5 mr-1" />
                Complete
              </Badge>
            )}
          </div>

          {stripeStatus === "complete" ? (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Stripe setup is complete! Payment processing is ready.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Button onClick={handleSetupStripe} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {stripeStatus === "not_started"
                    ? "Set Up Stripe Account"
                    : "Continue Stripe Setup"}
                </Button>
                {stripeStatus === "in_progress" && (
                  <Button
                    variant="outline"
                    onClick={handleCheckStatus}
                    disabled={checking}
                  >
                    {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Check Status
                  </Button>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Clicking the button will open Stripe in a new tab. Complete the setup
                there and return here — we&apos;ll detect your status automatically.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <StepNavigation />
    </div>
  );
}
