import { cn } from "@/libs/cn";

type MarketingBackdropProps = {
  className?: string;
  variant?: "hero" | "section" | "dashboard";
  dark?: boolean;
  cover?: boolean;
};

export default function MarketingBackdrop({
  className,
  variant = "section",
  dark = false,
  cover = false,
}: MarketingBackdropProps) {
  const height =
    variant === "hero" ? "h-[520px]" : variant === "dashboard" ? "h-72" : "h-64";
  const sizeClass = cover ? "inset-0 h-full" : cn("inset-x-0 top-0", height);

  if (dark) {
    return (
      <div aria-hidden className={cn("pointer-events-none absolute -z-10", sizeClass, className)}>
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(10,110,209,0.10),transparent_62%)]",
            !cover && height
          )}
        />
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(98,46,248,0.06),transparent_52%)]",
            !cover && height
          )}
        />
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,189,252,0.06),transparent_45%)]",
            !cover && height
          )}
        />
      </div>
    );
  }

  return (
    <div aria-hidden className={cn("pointer-events-none absolute -z-10", sizeClass, className)}>
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(10,110,209,0.08),transparent_55%)]",
          !cover && height
        )}
      />
      <div
        className={cn(
          "absolute inset-0 opacity-80",
          "[background-image:linear-gradient(to_right,rgba(8,32,63,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(8,32,63,0.045)_1px,transparent_1px)]",
          "[background-size:4rem_4rem]",
          cover
            ? "[mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_40%,transparent_100%)]"
            : "[mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_50%,transparent_100%)]",
          !cover && height
        )}
      />
    </div>
  );
}
