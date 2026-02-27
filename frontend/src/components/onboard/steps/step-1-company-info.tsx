"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepNavigation } from "@/components/onboard/step-navigation";
import { useSupplier } from "@/hooks/use-supplier";

interface FieldErrors {
  company_name?: string;
  tax_id?: string;
  npi?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  escalation_contact_email?: string;
}

export function Step1CompanyInfo() {
  const { supplier, save } = useSupplier();

  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [npi, setNpi] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactTitle, setPrimaryContactTitle] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
  const [escalationContactName, setEscalationContactName] = useState("");
  const [escalationContactEmail, setEscalationContactEmail] = useState("");
  const [escalationContactPhone, setEscalationContactPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // Sync from supplier when it changes
  useEffect(() => {
    if (!supplier) return;
    setCompanyName(supplier.company_name ?? "");
    setCompanyAddress(supplier.company_address ?? "");
    setTaxId(formatTaxId(supplier.tax_id ?? ""));
    setNpi(supplier.npi ?? "");
    setPrimaryContactName(supplier.primary_contact_name ?? "");
    setPrimaryContactTitle(supplier.primary_contact_title ?? "");
    setPrimaryContactEmail(supplier.primary_contact_email ?? "");
    setPrimaryContactPhone(supplier.primary_contact_phone ?? "");
    setEscalationContactName(supplier.escalation_contact_name ?? "");
    setEscalationContactEmail(supplier.escalation_contact_email ?? "");
    setEscalationContactPhone(supplier.escalation_contact_phone ?? "");
  }, [supplier]);

  // Format Tax ID: XX-XXXXXXX
  function formatTaxId(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  // Strip formatting for storage
  function stripTaxId(value: string): string {
    return value.replace(/\D/g, "");
  }

  function handleTaxIdChange(value: string) {
    const formatted = formatTaxId(value);
    setTaxId(formatted);
    if (errors.tax_id) {
      setErrors((prev) => ({ ...prev, tax_id: undefined }));
    }
  }

  function handleNpiChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setNpi(digits);
    if (errors.npi) {
      setErrors((prev) => ({ ...prev, npi: undefined }));
    }
  }

  function validateEmail(email: string): boolean {
    return email.includes("@");
  }

  function validateField(field: keyof FieldErrors, value: string) {
    const newErrors = { ...errors };

    switch (field) {
      case "tax_id": {
        const digits = stripTaxId(value);
        if (digits.length > 0 && digits.length !== 9) {
          newErrors.tax_id = "Tax ID must be 9 digits (XX-XXXXXXX)";
        } else {
          newErrors.tax_id = undefined;
        }
        break;
      }
      case "npi":
        if (value.length > 0 && value.length !== 10) {
          newErrors.npi = "NPI must be 10 digits";
        } else {
          newErrors.npi = undefined;
        }
        break;
      case "primary_contact_email":
        if (value.length > 0 && !validateEmail(value)) {
          newErrors.primary_contact_email = "Please enter a valid email address";
        } else {
          newErrors.primary_contact_email = undefined;
        }
        break;
      case "escalation_contact_email":
        if (value.length > 0 && !validateEmail(value)) {
          newErrors.escalation_contact_email = "Please enter a valid email address";
        } else {
          newErrors.escalation_contact_email = undefined;
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
  }

  const handleBlur = useCallback(
    (field: string, value: string) => {
      save({ [field]: value });
    },
    [save]
  );

  const onValidate = useCallback((): boolean => {
    const newErrors: FieldErrors = {};

    if (!companyName.trim()) {
      newErrors.company_name = "Company name is required";
    }

    const taxDigits = stripTaxId(taxId);
    if (!taxDigits) {
      newErrors.tax_id = "Tax ID is required";
    } else if (taxDigits.length !== 9) {
      newErrors.tax_id = "Tax ID must be 9 digits (XX-XXXXXXX)";
    }

    if (!npi) {
      newErrors.npi = "NPI is required";
    } else if (npi.length !== 10) {
      newErrors.npi = "NPI must be 10 digits";
    }

    if (!primaryContactName.trim()) {
      newErrors.primary_contact_name = "Primary contact name is required";
    }

    if (!primaryContactEmail.trim()) {
      newErrors.primary_contact_email = "Primary contact email is required";
    } else if (!validateEmail(primaryContactEmail)) {
      newErrors.primary_contact_email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((v) => v === undefined);
  }, [companyName, taxId, npi, primaryContactName, primaryContactEmail]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Company Information
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide your company details and contact information.
        </p>
      </div>

      {/* Company Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company_name"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (errors.company_name) {
                  setErrors((prev) => ({ ...prev, company_name: undefined }));
                }
              }}
              onBlur={() => handleBlur("company_name", companyName)}
              placeholder="Enter your company name"
            />
            {errors.company_name && (
              <p className="text-sm text-destructive">{errors.company_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_address">Company Address</Label>
            <Textarea
              id="company_address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              onBlur={() => handleBlur("company_address", companyAddress)}
              placeholder="Street address, City, State, ZIP"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax_id">
                Tax ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tax_id"
                value={taxId}
                onChange={(e) => handleTaxIdChange(e.target.value)}
                onBlur={() => {
                  validateField("tax_id", taxId);
                  handleBlur("tax_id", stripTaxId(taxId));
                }}
                placeholder="XX-XXXXXXX"
              />
              {errors.tax_id && (
                <p className="text-sm text-destructive">{errors.tax_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="npi">
                NPI <span className="text-destructive">*</span>
              </Label>
              <Input
                id="npi"
                value={npi}
                onChange={(e) => handleNpiChange(e.target.value)}
                onBlur={() => {
                  validateField("npi", npi);
                  handleBlur("npi", npi);
                }}
                placeholder="10-digit NPI number"
              />
              {errors.npi && (
                <p className="text-sm text-destructive">{errors.npi}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Contact Card */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary_contact_name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="primary_contact_name"
              value={primaryContactName}
              onChange={(e) => {
                setPrimaryContactName(e.target.value);
                if (errors.primary_contact_name) {
                  setErrors((prev) => ({
                    ...prev,
                    primary_contact_name: undefined,
                  }));
                }
              }}
              onBlur={() =>
                handleBlur("primary_contact_name", primaryContactName)
              }
              placeholder="Full name"
            />
            {errors.primary_contact_name && (
              <p className="text-sm text-destructive">
                {errors.primary_contact_name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary_contact_title">Title</Label>
            <Input
              id="primary_contact_title"
              value={primaryContactTitle}
              onChange={(e) => setPrimaryContactTitle(e.target.value)}
              onBlur={() =>
                handleBlur("primary_contact_title", primaryContactTitle)
              }
              placeholder="e.g. CEO, Operations Manager"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary_contact_email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="primary_contact_email"
                type="email"
                value={primaryContactEmail}
                onChange={(e) => {
                  setPrimaryContactEmail(e.target.value);
                  if (errors.primary_contact_email) {
                    setErrors((prev) => ({
                      ...prev,
                      primary_contact_email: undefined,
                    }));
                  }
                }}
                onBlur={() => {
                  validateField("primary_contact_email", primaryContactEmail);
                  handleBlur("primary_contact_email", primaryContactEmail);
                }}
                placeholder="email@company.com"
              />
              {errors.primary_contact_email && (
                <p className="text-sm text-destructive">
                  {errors.primary_contact_email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_contact_phone">Phone</Label>
              <Input
                id="primary_contact_phone"
                type="tel"
                value={primaryContactPhone}
                onChange={(e) => setPrimaryContactPhone(e.target.value)}
                onBlur={() =>
                  handleBlur("primary_contact_phone", primaryContactPhone)
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escalation Contact Card */}
      <Card>
        <CardHeader>
          <CardTitle>Escalation Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="escalation_contact_name">Name</Label>
            <Input
              id="escalation_contact_name"
              value={escalationContactName}
              onChange={(e) => setEscalationContactName(e.target.value)}
              onBlur={() =>
                handleBlur("escalation_contact_name", escalationContactName)
              }
              placeholder="Full name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="escalation_contact_email">Email</Label>
              <Input
                id="escalation_contact_email"
                type="email"
                value={escalationContactEmail}
                onChange={(e) => {
                  setEscalationContactEmail(e.target.value);
                  if (errors.escalation_contact_email) {
                    setErrors((prev) => ({
                      ...prev,
                      escalation_contact_email: undefined,
                    }));
                  }
                }}
                onBlur={() => {
                  validateField(
                    "escalation_contact_email",
                    escalationContactEmail
                  );
                  handleBlur(
                    "escalation_contact_email",
                    escalationContactEmail
                  );
                }}
                placeholder="email@company.com"
              />
              {errors.escalation_contact_email && (
                <p className="text-sm text-destructive">
                  {errors.escalation_contact_email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="escalation_contact_phone">Phone</Label>
              <Input
                id="escalation_contact_phone"
                type="tel"
                value={escalationContactPhone}
                onChange={(e) => setEscalationContactPhone(e.target.value)}
                onBlur={() =>
                  handleBlur(
                    "escalation_contact_phone",
                    escalationContactPhone
                  )
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <StepNavigation onValidate={onValidate} />
    </div>
  );
}
