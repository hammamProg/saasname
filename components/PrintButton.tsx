"use client";

import { Printer } from "lucide-react";

/** An NDA people cannot file is not much of an NDA. Printing to PDF is the
 *  path of least resistance on every platform, so we do not ship a generator. */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-ghost rounded-xl px-4 py-2 text-sm font-bold"
    >
      <Printer size={15} aria-hidden="true" />
      Save as PDF
    </button>
  );
}
