import { Suspense } from "react";
import AuthSignInPage from "./AuthSignInPage";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <AuthSignInPage />
    </Suspense>
  );
}
