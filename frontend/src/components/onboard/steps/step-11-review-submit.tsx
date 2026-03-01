"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSupplier } from "@/hooks/use-supplier";
import { api } from "@/lib/api";
import { AlertTriangle, Check, Loader2 } from "lucide-react";

type SupplierStatus =
  | "in_progress"
  | "submitted"
  | "under_review"
  | "action_needed"
  | "approved"
  | "live";

const STATUS_PIPELINE: { key: SupplierStatus; label: string }[] = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "action_needed", label: "Action Needed" },
  { key: "approved", label: "Approved" },
  { key: "live", label: "Live" },
];

interface ValidationIssue {
  step: number;
  label: string;
  message: string;
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value || "\u2014"}</span>
    </div>
  );
}

export function Step11ReviewSubmit() {
  const {
    supplier,
    products,
    payers,
    exclusions,
    serviceAreas,
    setCurrentStep,
    refreshSupplier,
  } = useSupplier();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const isTier1 = supplier?.tier === "tier_1";
  const canEdit =
    supplier?.status === "in_progress" || supplier?.status === "action_needed";

  const approvedProducts = products.filter((p) => p.approved_by_supplier);

  // Validate all required fields across all steps
  const validationIssues = useMemo((): ValidationIssue[] => {
    if (!supplier) return [];
    const issues: ValidationIssue[] = [];

    // Step 1: Company Info
    if (!supplier.company_name || !supplier.company_address) {
      issues.push({
        step: 1,
        label: "Company Information",
        message: "Company name and address are required",
      });
    }
    if (!supplier.operations_contact_name || !supplier.operations_contact_email) {
      issues.push({
        step: 1,
        label: "Company Information",
        message: "Operations contact name and email are required",
      });
    }

    // Step 2: Tier
    if (!supplier.tier) {
      issues.push({
        step: 2,
        label: "Tier Selection",
        message: "Please select a partner tier",
      });
    }

    // Step 3: Products
    if (approvedProducts.length === 0) {
      issues.push({
        step: 3,
        label: "Product Catalog",
        message: "At least one product must be uploaded and approved",
      });
    }

    // Step 4: Payers
    if (payers.length === 0) {
      issues.push({
        step: 4,
        label: "Accepted Payers",
        message: "At least one payer must be configured",
      });
    }

    // Step 6: Service Areas
    if (serviceAreas.length === 0) {
      issues.push({
        step: 6,
        label: "Service Areas",
        message: "At least one service area must be configured",
      });
    }

    // Step 7: Operations
    if (!supplier.support_phone && !supplier.support_email) {
      issues.push({
        step: 7,
        label: "Operations Setup",
        message: "Support contact information is required",
      });
    }

    // Step 8: Order Transmittal
    if (!supplier.order_transmittal_preference) {
      issues.push({
        step: 8,
        label: "Order Transmittal",
        message: "Order transmittal preference is required",
      });
    }

    // Step 9: Stripe (Tier 1 only)
    if (isTier1 && !supplier.stripe_onboarding_complete) {
      issues.push({
        step: 9,
        label: "Stripe Setup",
        message: "Stripe onboarding must be completed",
      });
    }

    // Step 10: SLA
    if (!supplier.sla_acknowledged) {
      issues.push({
        step: 10,
        label: "SLAs & Agreements",
        message: "SLA must be acknowledged",
      });
    }

    return issues;
  }, [supplier, approvedProducts.length, payers.length, serviceAreas.length, isTier1]);

  const handleSubmit = useCallback(async () => {
    if (!supplier) return;

    // Show validation issues if any
    if (validationIssues.length > 0) {
      setShowValidation(true);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.submitSupplier(supplier.id);
      await refreshSupplier();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }, [supplier, validationIssues, refreshSupplier]);

  const getStripeStatusBadge = () => {
    if (!supplier) return null;
    if (supplier.stripe_onboarding_complete) {
      return (
        <Badge
          variant="outline"
          className="border-green-500 text-green-600 bg-green-50"
        >
          Complete
        </Badge>
      );
    }
    if (supplier.stripe_account_id) {
      return (
        <Badge
          variant="outline"
          className="border-yellow-500 text-yellow-600 bg-yellow-50"
        >
          In Progress
        </Badge>
      );
    }
    return <Badge variant="secondary">Not Started</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tierLabel =
    supplier?.tier === "tier_1"
      ? "Marketplace Partner"
      : supplier?.tier === "tier_2"
        ? "Referral Partner"
        : "\u2014";

  const transmittalLabel =
    supplier?.order_transmittal_preference === "secure_email"
      ? "Secure Email"
      : supplier?.order_transmittal_preference === "fax"
        ? "Fax"
        : supplier?.order_transmittal_preference === "api"
          ? "API"
          : "\u2014";

  if (!supplier) return null;

  // After submission: show status tracker
  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Application Status
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your onboarding application has been submitted.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status Tracker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Pipeline */}
            <div className="flex items-center gap-0">
              {STATUS_PIPELINE.map((step, index) => {
                const currentIndex = STATUS_PIPELINE.findIndex(
                  (s) => s.key === supplier.status
                );
                const isActive = index <= currentIndex;
                const isCurrent = step.key === supplier.status;

                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCurrent
                            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                            : isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isActive && !isCurrent ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={`text-xs mt-1.5 text-center ${
                          isCurrent
                            ? "font-semibold text-foreground"
                            : isActive
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < STATUS_PIPELINE.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 -mt-5 ${
                          index < currentIndex
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Dates */}
            <div className="space-y-1">
              {supplier.submitted_at && (
                <ReviewRow
                  label="Submitted"
                  value={formatDate(supplier.submitted_at)}
                />
              )}
              {supplier.approved_at && (
                <ReviewRow
                  label="Approved"
                  value={formatDate(supplier.approved_at)}
                />
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => setCurrentStep(10)}
            >
              Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // In progress / action_needed: show review + submit
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Review & Submit
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {supplier.status === "action_needed"
            ? "Please address the requested corrections and resubmit your application."
            : "Review your onboarding information before submitting for review."}
        </p>
      </div>

      {/* Validation Issues */}
      {showValidation && validationIssues.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-red-800">
                  Please fix the following issues before submitting:
                </p>
                <div className="space-y-1.5">
                  {validationIssues.map((issue, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentStep(issue.step)}
                      className="flex items-start gap-2 w-full text-left rounded p-1.5 hover:bg-red-100 transition-colors"
                    >
                      <span className="shrink-0 rounded bg-red-200 px-1.5 py-0.5 text-xs font-medium text-red-800">
                        Step {issue.step}
                      </span>
                      <span className="text-sm text-red-700">
                        {issue.label}: {issue.message}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Company Information</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(1)}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewRow label="Company Name" value={supplier.company_name} />
          <ReviewRow label="Company Address" value={supplier.company_address} />
          <ReviewRow label="Tax ID" value={supplier.tax_id} />
          <ReviewRow label="NPI" value={supplier.npi} />
          <Separator className="my-2" />
          <ReviewRow
            label="Operations Contact"
            value={supplier.operations_contact_name}
          />
          <ReviewRow
            label="Operations Email"
            value={supplier.operations_contact_email}
          />
          <ReviewRow
            label="Operations Phone"
            value={supplier.operations_contact_phone}
          />
          <Separator className="my-2" />
          <ReviewRow
            label="Escalation Contact"
            value={supplier.escalation_contact_name}
          />
          <ReviewRow
            label="Escalation Email"
            value={supplier.escalation_contact_email}
          />
          <ReviewRow
            label="Escalation Phone"
            value={supplier.escalation_contact_phone}
          />
        </CardContent>
      </Card>

      {/* Tier */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Tier</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(2)}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewRow label="Partner Type" value={tierLabel} />
        </CardContent>
      </Card>

      {/* Product Catalog */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Product Catalog</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(3)}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewRow
            label="Products Uploaded"
            value={`${products.length} products uploaded`}
          />
          <ReviewRow
            label="Products Approved"
            value={`${approvedProducts.length} approved`}
          />
        </CardContent>
      </Card>

      {/* Accepted Payers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Accepted Payers</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(4)}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewRow
            label="Payers Configured"
            value={`${payers.length} payers configured`}
          />
        </CardContent>
      </Card>

      {/* Exclusions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Exclusions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(5)}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewRow
            label="Exclusions"
            value={
              exclusions.length > 0
                ? `${exclusions.length} exclusion${exclusions.length === 1 ? "" : "s"}`
                : "No exclusions"
            }
          />
        </CardContent>
      </Card>

      {/* Service Areas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Service Areas</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(6)}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewRow
            label="States Configured"
            value={`${serviceAreas.length} states configured`}
          />
        </CardContent>
      </Card>

      {/* Operations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Operations</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(7)}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewRow label="Support Hours" value={supplier.support_hours} />
          <ReviewRow label="Support Phone" value={supplier.support_phone} />
          <ReviewRow label="Support Email" value={supplier.support_email} />
        </CardContent>
      </Card>

      {/* Order Transmittal */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Order Transmittal</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(8)}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewRow label="Preference" value={transmittalLabel} />
          <ReviewRow
            label="Destination"
            value={supplier.transmittal_destination}
          />
        </CardContent>
      </Card>

      {/* Stripe Setup (Tier 1 only) */}
      {isTier1 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Stripe Setup</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(9)}
            >
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">
                Payment Setup
              </span>
              {getStripeStatusBadge()}
            </div>
            {!supplier.stripe_onboarding_complete && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2">
                <p className="text-sm text-yellow-800">
                  Stripe setup must be completed before submission.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SLA Agreement */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">SLA Agreement</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(10)}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewRow
            label="Acknowledged"
            value={supplier.sla_acknowledged ? "Yes" : "No"}
          />
          <ReviewRow
            label="Acknowledged By"
            value={supplier.sla_acknowledged_by}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Submit Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-800">{submitError}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(10)}
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitting
                ? "Submitting..."
                : supplier.status === "action_needed"
                  ? "Resubmit for Review"
                  : "Submit for Review"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
