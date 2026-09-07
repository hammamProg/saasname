import Image from "next/image";
import Link from "next/link";
import config from "@/config";
import { cn } from "@/libs/cn";

type BrandLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string | null;
  /**
   * Force the light wordmark. The default logo spells "SaaS" in brand ink,
   * which is unreadable on a dark surface — this swaps in a variant with that
   * word in white, keeping the coloured icon and "Na.me".
   *
   * Leave it unset for anything that sits on the page background: the mark
   * then follows the active theme on its own. Set it only for a surface that
   * is dark regardless of theme, such as an always-dark panel.
   */
  onDark?: boolean;
};

const LOGO_WIDTH = 1960;
const LOGO_HEIGHT = 639;
const LOGO_ASPECT = LOGO_WIDTH / LOGO_HEIGHT;

const heights = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

export default function BrandLogo({
  className,
  size = "lg",
  href,
  onDark,
}: BrandLogoProps) {
  const height = heights[size];
  const width = Math.round(height * LOGO_ASPECT);
  const target = href === undefined ? "/" : href;

  /* Unset means "follow the theme". That is done in CSS rather than by reading
     the theme in React: the attribute is set before hydration, so a component
     that mirrored it into state would render the wrong mark first and swap. */
  const content =
    onDark === undefined ? (
      <span
        role="img"
        aria-label={config.brand.logoAlt}
        className={cn("brand-logo-auto block shrink-0", className)}
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    ) : (
      <span className={cn("inline-flex shrink-0 items-center", className)}>
        <Image
          src={onDark ? config.brand.logoOnDark : config.brand.logo}
          alt={config.brand.logoAlt}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          unoptimized
          priority
          className="block max-w-none object-contain object-left"
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
      </span>
    );

  if (target) {
    return (
      <Link href={target} className="inline-flex shrink-0 transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
