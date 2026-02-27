"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StepNavigation } from "@/components/onboard/step-navigation";
import { useSupplier } from "@/hooks/use-supplier";

export function Step10Sla() {
  const { supplier, save } = useSupplier();

  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgedBy, setAcknowledgedBy] = useState("");

  useEffect(() => {
    if (!supplier) return;
    setAcknowledged(supplier.sla_acknowledged ?? false);
    setAcknowledgedBy(supplier.sla_acknowledged_by ?? "");
  }, [supplier]);

  const handleAcknowledgedChange = (checked: boolean) => {
    setAcknowledged(checked);
    save({ sla_acknowledged: checked }, true);
  };

  const handleAcknowledgedByBlur = () => {
    save({ sla_acknowledged_by: acknowledgedBy });
  };

  const onValidate = useCallback((): boolean => {
    return acknowledged && acknowledgedBy.trim().length > 0;
  }, [acknowledged, acknowledgedBy]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          SLAs & Ways of Working
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and acknowledge the service level expectations for working with
          Doorbell Health.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Level Agreement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-6 pr-4">
              {/* Order Processing */}
              <div>
                <h3 className="text-base font-semibold mb-2">
                  Order Processing
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    All orders must be acknowledged within 2 business hours of
                    receipt
                  </li>
                  <li>
                    Orders must be fulfilled and shipped within 24 hours
                    (standard) or 4 hours (expedited)
                  </li>
                  <li>
                    Order accuracy rate must be maintained at 98% or higher
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Delivery Standards */}
              <div>
                <h3 className="text-base font-semibold mb-2">
                  Delivery Standards
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    Standard delivery within the timeframes specified in your
                    Service Area configuration
                  </li>
                  <li>
                    Expedited delivery within the timeframes specified in your
                    Service Area configuration
                  </li>
                  <li>
                    All shipments must include tracking information
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Communication Standards */}
              <div>
                <h3 className="text-base font-semibold mb-2">
                  Communication Standards
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    Respond to Doorbell Health communications within 4 business
                    hours
                  </li>
                  <li>
                    Provide proactive updates on any order delays or issues
                  </li>
                  <li>
                    Maintain updated contact information for primary and
                    escalation contacts
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Quality & Compliance */}
              <div>
                <h3 className="text-base font-semibold mb-2">
                  Quality & Compliance
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    All products must meet manufacturer specifications and
                    applicable regulatory requirements
                  </li>
                  <li>
                    Maintain proper storage conditions for all medical supplies
                  </li>
                  <li>
                    Report any product recalls or safety issues immediately
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Escalation Pathways */}
              <div>
                <h3 className="text-base font-semibold mb-2">
                  Escalation Pathways
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    Level 1: Primary contact for routine issues
                  </li>
                  <li>
                    Level 2: Escalation contact for unresolved issues (within 4
                    hours)
                  </li>
                  <li>
                    Level 3: Doorbell Health account manager involvement (within
                    24 hours)
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Performance Reviews */}
              <div>
                <h3 className="text-base font-semibold mb-2">
                  Performance Reviews
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    Quarterly performance reviews based on order accuracy,
                    fulfillment speed, and customer satisfaction
                  </li>
                  <li>
                    Action plans required for any metric falling below agreed
                    thresholds
                  </li>
                  <li>
                    Annual contract review with updated terms as needed
                  </li>
                </ul>
              </div>
            </div>
          </ScrollArea>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="sla_acknowledged"
                checked={acknowledged}
                onCheckedChange={(checked) =>
                  handleAcknowledgedChange(checked === true)
                }
              />
              <Label
                htmlFor="sla_acknowledged"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I have read and agree to the above service level expectations
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sla_acknowledged_by">
                Full Name (Digital Signature){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sla_acknowledged_by"
                value={acknowledgedBy}
                onChange={(e) => setAcknowledgedBy(e.target.value)}
                onBlur={handleAcknowledgedByBlur}
                placeholder="Enter your full name"
              />
            </div>

            {!acknowledged && acknowledgedBy.trim().length > 0 && (
              <p className="text-sm text-destructive">
                You must check the agreement box above to proceed.
              </p>
            )}
            {acknowledged && acknowledgedBy.trim().length === 0 && (
              <p className="text-sm text-destructive">
                Please enter your full name as a digital signature.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <StepNavigation onValidate={onValidate} />
    </div>
  );
}
