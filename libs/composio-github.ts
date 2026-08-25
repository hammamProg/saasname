import { listIntegrations } from "@/libs/composio";

const COMPOSIO_BASE = "https://backend.composio.dev/api/v3.1";
const GITHUB_TOOLKIT = "github";
const GITHUB_CREATE_REPO_TOOL =
  "GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER";

function getApiKey(): string | null {
  const key = process.env.COMPOSIO_API_KEY?.trim();
  return key || null;
}

type ToolExecuteResponse = {
  data?: Record<string, unknown>;
  error?: string | null;
  successful?: boolean;
};

type ComposioError = {
  error?: { message?: string };
  message?: string;
};

export async function getGitHubConnection(
  userId: string
): Promise<{ connectionId: string } | null> {
  const integrations = await listIntegrations(userId);
  const github = integrations.find((item) => item.appName === GITHUB_TOOLKIT);

  if (!github?.connected || !github.connectionId) {
    return null;
  }

  return { connectionId: github.connectionId };
}

function parseGitHubRepoPayload(
  payload: Record<string, unknown> | undefined
): { htmlUrl: string; fullName: string } | null {
  if (!payload) {
    return null;
  }

  const nested = [payload, payload.response_data, payload.data].filter(
    (value): value is Record<string, unknown> =>
      typeof value === "object" && value !== null && !Array.isArray(value)
  );

  for (const candidate of nested) {
    const htmlUrl = candidate.html_url ?? candidate.htmlUrl;
    const fullName = candidate.full_name ?? candidate.fullName;

    if (typeof htmlUrl === "string" && typeof fullName === "string") {
      return { htmlUrl, fullName };
    }
  }

  return null;
}

export async function createGitHubRepository(
  userId: string,
  connectionId: string,
  params: { name: string; description?: string | null; private?: boolean }
): Promise<{ htmlUrl: string; fullName: string } | { error: string }> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return { error: "COMPOSIO_API_KEY is not configured" };
  }

  const response = await fetch(`${COMPOSIO_BASE}/tools/execute/${GITHUB_CREATE_REPO_TOOL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    cache: "no-store",
    body: JSON.stringify({
      user_id: userId,
      connected_account_id: connectionId,
      arguments: {
        name: params.name,
        description: params.description ?? undefined,
        private: params.private ?? false,
        auto_init: false,
      },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as ToolExecuteResponse & ComposioError;
  const message =
    body.error?.message ??
    (typeof body.error === "string" ? body.error : undefined) ??
    body.message ??
    `Composio request failed (${response.status})`;

  if (!response.ok) {
    return { error: message };
  }

  if (!body.successful) {
    return { error: message || "GitHub could not create the repository" };
  }

  const repo = parseGitHubRepoPayload(body.data);

  if (!repo) {
    return { error: "Repository was created but the response was unexpected" };
  }

  return repo;
}
