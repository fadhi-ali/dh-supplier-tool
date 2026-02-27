"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Supplier Self-Service Portal
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Welcome to the DH Self-Service Supplier Tool. Manage your supplier
            information, submit documents, and track requests — all in one
            place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Enter your invite token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && token.trim()) {
                  router.push(`/onboard/${token.trim()}`);
                }
              }}
            />
            <Button
              size="lg"
              onClick={() => {
                if (token.trim()) {
                  router.push(`/onboard/${token.trim()}`);
                }
              }}
            >
              Get Started
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter the invite token from your onboarding email, or use the full link provided.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
