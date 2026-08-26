import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/** Shown where an unlaunched idea actually gets typed. The assurance is worth
 *  little on a page nobody reads before submitting. */
export default function ConfidentialityNote() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3">
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-xs leading-relaxed text-muted">
        <span className="font-semibold text-foreground">Your idea stays yours.</span>{" "}
        Reports are readable only by your account, private until you share them,
        and never sold or used to train anything.{" "}
        <Link href="/confidentiality" className="font-semibold text-primary hover:underline">
          What we send where
        </Link>{" "}
        ·{" "}
        <Link href="/nda" className="font-semibold text-primary hover:underline">
          Read the NDA
        </Link>
      </p>
    </div>
  );
}
