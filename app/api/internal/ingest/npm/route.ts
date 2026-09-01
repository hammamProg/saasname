import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { npmConnector } from "@/libs/trends/connectors/npm";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(npmConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await npmConnector.fetchSignals();
    const result = await ingestSignals(npmConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ingest/npm]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
