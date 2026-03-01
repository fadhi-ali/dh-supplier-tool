"use client";

import { Mail, Phone, Code } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StepNavigation } from "@/components/onboard/step-navigation";
import { useSupplier } from "@/hooks/use-supplier";

type TransmittalPreference = "secure_email" | "fax" | "api";

interface TransmittalOption {
  value: TransmittalPreference;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const TRANSMITTAL_OPTIONS: TransmittalOption[] = [
  {
    value: "secure_email",
    label: "Secure Email",
    description:
      "Receive orders via encrypted email. You will need to provide a dedicated email address.",
    icon: <Mail className="h-6 w-6" />,
  },
  {
    value: "fax",
    label: "Fax",
    description:
      "Receive orders via fax transmission. You will need to provide a fax number.",
    icon: <Phone className="h-6 w-6" />,
  },
  {
    value: "api",
    label: "API Integration",
    description:
      "Connect directly to our platform via API for real-time order processing.",
    icon: <Code className="h-6 w-6" />,
  },
];

export function Step8OrderTransmittal() {
  const { supplier, save } = useSupplier();

  const selectedPreference = supplier?.order_transmittal_preference ?? null;
  const transmittalDestination = supplier?.transmittal_destination ?? "";

  const handleSelectPreference = (value: TransmittalPreference) => {
    const fields: Record<string, unknown> = { order_transmittal_preference: value };
    if (value === "api") {
      fields.transmittal_destination = "";
    }
    save(fields, true);
  };

  const validate = (): boolean => {
    if (!selectedPreference) return false;
    if (
      (selectedPreference === "secure_email" ||
        selectedPreference === "fax") &&
      !transmittalDestination?.trim()
    ) {
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Order Transmittal Preference
        </h2>
        <p className="text-muted-foreground mt-1">
          Choose how you would like to receive orders from our platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TRANSMITTAL_OPTIONS.map((option) => {
          const isSelected = selectedPreference === option.value;
          return (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? "border-primary border-2 shadow-md"
                  : "hover:border-muted-foreground/30"
              }`}
              onClick={() => handleSelectPreference(option.value)}
            >
              <CardHeader className="text-center pb-2">
                <div
                  className={`mx-auto mb-2 rounded-full p-3 ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {option.icon}
                </div>
                <CardTitle className="text-lg">{option.label}</CardTitle>
                {isSelected && (
                  <Badge className="mx-auto w-fit">Selected</Badge>
                )}
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  {option.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedPreference === "secure_email" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Address for Orders</CardTitle>
            <CardDescription>
              Provide the email address where order notifications should be sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="transmittal-email">Email Address</Label>
              <Input
                id="transmittal-email"
                type="email"
                placeholder="orders@yourcompany.com"
                defaultValue={transmittalDestination}
                onBlur={(e) =>
                  save({ transmittal_destination: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPreference === "fax" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fax Number for Orders</CardTitle>
            <CardDescription>
              Provide the fax number where orders should be transmitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="transmittal-fax">Fax Number</Label>
              <Input
                id="transmittal-fax"
                type="tel"
                placeholder="(555) 123-4567"
                defaultValue={transmittalDestination}
                onBlur={(e) =>
                  save({ transmittal_destination: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPreference === "api" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Code className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                Our engineering team will reach out to set up your API
                integration after onboarding is complete.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <StepNavigation onValidate={validate} />
    </div>
  );
}
