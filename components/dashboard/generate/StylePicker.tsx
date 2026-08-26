"use client";

import { NAME_STYLES, type NameStyleId } from "@/libs/names/styles";
import { findBrandMark } from "@/components/dashboard/generate/brand-marks";
import { cn } from "@/libs/cn";

/** One example: its mark, then its name.
 *
 *  The mark inherits the card's text colour rather than the brand's own. Ten
 *  full-colour logos would dominate the form and read as a customer list or an
 *  endorsement, neither of which is true. Monochrome at text size keeps them
 *  as what they are — a legend for the style. */
function ExampleBrand({ name }: { name: string }) {
  const mark = findBrandMark(name);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs opacity-80">
      {mark && (
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="currentColor"
          aria-hidden="true"
          className="shrink-0"
        >
          <path d={mark.path} />
        </svg>
      )}
      {name}
    </span>
  );
}

/** Lets the user aim the batch at one naming direction.
 *
 *  Examples sit under each label because "Invented" means little in the
 *  abstract and everything next to Zapier and Algolia. The choice is what
 *  stops the model hedging across styles, which made batches incoherent. */
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

              {style.examples.length > 0 ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {style.examples.map((example) => (
                    <ExampleBrand key={example} name={example} />
                  ))}
                </span>
              ) : (
                <span className="text-xs opacity-80">
                  A spread of every direction
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
