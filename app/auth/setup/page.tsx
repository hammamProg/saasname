import Link from "next/link";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";

export const metadata = getSEOTags({
  title: "Auth setup",
  description: "Configure Supabase Google Auth and magic links.",
  canonicalUrlRelative: "/auth/setup",
});

const steps = [
  {
    title: "Add Supabase env vars",
    body: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  },
  {
    title: "Redirect URLs",
    body: "Authentication → URL Configuration → add http://localhost:3000/auth/callback and http://localhost:3000/auth/callback?**",
  },
  {
    title: "Enable Google",
    body: "Authentication → Providers → Google → Enable. Google Console redirect: https://YOUR_PROJECT.supabase.co/auth/v1/callback",
  },
  {
    title: "Enable magic links (Supabase Email)",
    body: "Authentication → Providers → Email → Enable.",
  },
  {
    title: "Magic Link email template",
    body: 'Authentication → Email Templates → Magic Link → link: <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Log in</a>',
  },
  {
    title: "Test",
    body: "npm run dev → /auth/signin → enter email → click link from Supabase email.",
  },
];

export default function AuthSetupPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="text-sm font-bold text-muted hover:text-foreground">
          ← Back to {config.appName}
        </Link>

        <h1 className="section-heading mt-8 text-3xl font-extrabold">Auth setup</h1>
        <p className="mt-3 text-muted">
          Google + magic links via <strong>Supabase Auth</strong>. Magic link emails are sent by
          Supabase — not Resend. See <code className="text-foreground">docs/AUTH.md</code>.
        </p>

        <ol className="card mt-8 space-y-6 p-6">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold">
                {index + 1}
              </span>
              <div>
                <h2 className="font-bold">{step.title}</h2>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/auth/signin" className="font-bold underline">
            Go to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
