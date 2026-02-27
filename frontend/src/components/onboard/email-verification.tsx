"use client";

import { useState } from "react";
import { api, setAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

interface EmailVerificationProps {
  email: string;
  supplierId: string;
  onVerified: (accessToken: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function EmailVerification({ email, supplierId, onVerified }: EmailVerificationProps) {
  const [step, setStep] = useState<"send" | "verify">("send");
  const [magicLinkToken, setMagicLinkToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSendLink() {
    setLoading(true);
    setError(null);
    try {
      await api.sendMagicLink(email);
      setSent(true);
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send verification link");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!magicLinkToken.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.verifyMagicLink(magicLinkToken.trim());
      setAccessToken(result.access_token);
      onVerified(result.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We need to verify your email before you can continue with onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "send" ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-center text-sm">
                A verification code will be sent to <strong>{email}</strong>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button onClick={handleSendLink} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sent && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Verification code sent to {email}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="magic-link-token">Verification Code</Label>
                <Input
                  id="magic-link-token"
                  placeholder="Paste the code from the email"
                  value={magicLinkToken}
                  onChange={(e) => {
                    setMagicLinkToken(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerify();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Check the server console for the verification code (no real email sent yet).
                </p>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button onClick={handleVerify} disabled={loading || !magicLinkToken.trim()} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={handleSendLink}
                disabled={loading}
                className="w-full"
              >
                Resend Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
