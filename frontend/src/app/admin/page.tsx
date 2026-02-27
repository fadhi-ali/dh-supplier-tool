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
import { Loader2 } from "lucide-react";
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
  primary_contact_name: string | null;
  primary_contact_email: string | null;
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

  useEffect(() => {
    setLoading(true);
    adminApi
      .listSuppliers(password, activeTab)
      .then((data) => setSuppliers(data.suppliers))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [password, activeTab]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Supplier Submissions
      </h1>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
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
                <TableHead>Primary Contact</TableHead>
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
                      <p className="text-sm">{s.primary_contact_name || "—"}</p>
                      {s.primary_contact_email && (
                        <p className="text-xs text-muted-foreground">{s.primary_contact_email}</p>
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
        </div>
      )}
    </div>
  );
}
