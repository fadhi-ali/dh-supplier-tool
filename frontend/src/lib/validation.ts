/**
 * Shared validation utilities for email and phone fields.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns true if valid or empty (empty handled by required checks separately). */
export function validateEmail(email: string): boolean {
  if (!email.trim()) return true;
  return EMAIL_REGEX.test(email.trim());
}

/** Returns true if valid US phone or empty. Accepts 10 digits or 11 starting with "1". */
export function validatePhone(phone: string): boolean {
  if (!phone.trim()) return true;
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

/** Auto-format a US phone number to (XXX) XXX-XXXX. Returns as-is if not valid length. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return "";
  const normalized =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (normalized.length !== 10) return phone;
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}
