import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/cron-auth";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { rssConnector } from "@/libs/trends/connectors/rss";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(rssConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await rssConnector.fetchSignals();
    const result = await ingestSignals(rssConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ingest/rss]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
