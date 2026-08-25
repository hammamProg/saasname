const DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export const RESEND_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "eu-west-1", label: "EU West (Ireland)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
] as const;

export type ResendRegion = (typeof RESEND_REGIONS)[number]["value"];

export function normalizeResendDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export function isValidResendDomain(value: string): boolean {
  const domain = normalizeResendDomain(value);
  return DOMAIN_PATTERN.test(domain);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function buildResendFromEmail(fromName: string, domain: string): string {
  const safeName = fromName.trim() || "ShipNow";
  const safeDomain = normalizeResendDomain(domain);
  return `${safeName} <noreply@${safeDomain}>`;
}
