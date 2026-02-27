"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, getAccessToken, setAccessToken } from "@/lib/api";
import type { Supplier } from "@/types/supplier";
import { SupplierProvider } from "@/components/onboard/supplier-provider";
import { EmailVerification } from "@/components/onboard/email-verification";
import { TopBar } from "@/components/onboard/top-bar";
import { Sidebar } from "@/components/onboard/sidebar";
import { AiAssistantButton } from "@/components/onboard/ai-assistant-button";
import { CorrectionsBanner } from "@/components/onboard/corrections-banner";
import { StepRenderer } from "@/components/onboard/step-renderer";
import { Loader2 } from "lucide-react";

type PageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "verify_email"; email: string; supplierId: string }
  | { kind: "ready"; supplier: Supplier };

export default function OnboardPage() {
  const params = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ kind: "loading" });

  const loadSupplier = useCallback(async (supplierId: string) => {
    const data = await api.getSupplier(supplierId);
    setState({ kind: "ready", supplier: data });
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const ctx = await api.verifyToken(params.token);

        if (!ctx.email_verified) {
          setState({
            kind: "verify_email",
            email: ctx.email,
            supplierId: ctx.supplier_id,
          });
          return;
        }

        // If verify-token returned a JWT, store it
        if (ctx.access_token) {
          setAccessToken(ctx.access_token);
        }

        // Try loading with JWT (either existing or just-received)
        const token = getAccessToken();
        if (token) {
          try {
            await loadSupplier(ctx.supplier_id);
            return;
          } catch {
            // Token expired or invalid, need to re-verify
          }
        }

        // No valid JWT — send magic link to get one
        setState({
          kind: "verify_email",
          email: ctx.email,
          supplierId: ctx.supplier_id,
        });
      } catch (e) {
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Invalid invite link",
        });
      }
    }
    load();
  }, [params.token, loadSupplier]);

  if (state.kind === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-semibold">Invalid Invite Link</h1>
        <p className="text-muted-foreground">
          {state.message || "This invite link is not valid or has expired."}
        </p>
      </div>
    );
  }

  if (state.kind === "verify_email") {
    return (
      <EmailVerification
        email={state.email}
        supplierId={state.supplierId}
        onVerified={async () => {
          try {
            await loadSupplier(state.supplierId);
          } catch (e) {
            setState({
              kind: "error",
              message: e instanceof Error ? e.message : "Failed to load supplier data",
            });
          }
        }}
      />
    );
  }

  return (
    <SupplierProvider initialSupplier={state.supplier}>
      <div className="flex h-screen flex-col">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="mx-auto max-w-3xl space-y-6">
              <CorrectionsBanner />
              <StepRenderer />
            </div>
          </main>
        </div>
        <AiAssistantButton />
      </div>
    </SupplierProvider>
  );
}
