"use client";

import config from "@/config";
import { useAuthConfig } from "@/components/Providers";

type ButtonSigninProps = {
  variant?: "primary" | "secondary" | "link";
  label?: string;
  className?: string;
};

export default function ButtonSignin({
  variant = "primary",
  label,
  className = "",
}: ButtonSigninProps) {
  const { authEnabled } = useAuthConfig();

  const handleSignIn = () => {
    if (!authEnabled) {
      window.location.href = "/auth/setup";
      return;
    }

    const next = encodeURIComponent(config.auth.callbackUrl);
    window.location.href = `/auth/signin?next=${next}`;
  };

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className={`text-sm font-bold underline ${className}`}
      >
        {label ?? "Login"}
      </button>
    );
  }

  if (variant === "secondary") {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className={`w-full rounded-xl bg-surface py-3 text-sm font-bold shadow-md ${className}`}
      >
        {label ?? "Sign-Up"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className={`btn-primary w-full rounded-xl py-3 text-sm shadow-md ${className}`}
    >
      {label ?? "Get Started"}
    </button>
  );
}
