import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { dataForSeoConnector } from "@/libs/trends/connectors/dataforseo";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(dataForSeoConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await dataForSeoConnector.fetchSignals();
    const result = await ingestSignals(dataForSeoConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ingest/dataforseo]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
