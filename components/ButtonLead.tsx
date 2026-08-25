"use client";

import { FormEvent, useState } from "react";

type ButtonLeadProps = {
  extraStyle?: string;
};

export default function ButtonLead({ extraStyle = "" }: ButtonLeadProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409 || response.ok) {
        setStatus("success");
        setEmail("");
        return;
      }
      throw new Error(data.error ?? "Failed");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
        You&apos;re on the list!
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex w-full flex-col gap-3 ${extraStyle}`}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tom@cruise.com"
        className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full rounded-xl py-3 text-sm disabled:opacity-60"
      >
        {status === "loading" ? "Joining..." : "Join Waitlist →"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
