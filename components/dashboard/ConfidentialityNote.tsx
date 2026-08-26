import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/** Shown where an unlaunched idea actually gets typed. The assurance is worth
 *  little on a page nobody reads before submitting. */
export default function ConfidentialityNote() {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-muted">
      <ShieldCheck size={13} className="shrink-0 text-primary" aria-hidden="true" />
      Private to your account, never sold or used for training.
      <Link href="/confidentiality" className="font-semibold text-primary hover:underline">
        What we send where
      </Link>
      ·
      <Link href="/nda" className="font-semibold text-primary hover:underline">
        NDA
      </Link>
    </p>
  );
}
