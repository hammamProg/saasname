/** RDAP server resolution.
 *
 *  RDAP answers "is this domain registered" with a status code: 404 means no
 *  such registration, 200 means it exists. That only holds when we asked a
 *  server that is actually authoritative for the TLD.
 *
 *  The trap this module exists to close: the public redirector rdap.org also
 *  returns 404 when it has no server for the TLD at all. Measured on
 *  2026-08-26, `vercel.io` returns 404 through rdap.org despite plainly being
 *  registered, because .io is absent from the IANA bootstrap. Reading that as
 *  "available" would tell a founder a taken domain is free -- the exact
 *  unknown-rendered-as-clear failure the design spec calls the one bug that
 *  would destroy trust in this product.
 *
 *  So: resolve the TLD to a server we chose deliberately, or return null and
 *  let the caller report `unknown`. Never guess.
 *
 *  The map is static rather than fetched from data.iana.org at request time.
 *  A naming search should not depend on IANA being reachable, and these
 *  endpoints change on the order of years.
 */
const RDAP_BASES: Record<string, string> = {
  // From the IANA bootstrap (https://data.iana.org/rdap/dns.json).
  com: "https://rdap.verisign.com/com/v1/",
  ai: "https://rdap.identitydigital.services/rdap/",
  dev: "https://pubapi.registry.google/rdap/",
  app: "https://pubapi.registry.google/rdap/",
  // NOT in the bootstrap. Verified by hand on 2026-08-26:
  // vercel.io -> 200, zzqxwvnameloop9271.io -> 404.
  io: "https://rdap.identitydigital.services/rdap/",
};

/** The TLDs v1 checks. Every one gives a real answer in both directions.
 *
 *  Deliberately excludes .co, .me, .so and .sh: no reachable RDAP server was
 *  found for any of them, so they could only ever render "could not check".
 *  Covering those needs Domainr, not more RDAP. */
export const SUPPORTED_TLDS = ["com", "io", "ai", "dev", "app"] as const;

export type SupportedTld = (typeof SUPPORTED_TLDS)[number];

/** Last label of a hostname, lowercased. "" when there is no dot. */
export function tldOf(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  const dot = trimmed.lastIndexOf(".");
  return dot === -1 ? "" : trimmed.slice(dot + 1);
}

/** Base URL of the RDAP server for a TLD, or null when we have none.
 *  Null means the caller must report `unknown` -- never `available`. */
export function resolveRdapBase(tld: string): string | null {
  const key = tld.trim().toLowerCase().replace(/^\./, "");
  return RDAP_BASES[key] ?? null;
}
