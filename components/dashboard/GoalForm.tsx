"use client";

import { useActionState, useEffect, useRef } from "react";
import { createGoalAction, type CreateGoalState } from "@/app/dashboard/sites/[id]/goals/actions";
import { MAX_GOAL_NAME } from "@/libs/webstats/goal-name";

const INITIAL: CreateGoalState = { error: null };

const TYPES: { value: string; label: string }[] = [
  { value: "event", label: "Custom event" },
  { value: "page", label: "Page destination" },
  { value: "signup", label: "Signup" },
  { value: "click", label: "Button click" },
  { value: "form", label: "Form submission" },
  { value: "download", label: "Download" },
  { value: "outbound_link", label: "External link click" },
];

const DEDUPE: { value: string; label: string }[] = [
  { value: "every", label: "Every occurrence" },
  { value: "once_per_session", label: "Once per session" },
  { value: "once_per_visitor", label: "Once per visitor" },
];

export default function GoalForm({ siteId }: { siteId: string }) {
  const [state, formAction, pending] = useActionState(createGoalAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.done) formRef.current?.reset();
  }, [state.done]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="siteId" value={siteId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="goal-key" className="block text-sm font-semibold">
            Key
          </label>
          <input
            id="goal-key"
            name="key"
            placeholder="signup"
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-muted">
            What <code>analytics.goal(&quot;key&quot;)</code> sends. Lowercase, no spaces.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="goal-name" className="block text-sm font-semibold">
            Name
          </label>
          <input
            id="goal-name"
            name="name"
            placeholder="Signed up"
            maxLength={MAX_GOAL_NAME}
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="goal-type" className="block text-sm font-semibold">
            Type
          </label>
          <select
            id="goal-type"
            name="type"
            defaultValue="event"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="goal-dedupe" className="block text-sm font-semibold">
            Count
          </label>
          <select
            id="goal-dedupe"
            name="dedupe"
            defaultValue="every"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          >
            {DEDUPE.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-gradient px-6 py-3 text-sm disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add goal"}
      </button>
    </form>
  );
}
