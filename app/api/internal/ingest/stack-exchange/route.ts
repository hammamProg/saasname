import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/cron-auth";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { stackExchangeConnector } from "@/libs/trends/connectors/stack-exchange";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(stackExchangeConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await stackExchangeConnector.fetchSignals();
    const result = await ingestSignals(stackExchangeConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ingest/stack-exchange]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
