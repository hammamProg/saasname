"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import config from "@/config";
import AuthSignInForm from "@/components/AuthSignInForm";
import BrandLogo from "@/components/BrandLogo";

export default function AuthSignInPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? config.auth.callbackUrl;

  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="section-heading text-3xl font-extrabold">Sign-in failed</h1>
          <p className="mt-4 text-muted">Something went wrong. Please try again.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/auth/signin" className="btn-primary rounded-xl px-6 py-3 text-sm font-bold">
              Try again
            </Link>
            <Link href="/" className="rounded-xl border border-border px-6 py-3 text-sm font-bold">
              Back home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(122,226,207,0.18),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="lg" href="/" />
        </div>
        <AuthSignInForm next={next} />
      </div>
    </div>
  );
}
