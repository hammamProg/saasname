"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { DomainError, normalizeDomain } from "@/libs/webstats/domain";
import config from "@/config";

/** The domain the visitor types here rides through sign-in as the `next`
 *  param (the same mechanism AuthSignInPage already reads) and lands on
 *  /dashboard/sites/new with the domain pre-filled, so "start right away"
 *  is true after auth instead of dropping them on an empty form. */
export default function HeroDomainForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let domain: string;
    try {
      domain = normalizeDomain(value);
    } catch (err) {
      setError(err instanceof DomainError ? err.message : "That does not look like a domain.");
      return;
    }

    const next = `/dashboard/sites/new?domain=${encodeURIComponent(domain)}`;
    router.push(`${config.auth.loginUrl}?next=${encodeURIComponent(next)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <input
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          placeholder="yoursite.com"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="Your website domain"
          aria-describedby={error ? "hero-domain-error" : undefined}
          className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm outline-none focus:border-primary sm:min-w-[220px]"
        />
        {error ? (
          <p id="hero-domain-error" role="alert" className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <button type="submit" className="btn-gradient shrink-0 px-6 py-3.5 text-sm">
        Start tracking free
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
