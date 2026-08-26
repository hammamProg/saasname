"use client";

import { NAME_STYLES, type NameStyleId } from "@/libs/names/styles";
import { cn } from "@/libs/cn";

/** Lets the user aim the batch at one naming direction.
 *
 *  Examples sit under each label because "Invented" means little in the
 *  abstract and everything next to "Zapier, Klaviyo". The choice is what stops
 *  the model hedging across styles, which is what made batches incoherent. */
export default function StylePicker({
  selected,
  onSelect,
}: {
  selected: NameStyleId;
  onSelect: (id: NameStyleId) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">Pick a direction</legend>

      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {NAME_STYLES.map((style) => {
          const checked = style.id === selected;

          return (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onSelect(style.id)}
              className={cn(
                "flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition-all",
                checked
                  ? "border-primary/50 bg-primary-soft text-primary shadow-sm"
                  : "border-border bg-surface text-muted hover:border-primary/25 hover:text-foreground"
              )}
            >
              <span className="text-sm font-semibold">{style.label}</span>
              <span className="text-xs opacity-80">
                {style.examples.length > 0
                  ? style.examples.join(", ")
                  : "A spread of every direction"}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
