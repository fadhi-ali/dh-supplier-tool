import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supplier Onboarding — Doorbell Health",
  description: "Complete your supplier onboarding for Doorbell Health",
};

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
