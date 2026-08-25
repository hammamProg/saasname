import type { ReactNode } from "react";

type BetterIconProps = {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8 w-8 text-base",
  md: "h-10 w-10 text-lg",
  lg: "h-12 w-12 text-xl",
};

/** Hand-drawn style icon wrapper — colored circle background with centered emoji/icon */
export default function BetterIcon({
  children,
  className = "",
  size = "md",
}: BetterIconProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
