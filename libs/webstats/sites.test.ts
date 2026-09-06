import { describe, it, expect, vi } from "vitest";
import { hasReceivedEvents } from "@/libs/webstats/sites";

/** `hasReceivedEvents` drives the install-check screen: it is what flips
 *  "waiting for your first pageview" to "receiving data". It must read the
 *  raw firehose (`webstats_events`), not the hourly rollup
 *  (`webstats_visit_hourly`) — the rollup only runs every 5 minutes via
 *  pg_cron with a 1-minute safety lag, so a real visitor who just loaded the
 *  customer's page would still see "waiting" for up to ~6 minutes even
 *  though the tag is working correctly. */

const state = vi.hoisted(() => ({
  eventCount: 0,
  queriedTable: "" as string,
}));

function fromMock(table: string) {
  state.queriedTable = table;
  return {
    select: () => ({
      eq: async () => ({ count: state.eventCount, error: null }),
    }),
  };
}

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({ from: fromMock }),
}));

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({ from: fromMock }),
}));

describe("hasReceivedEvents", () => {
  it("returns true as soon as a raw event exists, without waiting on the hourly rollup", async () => {
    state.eventCount = 1;

    const installed = await hasReceivedEvents("11111111-1111-4111-8111-111111111111");

    expect(installed).toBe(true);
    expect(state.queriedTable).toBe("webstats_events");
  });

  it("returns false when no event has ever arrived", async () => {
    state.eventCount = 0;

    const installed = await hasReceivedEvents("11111111-1111-4111-8111-111111111111");

    expect(installed).toBe(false);
  });
});
