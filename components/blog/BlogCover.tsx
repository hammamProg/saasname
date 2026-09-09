import { Activity, Globe2, Radio, Shield, Sparkles, Zap } from "lucide-react";

const CATEGORY_ICON: Record<string, typeof Activity> = {
  "GDPR & Privacy": Shield,
  Comparisons: Globe2,
  Product: Radio,
  "How it works": Zap,
  "Getting started": Sparkles,
};

/** No blog has cover photography, so posts get a generated brand card
 *  instead of a broken <Image> pointed at a file that was never added. */
export default function BlogCover({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category] ?? Activity;

  return (
    <div className={`brand-panel flex items-center justify-center ${className ?? ""}`}>
      <Icon size={40} className="text-primary/70" strokeWidth={1.5} aria-hidden />
    </div>
  );
}
