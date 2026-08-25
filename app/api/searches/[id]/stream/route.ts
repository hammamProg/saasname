import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { createClient } from "@/libs/supabase/server";
import { runSearchProbes, type ProgressEvent } from "@/libs/searches/run";

export const dynamic = "force-dynamic";
/** 48 outbound calls, six at a time, slowest probe 20s. */
export const maxDuration = 300;

/**
 * Runs the pending checks for a search and streams each result as it settles.
 *
 * The work is driven by this request rather than the POST that created the
 * search, so the user gets a report page to watch immediately.
 *
 * Every result is written to the database before it is emitted. If the client
 * disconnects the run continues to completion and the report is simply read
 * back on the next page load; nothing is lost but the live view.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  // RLS scopes this read to the caller, so someone else's search simply is not
  // found rather than needing a separate ownership check.
  const supabase = await createClient();
  const { data: search } = await supabase
    .from("searches")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!search) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;

      const send = (event: ProgressEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client went away mid-run. Keep working; the database still gets it.
          open = false;
        }
      };

      try {
        await runSearchProbes(id, send);
      } catch (error) {
        console.error("[api/searches/stream]", error instanceof Error ? error.message : error);
        send({ type: "done", searchId: id, refunded: 0 });
      } finally {
        if (open) {
          try {
            controller.close();
          } catch {
            // Already closed by the client.
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx and some proxies buffer streamed responses without this.
      "X-Accel-Buffering": "no",
    },
  });
}
