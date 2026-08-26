"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { NAME_STYLES, type NameStyleId } from "@/libs/names/styles";
import { cn } from "@/libs/cn";

/** Offers the directions the user did not pick, once they have real names to
 *  react to.
 *
 *  Choosing a style up front is guesswork; choosing one after reading five
 *  concrete names is a judgement. This is where the steering actually happens. */
export default function RegenerateChips({
  current,
  busy,
  onRegenerate,
}: {
  current: NameStyleId;
  busy: boolean;
  onRegenerate: (id: NameStyleId) => void;
}) {
  const others = NAME_STYLES.filter((style) => style.id !== current);

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <RefreshCw size={14} aria-hidden="true" />
        Not the right direction?
      </p>

      <div className="flex flex-wrap gap-2">
        {others.map((style) => (
          <button
            key={style.id}
            type="button"
            disabled={busy}
            onClick={() => onRegenerate(style.id)}
            className={cn(
              "rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors",
              "hover:border-primary/25 hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {busy && <Loader2 size={11} className="mr-1 inline animate-spin" />}
            {style.label}
          </button>
        ))}
      </div>
    </div>
  );
}
