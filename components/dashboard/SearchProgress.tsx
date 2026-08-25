"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type ProgressEvent =
  | { type: "check"; platform: string; status: string; done: number; total: number }
  | { type: "done"; searchId: string; refunded: number };

/**
 * Drives a running search and shows how far it has got.
 *
 * Opening the stream is what starts the work, so this component is mounted
 * whenever a search is not finished — including on a reload, where the run may
 * already be complete and the server simply closes the stream immediately.
 *
 * Deliberately no "already started" ref. Under StrictMode the effect runs,
 * cleans up, then runs again; a ref guard makes the second run bail out after
 * the first has already closed its stream, leaving no live connection at all.
 * Duplicate runs are prevented server-side instead, where two browser tabs are
 * a real possibility and a ref would not have helped anyway.
 */
export default function SearchProgress({
  searchId,
  total,
  initialDone,
}: {
  searchId: string;
  total: number;
  initialDone: number;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialDone);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const source = new EventSource(`/api/searches/${searchId}/stream`);

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as ProgressEvent;

      if (event.type === "check") {
        setDone(event.done);
        return;
      }

      source.close();
      // The stream carried progress; the report itself is re-read from the
      // database, which is the only thing that was ever authoritative.
      router.refresh();
    };

    source.onerror = () => {
      source.close();
      setFailed(true);
      // The run keeps going server-side, so a refresh will pick up whatever
      // finished. Losing the connection is not losing the work.
      router.refresh();
    };

    return () => source.close();
  }, [searchId, router]);

  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="card space-y-3 p-5" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Loader2 size={15} className="animate-spin text-primary" aria-hidden="true" />
          Checking {total} {total === 1 ? "signal" : "signals"}…
        </p>
        <p className="text-sm font-bold tabular-nums text-muted">
          {done}/{total}
        </p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-xs text-muted">
        {failed
          ? "Lost the live connection. The check is still running — reload in a moment."
          : "Results appear as each source answers. You can leave this page; the run continues."}
      </p>
    </div>
  );
}
