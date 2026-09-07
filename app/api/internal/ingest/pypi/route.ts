import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/cron-auth";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { pypiConnector } from "@/libs/trends/connectors/pypi";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(pypiConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await pypiConnector.fetchSignals();
    const result = await ingestSignals(pypiConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ingest/pypi]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
