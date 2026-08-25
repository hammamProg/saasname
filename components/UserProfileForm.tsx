"use client";

import { FormEvent, useEffect, useState } from "react";
import apiClient, { ApiError } from "@/libs/api";

type Profile = {
  id: string;
  email: string | null;
  updated_at: string | null;
};

export default function UserProfileForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: Profile }>("/user")
      .then(({ data }) => {
        if (data.email) setEmail(data.email);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status !== 401) {
          setError(err.message);
        }
      })
      .finally(() => setIsFetching(false));
  }, []);

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const { data } = await apiClient.post<{ data: Profile }>("/user", { email });
      setEmail(data.email ?? email);
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <p className="text-sm text-muted">Loading profile…</p>;
  }

  return (
    <form onSubmit={saveUser} className="card max-w-md space-y-4 p-6">
      <div>
        <label htmlFor="profile-email" className="text-sm font-bold">
          Profile email
        </label>
        <input
          id="profile-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          placeholder="you@company.com"
        />
        <p className="mt-2 text-xs text-muted">
          Stored in Supabase <code className="text-foreground">profiles</code> via a protected API
          route.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-60"
      >
        {isLoading ? "Saving…" : "Save"}
      </button>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
