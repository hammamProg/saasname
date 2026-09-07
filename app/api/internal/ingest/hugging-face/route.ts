import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/cron-auth";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { huggingFaceConnector } from "@/libs/trends/connectors/hugging-face";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(huggingFaceConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await huggingFaceConnector.fetchSignals();
    const result = await ingestSignals(huggingFaceConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ingest/hugging-face]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
