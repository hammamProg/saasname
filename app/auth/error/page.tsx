import Link from "next/link";
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "Sign-in error",
  description: "Something went wrong during sign-in.",
  canonicalUrlRelative: "/auth/error",
});

const messages: Record<string, { title: string; body: string }> = {
  Callback: {
    title: "Could not complete sign-in",
    body: "The magic link may have expired, already been used, or opened in a different browser. Request a new link and try again.",
  },
  Configuration: {
    title: "Auth not configured",
    body: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  },
  default: {
    title: "Sign-in failed",
    body: "Check Supabase Auth settings and redirect URLs (http://localhost:3000/auth/callback).",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const content = messages[error ?? ""] ?? messages.default;

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="section-heading text-center text-3xl font-extrabold">
          {content.title}
        </h1>
        <p className="mt-4 text-center text-muted">{message ?? content.body}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/auth/signin" className="btn-primary rounded-xl px-6 py-3 text-center text-sm font-bold">
            Try again
          </Link>
          <Link
            href="/auth/setup"
            className="rounded-xl border border-border px-6 py-3 text-center text-sm font-bold"
          >
            Setup guide
          </Link>
        </div>
      </div>
    </div>
  );
}
