/** Domain normalization for tracked sites.
 *
 *  The stored form is the comparison key used at two points that must agree:
 *  the uniqueness constraint on a user's sites, and the hostname check ingest
 *  runs before accepting a beacon. Normalizing in one place is what keeps
 *  "example.com" and "https://www.Example.com/" from becoming two sites that
 *  each reject the other's traffic. */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** Hostname labels: alphanumeric, inner hyphens, dot-separated, and a TLD of
 *  at least two letters. Deliberately stricter than the RFC — this is a
 *  paste-validation aid, not a resolver. */
const HOSTNAME = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Normalize a user-supplied site address to a bare hostname.
 *
 *  Accepts what people actually paste — a full URL from the address bar, a
 *  `www.` prefix, a trailing path — and returns the hostname alone.
 *
 *  @throws {DomainError} when the value cannot be a public site hostname. */
export function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    throw new DomainError("Enter a domain.");
  }

  // A scheme, a path, a query or a port are all stripped by parsing. The
  // placeholder scheme lets `URL` handle bare hostnames the same way.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let hostname: string;
  try {
    hostname = new URL(withScheme).hostname;
  } catch {
    throw new DomainError("That does not look like a domain.");
  }

  // Only the first label is dropped. `www.www.example.com` is a real (if odd)
  // host, and silently collapsing every `www.` would make it unaddressable.
  const bare = hostname.startsWith("www.") ? hostname.slice(4) : hostname;

  if (!HOSTNAME.test(bare)) {
    throw new DomainError("That does not look like a domain.");
  }

  // An all-numeric final label means an IPv4 address. Those are rejected
  // because the tracker verifies a site by hostname, and an address that
  // reassigns by DHCP cannot be a stable identity.
  if (/^[\d.]+$/.test(bare)) {
    throw new DomainError("Enter a domain name, not an IP address.");
  }

  return bare;
}
