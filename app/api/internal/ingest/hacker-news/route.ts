import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/cron-auth";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { hackerNewsConnector } from "@/libs/trends/connectors/hacker-news";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(hackerNewsConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await hackerNewsConnector.fetchSignals();
    const result = await ingestSignals(hackerNewsConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ingest/hacker-news]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
