"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { StepNavigation } from "@/components/onboard/step-navigation";
import { useSupplier } from "@/hooks/use-supplier";
import type { ShippingFeeStructure, ReturnPolicy } from "@/types/supplier";

const CONDITION_OPTIONS = ["Unopened", "Defective", "Any Condition"] as const;

export function Step7OperationsSetup() {
  const { supplier, save } = useSupplier();

  const shipping: ShippingFeeStructure = supplier?.shipping_fee_structure ?? {};
  const returnPolicy: ReturnPolicy = supplier?.return_policy ?? {};

  const saveShipping = useCallback(
    (patch: Partial<ShippingFeeStructure>) => {
      save(
        {
          shipping_fee_structure: {
            ...shipping,
            ...patch,
          },
        },
        false
      );
    },
    [save, shipping]
  );

  const saveShippingImmediate = useCallback(
    (patch: Partial<ShippingFeeStructure>) => {
      save(
        {
          shipping_fee_structure: {
            ...shipping,
            ...patch,
          },
        },
        true
      );
    },
    [save, shipping]
  );

  const saveReturnPolicy = useCallback(
    (patch: Partial<ReturnPolicy>) => {
      const updated = { ...returnPolicy, ...patch };
      save({ return_policy: updated }, true);
    },
    [save, returnPolicy]
  );

  const toggleCondition = (condition: string) => {
    const current = returnPolicy.condition_requirements ?? [];
    const updated = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition];
    saveReturnPolicy({ condition_requirements: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Operations Setup
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure your shipping, return, and customer support policies.
        </p>
      </div>

      {/* Card 1: Shipping Fees */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Fees</CardTitle>
          <CardDescription>
            Define your shipping fee structure and thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="free-shipping-threshold">
              Free Shipping Threshold ($)
            </Label>
            <Input
              id="free-shipping-threshold"
              type="number"
              min={0}
              step={0.01}
              placeholder="e.g. 50.00"
              defaultValue={shipping.free_shipping_threshold ?? ""}
              onBlur={(e) =>
                saveShipping({
                  free_shipping_threshold: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Orders above this amount qualify for free shipping.
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Variable Shipping Rates</Label>
              <p className="text-xs text-muted-foreground">
                Toggle off for a single flat rate, or on for variable pricing.
              </p>
            </div>
            <Switch
              checked={shipping.is_variable ?? false}
              onCheckedChange={(checked) =>
                saveShippingImmediate({ is_variable: checked })
              }
            />
          </div>

          {!shipping.is_variable && (
            <div className="space-y-2">
              <Label htmlFor="flat-rate">Flat Rate ($)</Label>
              <Input
                id="flat-rate"
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. 7.99"
                defaultValue={shipping.flat_rate ?? ""}
                onBlur={(e) =>
                  saveShipping({
                    flat_rate: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          )}

          {shipping.is_variable && (
            <div className="space-y-2">
              <Label htmlFor="fee-schedule">Fee Schedule</Label>
              <Textarea
                id="fee-schedule"
                placeholder="Describe your variable shipping fee schedule (e.g. weight-based tiers, zone pricing, etc.)"
                rows={4}
                defaultValue={shipping.fee_schedule ?? ""}
                onBlur={(e) =>
                  saveShipping({ fee_schedule: e.target.value || undefined })
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Return Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Return Policy</CardTitle>
          <CardDescription>
            Set the terms and conditions for product returns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="return-window">Return Window (days)</Label>
              <Input
                id="return-window"
                type="number"
                min={0}
                placeholder="e.g. 30"
                defaultValue={returnPolicy.return_window_days ?? ""}
                onBlur={(e) =>
                  saveReturnPolicy({
                    return_window_days: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restocking-fee">Restocking Fee</Label>
              <div className="flex gap-2">
                <Input
                  id="restocking-fee"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="e.g. 15"
                  defaultValue={returnPolicy.restocking_fee ?? ""}
                  onBlur={(e) =>
                    saveReturnPolicy({
                      restocking_fee: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
                <Select
                  value={returnPolicy.restocking_fee_type ?? "percentage"}
                  onValueChange={(v) =>
                    saveReturnPolicy({
                      restocking_fee_type: v as "percentage" | "flat",
                    })
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="flat">$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Return Shipping Responsibility</Label>
            <Select
              value={returnPolicy.return_shipping_responsibility ?? ""}
              onValueChange={(v) =>
                saveReturnPolicy({
                  return_shipping_responsibility: v as "supplier" | "patient",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select responsibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Condition Requirements</Label>
            <p className="text-xs text-muted-foreground">
              Select which conditions are accepted for returns.
            </p>
            <div className="flex flex-col gap-2">
              {CONDITION_OPTIONS.map((condition) => (
                <label
                  key={condition}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={(
                      returnPolicy.condition_requirements ?? []
                    ).includes(condition)}
                    onCheckedChange={() => toggleCondition(condition)}
                  />
                  <span className="text-sm">{condition}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Customer Support */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Support</CardTitle>
          <CardDescription>
            Provide your support contact details and availability.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-hours">Support Hours</Label>
            <Input
              id="support-hours"
              placeholder="e.g. Mon-Fri 8am-6pm EST"
              defaultValue={supplier?.support_hours ?? ""}
              onBlur={(e) => save({ support_hours: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="support-phone">Phone</Label>
              <Input
                id="support-phone"
                type="tel"
                placeholder="e.g. (555) 123-4567"
                defaultValue={supplier?.support_phone ?? ""}
                onBlur={(e) => save({ support_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">Email</Label>
              <Input
                id="support-email"
                type="email"
                placeholder="e.g. support@company.com"
                defaultValue={supplier?.support_email ?? ""}
                onBlur={(e) => save({ support_email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="after-hours">After-Hours Process</Label>
            <Textarea
              id="after-hours"
              placeholder="Describe what happens when customers reach out outside of support hours."
              rows={3}
              defaultValue={supplier?.after_hours_process ?? ""}
              onBlur={(e) => save({ after_hours_process: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <StepNavigation onValidate={() => {
        const hasEmail = !!supplier?.support_email?.trim();
        const hasPhone = !!supplier?.support_phone?.trim();
        if (!hasEmail && !hasPhone) {
          toast.error("Please provide at least a support email or phone number.");
          return false;
        }
        return true;
      }} />
    </div>
  );
}
