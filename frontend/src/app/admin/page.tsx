"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminPassword } from "./layout";
import { adminApi } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "action_needed", label: "Action Needed" },
  { value: "approved", label: "Approved" },
  { value: "live", label: "Live" },
];

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  action_needed: "bg-red-100 text-red-700",
  approved: "bg-green-100 text-green-700",
  live: "bg-emerald-100 text-emerald-800",
};

interface SupplierRow {
  id: string;
  company_name: string | null;
  operations_contact_name: string | null;
  operations_contact_email: string | null;
  tier: string | null;
  status: string;
  current_step: number;
  submitted_at: string | null;
  updated_at: string;
}

export default function AdminPage() {
  const password = useAdminPassword();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 25;

  // Invite state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ invite_token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function loadSuppliers() {
    setLoading(true);
    adminApi
      .listSuppliers(password, activeTab, PAGE_SIZE, page * PAGE_SIZE)
      .then((data) => {
        setSuppliers(data.suppliers);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, activeTab, page]);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      const result = await adminApi.inviteSupplier(password, inviteEmail.trim());
      setInviteResult(result);
      loadSuppliers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setInviteLoading(false);
    }
  }

  function getInviteLink() {
    if (!inviteResult) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/onboard/${inviteResult.invite_token}`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(getInviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function resetInvite() {
    setShowInvite(false);
    setInviteEmail("");
    setInviteError(null);
    setInviteResult(null);
    setCopied(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Supplier Submissions
        </h1>
        <Button onClick={() => { resetInvite(); setShowInvite(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Invite Supplier
        </Button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite New Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            {inviteResult ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Invite created. Share this link with the supplier:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm break-all">
                    {getInviteLink()}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={resetInvite}>
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="supplier@company.com"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                  />
                  <Button onClick={handleInvite} disabled={inviteLoading}>
                    {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Invite"}
                  </Button>
                </div>
                {inviteError && (
                  <p className="text-sm text-destructive">{inviteError}</p>
                )}
                <Button variant="ghost" size="sm" onClick={resetInvite}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setPage(0); }}
            className={cn(
              "whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          No suppliers found{activeTab !== "all" ? ` with status "${activeTab.replace(/_/g, " ")}"` : ""}.
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Operations Contact</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/admin/suppliers/${s.id}`)}
                >
                  <TableCell className="font-medium">
                    {s.company_name || "—"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{s.operations_contact_name || "—"}</p>
                      {s.operations_contact_email && (
                        <p className="text-xs text-muted-foreground">{s.operations_contact_email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.tier ? (
                      <Badge variant="outline" className="text-xs">
                        {s.tier === "tier_1" ? "Tier 1" : "Tier 2"}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs", STATUS_COLORS[s.status] || "")}>
                      {s.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.submitted_at
                      ? new Date(s.submitted_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.updated_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
