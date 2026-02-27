"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminPassword } from "../../layout";
import { adminApi, type AdminSupplierDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Rocket,
  ClipboardCheck,
} from "lucide-react";

const STEP_LABELS: Record<number, string> = {
  1: "Company Information",
  2: "Tier Selection",
  3: "Product Catalog & Pricing",
  4: "Accepted Payers",
  5: "Payer-Product Exclusions",
  6: "Geographic Service Areas",
  7: "Operations Setup",
  8: "Order Transmittal",
  9: "Stripe Connected Account",
  10: "SLAs & Ways of Working",
  11: "Review & Submit",
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  action_needed: "bg-red-100 text-red-700",
  approved: "bg-green-100 text-green-700",
  live: "bg-emerald-100 text-emerald-800",
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

function CollapsibleSection({
  title,
  stepNumber,
  defaultOpen,
  children,
}: {
  title: string;
  stepNumber: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {stepNumber}
            </span>
            {title}
          </CardTitle>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  );
}

export default function AdminSupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const password = useAdminPassword();
  const router = useRouter();
  const [supplier, setSupplier] = useState<AdminSupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [selectedSteps, setSelectedSteps] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getSupplier(password, id)
      .then(setSupplier)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [password, id]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (
    action: () => Promise<{ id: string; status: string; message: string }>
  ) => {
    setActionLoading(true);
    try {
      await action();
      load();
    } catch {
      // error
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestCorrections = async () => {
    const corrections = Object.entries(selectedSteps)
      .filter(([, comment]) => comment.trim())
      .map(([step, comment]) => ({ step_number: parseInt(step), comment }));
    if (corrections.length === 0 || !reviewerName.trim()) return;

    setActionLoading(true);
    try {
      await adminApi.requestCorrections(password, id, {
        reviewer_name: reviewerName,
        corrections,
      });
      setCorrectionModalOpen(false);
      setSelectedSteps({});
      setReviewerName("");
      load();
    } catch {
      // error
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !supplier) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canClaim = supplier.status === "submitted";
  const canApprove = supplier.status === "submitted" || supplier.status === "under_review";
  const canRequestCorrections = supplier.status === "submitted" || supplier.status === "under_review";
  const canGoLive = supplier.status === "approved";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/admin")}
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </button>
          <h1 className="text-2xl font-semibold">
            {supplier.company_name || "Unnamed Supplier"}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <Badge className={cn("text-xs", STATUS_COLORS[supplier.status] || "")}>
              {supplier.status.replace(/_/g, " ")}
            </Badge>
            <span className="text-sm text-muted-foreground">{supplier.email}</span>
            {supplier.tier && (
              <Badge variant="outline" className="text-xs">
                {supplier.tier === "tier_1" ? "Tier 1 — Marketplace" : "Tier 2 — Referral"}
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canClaim && (
            <Button
              variant="outline"
              onClick={() => handleAction(() => adminApi.claim(password, id))}
              disabled={actionLoading}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Claim for Review
            </Button>
          )}
          {canRequestCorrections && (
            <Button
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => setCorrectionModalOpen(true)}
              disabled={actionLoading}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Request Corrections
            </Button>
          )}
          {canApprove && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleAction(() => adminApi.approve(password, id))}
              disabled={actionLoading}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
          {canGoLive && (
            <Button
              onClick={() => handleAction(() => adminApi.goLive(password, id))}
              disabled={actionLoading}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Mark as Live
            </Button>
          )}
        </div>
      </div>

      {/* Corrections History */}
      {supplier.corrections.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-base text-orange-800">Correction Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {supplier.corrections.map((c) => (
                <div key={c.id} className="flex items-start gap-3 text-sm">
                  <Badge variant="outline" className="shrink-0 text-xs">
                    Step {c.step_number}
                  </Badge>
                  <span className={c.resolved ? "line-through text-muted-foreground" : ""}>
                    {c.comment}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    by {c.created_by}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 */}
      <CollapsibleSection title="Company Information" stepNumber={1} defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" value={supplier.company_name} />
          <Field label="Company Address" value={supplier.company_address} />
          <Field label="Tax ID" value={supplier.tax_id} />
          <Field label="NPI" value={supplier.npi} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Primary Contact</p>
            <Field label="Name" value={supplier.primary_contact_name} />
            <Field label="Email" value={supplier.primary_contact_email} />
            <Field label="Phone" value={supplier.primary_contact_phone} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Escalation Contact</p>
            <Field label="Name" value={supplier.escalation_contact_name} />
            <Field label="Email" value={supplier.escalation_contact_email} />
            <Field label="Phone" value={supplier.escalation_contact_phone} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Step 2 */}
      <CollapsibleSection title="Tier Selection" stepNumber={2}>
        <Field
          label="Selected Tier"
          value={
            supplier.tier === "tier_1"
              ? "Tier 1 — Marketplace Partner"
              : supplier.tier === "tier_2"
              ? "Tier 2 — Referral Partner"
              : null
          }
        />
      </CollapsibleSection>

      {/* Step 3 */}
      <CollapsibleSection title="Product Catalog & Pricing" stepNumber={3}>
        {supplier.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products uploaded.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>HCPCS</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplier.products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell>{p.hcpcs_code || "—"}</TableCell>
                    <TableCell>{p.category || "—"}</TableCell>
                    <TableCell>{p.retail_price != null ? `$${p.retail_price}` : "—"}</TableCell>
                    <TableCell>{p.sku || "—"}</TableCell>
                    <TableCell>{p.manufacturer || "—"}</TableCell>
                    <TableCell>
                      {p.approved_by_supplier ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CollapsibleSection>

      {/* Step 4 */}
      <CollapsibleSection title="Accepted Payers" stepNumber={4}>
        {supplier.payers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payers added.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {supplier.payers.map((p) => (
              <Badge key={p.id} variant="outline">
                {p.payer_name} ({p.network_type})
              </Badge>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Step 5 */}
      <CollapsibleSection title="Payer-Product Exclusions" stepNumber={5}>
        {supplier.exclusions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exclusions configured.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payer</TableHead>
                <TableHead>Product/Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.exclusions.map((e) => {
                const payer = supplier.payers.find((p) => p.id === e.payer_id);
                const product = e.product_id
                  ? supplier.products.find((p) => p.id === e.product_id)
                  : null;
                return (
                  <TableRow key={e.id}>
                    <TableCell>{payer?.payer_name || e.payer_id}</TableCell>
                    <TableCell>
                      {product ? product.product_name : e.category || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CollapsibleSection>

      {/* Step 6 */}
      <CollapsibleSection title="Geographic Service Areas" stepNumber={6}>
        {supplier.service_areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No service areas configured.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead>Cities</TableHead>
                <TableHead>ZIP Codes</TableHead>
                <TableHead>Standard (days)</TableHead>
                <TableHead>Expedited (days)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.service_areas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.state}</TableCell>
                  <TableCell>{a.cities?.join(", ") || "All"}</TableCell>
                  <TableCell>{a.zip_codes?.join(", ") || "All"}</TableCell>
                  <TableCell>{a.standard_delivery_days ?? "—"}</TableCell>
                  <TableCell>{a.expedited_delivery_days ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CollapsibleSection>

      {/* Step 7 */}
      <CollapsibleSection title="Operations Setup" stepNumber={7}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Shipping Fees</p>
            {supplier.shipping_fee_structure ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Free Shipping Threshold" value={supplier.shipping_fee_structure.free_shipping_threshold != null ? `$${supplier.shipping_fee_structure.free_shipping_threshold}` : null} />
                <Field label="Flat Rate" value={supplier.shipping_fee_structure.flat_rate != null ? `$${supplier.shipping_fee_structure.flat_rate}` : null} />
                <Field label="Variable Rates" value={supplier.shipping_fee_structure.is_variable ? "Yes" : "No"} />
                <Field label="Fee Schedule" value={supplier.shipping_fee_structure.fee_schedule as string} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not configured.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Return Policy</p>
            {supplier.return_policy ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Return Window" value={supplier.return_policy.return_window_days != null ? `${supplier.return_policy.return_window_days} days` : null} />
                <Field label="Restocking Fee" value={supplier.return_policy.restocking_fee != null ? `${supplier.return_policy.restocking_fee}${supplier.return_policy.restocking_fee_type === "percentage" ? "%" : " flat"}` : null} />
                <Field label="Return Shipping" value={supplier.return_policy.return_shipping_responsibility as string} />
                <Field label="Conditions" value={(supplier.return_policy.condition_requirements as string[])?.join(", ")} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not configured.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Customer Support</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hours" value={supplier.support_hours} />
              <Field label="Phone" value={supplier.support_phone} />
              <Field label="Email" value={supplier.support_email} />
              <Field label="After-Hours" value={supplier.after_hours_process} />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Step 8 */}
      <CollapsibleSection title="Order Transmittal" stepNumber={8}>
        <Field
          label="Preference"
          value={
            supplier.order_transmittal_preference
              ? supplier.order_transmittal_preference.replace(/_/g, " ")
              : null
          }
        />
        {supplier.transmittal_destination && (
          <Field label="Destination" value={supplier.transmittal_destination} />
        )}
      </CollapsibleSection>

      {/* Step 9 */}
      {supplier.tier === "tier_1" && (
        <CollapsibleSection title="Stripe Connected Account" stepNumber={9}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Stripe Account ID" value={supplier.stripe_account_id} />
            <Field
              label="Onboarding Status"
              value={supplier.stripe_onboarding_complete ? "Complete" : "Incomplete"}
            />
          </div>
        </CollapsibleSection>
      )}

      {/* Step 10 */}
      <CollapsibleSection title="SLAs & Ways of Working" stepNumber={10}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SLA Acknowledged" value={supplier.sla_acknowledged ? "Yes" : "No"} />
          <Field label="Acknowledged By" value={supplier.sla_acknowledged_by} />
          <Field
            label="Acknowledged At"
            value={
              supplier.sla_acknowledged_at
                ? new Date(supplier.sla_acknowledged_at).toLocaleString()
                : null
            }
          />
        </div>
      </CollapsibleSection>

      {/* Request Corrections Modal */}
      <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Corrections</DialogTitle>
            <DialogDescription>
              Select the steps that need corrections and add a comment for each.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Reviewer name"
              />
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(STEP_LABELS).map(([num, label]) => {
                const stepNum = parseInt(num);
                const isSelected = stepNum in selectedSteps;
                return (
                  <div key={stepNum} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`step-${stepNum}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSteps((prev) => ({ ...prev, [stepNum]: "" }));
                          } else {
                            setSelectedSteps((prev) => {
                              const next = { ...prev };
                              delete next[stepNum];
                              return next;
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`step-${stepNum}`} className="text-sm">
                        Step {stepNum}: {label}
                      </Label>
                    </div>
                    {isSelected && (
                      <Textarea
                        value={selectedSteps[stepNum]}
                        onChange={(e) =>
                          setSelectedSteps((prev) => ({
                            ...prev,
                            [stepNum]: e.target.value,
                          }))
                        }
                        placeholder="Explain what needs to change..."
                        className="ml-6 text-sm"
                        rows={2}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestCorrections}
              disabled={
                actionLoading ||
                !reviewerName.trim() ||
                Object.values(selectedSteps).filter((c) => c.trim()).length === 0
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Send Corrections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
