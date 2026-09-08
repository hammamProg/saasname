"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import "./globals.css";

/** Last resort: an error above the root layout itself (not caught by
 *  app/dashboard/error.tsx or any other nested boundary, since those only
 *  catch errors within their own segment). Next.js requires this file to
 *  define its own complete <html>/<body> — it replaces the root layout
 *  rather than rendering inside it — so nothing from layout.tsx is
 *  available here for free. That's why globals.css and the theme script
 *  are repeated below instead of inherited: without them this page would
 *  render as unstyled black-on-white regardless of the theme someone had
 *  chosen, which reads as "it reset my theme" even though nothing did. */
export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="section-heading text-xl font-extrabold">
              Something went wrong
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              We couldn&apos;t load this page. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              className="btn-gradient mt-6 px-5 py-2.5 text-sm"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
