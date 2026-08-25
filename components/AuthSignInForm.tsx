"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import config from "@/config";
import { createClient } from "@/libs/supabase/client";
import { getAuthCallbackUrl } from "@/libs/supabase/auth-redirect";
import { useAuthConfig } from "@/components/Providers";

type AuthSignInFormProps = {
  next?: string;
  showBackLink?: boolean;
};

export default function AuthSignInForm({
  next,
  showBackLink = true,
}: AuthSignInFormProps) {
  const { authEnabled } = useAuthConfig();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const callbackPath = next ?? config.auth.callbackUrl;

  const handleGoogleSignIn = async () => {
    if (!authEnabled) {
      window.location.href = "/auth/setup";
      return;
    }

    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthCallbackUrl(callbackPath) },
    });
  };

  const handleMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    if (!authEnabled) {
      window.location.href = "/auth/setup";
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: getAuthCallbackUrl(callbackPath),
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  };

  if (!authEnabled) {
    return (
      <div className="text-center">
        <p className="text-muted">Supabase is not configured.</p>
        <Link href="/auth/setup" className="mt-4 inline-block font-bold underline">
          Setup guide
        </Link>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="mt-2 text-sm text-muted">
          Supabase sent a magic link to{" "}
          <strong className="text-foreground">{email}</strong>. Click it to sign in to{" "}
          {config.appName}.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-bold underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {showBackLink && (
        <Link href="/" className="text-sm font-bold text-muted hover:text-foreground">
          ← Back to {config.appName}
        </Link>
      )}

      <h1 className="section-heading mt-4 text-2xl font-extrabold">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Continue with Google or get a magic link by email (sent by Supabase).
      </p>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-bold shadow-sm"
      >
        <span aria-hidden>G</span>
        Continue with Google
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted">or email magic link</span>
        </div>
      </div>

      <form onSubmit={handleMagicLink} className="space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send magic link"}
        </button>
      </form>

      {status === "error" && (
        <p className="mt-3 text-sm text-red-600">{errorMessage || "Could not send magic link."}</p>
      )}
    </div>
  );
}
