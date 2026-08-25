import Image from "next/image";
import Link from "next/link";
import config from "@/config";
import { cn } from "@/libs/cn";

type BrandLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string | null;
  /**
   * Use the light wordmark. The default logo spells "SaaS" in brand ink,
   * which is unreadable on the dark landing theme — this swaps in a variant
   * with that word in white, keeping the coloured icon and "Na.me".
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
  href = "/",
  onDark = false,
}: BrandLogoProps) {
  const height = heights[size];
  const width = Math.round(height * LOGO_ASPECT);
  const src = onDark ? config.brand.logoOnDark : config.brand.logo;

  const content = (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={src}
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

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
