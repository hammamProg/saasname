import type { Connector } from "@/libs/trends/types";
import { hackerNewsConnector } from "@/libs/trends/connectors/hacker-news";
import { githubConnector } from "@/libs/trends/connectors/github";
import { npmConnector } from "@/libs/trends/connectors/npm";
import { pypiConnector } from "@/libs/trends/connectors/pypi";
import { rssConnector } from "@/libs/trends/connectors/rss";
import { arxivConnector } from "@/libs/trends/connectors/arxiv";
import { huggingFaceConnector } from "@/libs/trends/connectors/hugging-face";
import { stackExchangeConnector } from "@/libs/trends/connectors/stack-exchange";
import { dataForSeoConnector } from "@/libs/trends/connectors/dataforseo";

/** The connector registry the design doc calls for: one list, so anything
 *  that needs to run "every source" (the local bootstrap script, future
 *  backfills) can iterate instead of hardcoding nine imports. The per-source
 *  cron routes still import their own connector directly, because each one
 *  must stay independently schedulable and independently killable. */
export const ALL_CONNECTORS: ReadonlyArray<Connector> = [
  hackerNewsConnector,
  githubConnector,
  npmConnector,
  pypiConnector,
  rssConnector,
  arxivConnector,
  huggingFaceConnector,
  stackExchangeConnector,
  dataForSeoConnector,
];
