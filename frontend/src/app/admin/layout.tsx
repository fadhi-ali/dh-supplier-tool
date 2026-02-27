"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { adminApi } from "@/lib/api";

interface AdminContextValue {
  password: string;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminPassword() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminPassword must be used within AdminLayout");
  return ctx.password;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await adminApi.listSuppliers(input);
      setPassword(input);
      setAuthenticated(true);
    } catch {
      setError("Invalid password");
    } finally {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-pass">Password</Label>
                <Input
                  id="admin-pass"
                  type="password"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                  placeholder="Enter admin password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? "Verifying..." : "Sign In"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ password }}>
      <div className="min-h-screen bg-muted/30">
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-white px-6">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-lg font-semibold tracking-tight">
              Doorbell Health
            </a>
            <span className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              Admin
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}
