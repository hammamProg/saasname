const PADDLE_WEBHOOK_PATH = "/api/webhooks/paddle";

export function buildPaddleWebhookUrl(baseOrFullUrl: string): string {
  const trimmed = baseOrFullUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return PADDLE_WEBHOOK_PATH;

  try {
    const url = new URL(trimmed);
    if (url.pathname.endsWith(PADDLE_WEBHOOK_PATH)) {
      return url.toString().replace(/\/+$/, "");
    }
    return `${url.origin}${PADDLE_WEBHOOK_PATH}`;
  } catch {
    return `${trimmed}${PADDLE_WEBHOOK_PATH}`;
  }
}

export function isLocalWebhookBase(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl.trim());
    const host = url.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    );
  } catch {
    return /localhost|127\.0\.0\.1/i.test(baseUrl);
  }
}

export function resolveWebhookBaseUrl(input?: {
  webhook_base_url?: string;
  webhook_url?: string;
  site_url?: string;
}): { baseUrl: string } | { error: string } {
  const raw =
    input?.webhook_base_url?.trim() ||
    input?.site_url?.trim() ||
    (input?.webhook_url?.trim()
      ? input.webhook_url.trim().replace(/\/api\/webhooks\/paddle\/?$/, "")
      : "");

  if (!raw) {
    return { error: "Enter a public webhook base URL or select an ngrok tunnel." };
  }

  const baseUrl = raw.replace(/\/+$/, "");

  if (isLocalWebhookBase(baseUrl)) {
    return {
      error:
        "localhost cannot receive Paddle webhooks. Use an ngrok tunnel or your deployed site URL.",
    };
  }

  try {
    const url = new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
    return { baseUrl: url.origin };
  } catch {
    return { error: "Enter a valid HTTPS URL (e.g. https://abc123.ngrok-free.app)." };
  }
}
