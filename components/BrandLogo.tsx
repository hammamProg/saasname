import Image from "next/image";
import Link from "next/link";
import config from "@/config";
import { cn } from "@/libs/cn";

type BrandLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string | null;
};

const LOGO_WIDTH = 618;
const LOGO_HEIGHT = 145;
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
}: BrandLogoProps) {
  const height = heights[size];
  const width = Math.round(height * LOGO_ASPECT);

  const content = (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={config.brand.logo}
        alt={config.brand.logoAlt}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        quality={100}
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
