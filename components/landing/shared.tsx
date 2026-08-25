import { cn } from "@/libs/cn";

type SectionHeaderProps = {
  badge?: string;
  title: string;
  subtitle?: string;
  className?: string;
  centered?: boolean;
};

export function SectionHeader({
  badge,
  title,
  subtitle,
  className,
  centered = true,
}: SectionHeaderProps) {
  return (
    <div className={cn(centered && "mx-auto max-w-3xl text-center", className)}>
      {badge && (
        <p className="mb-4 inline-flex items-center rounded-full border border-primary/25 bg-primary-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          {badge}
        </p>
      )}
      <h2 className="section-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg leading-relaxed text-muted">{subtitle}</p>
      )}
    </div>
  );
}

export function GlowOrb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl animate-glow-pulse",
        className
      )}
    />
  );
}
