"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Plug, XCircle, Loader2, RefreshCw } from "lucide-react";
import Nango, { ConnectUI } from "@nangohq/frontend";
import {
  fetchIntegrationsCached,
  getCachedIntegrations,
  invalidateIntegrationsCache,
} from "@/libs/dashboard-data-cache";
import { IntegrationRow, type Integration } from "./IntegrationRow";

type ConnectResponse = {
  success: boolean;
  redirectUrl?: string;
  sessionToken?: string;
  connectProvider?: "composio" | "nango";
  error?: string;
};

async function syncNangoConnection(appName: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch("/api/integrations/nango/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appName }),
  });
  return (await response.json()) as { success: boolean; error?: string };
}

export function IntegrationsSidebar() {
  const [integrations, setIntegrations] = useState<Integration[]>(
    () => getCachedIntegrations() ?? []
  );
  const [loading, setLoading] = useState(() => getCachedIntegrations() == null);
  const [error, setError] = useState<string | null>(null);
  const [busyApp, setBusyApp] = useState<string | null>(null);
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null);
  const connectRef = useRef<ConnectUI | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (getCachedIntegrations() == null) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchIntegrationsCached();
      setIntegrations(data);
    } catch {
      setError("Failed to load integrations");
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchIntegrations();
  }, [fetchIntegrations]);

  useEffect(() => {
    return () => {
      connectRef.current?.close();
      connectRef.current = null;
    };
  }, []);

  const connectedCount = integrations.filter((item) => item.connected).length;
  const totalCount = integrations.length;
  const progressPercent = totalCount > 0 ? Math.round((connectedCount / totalCount) * 100) : 0;

  const handleConnect = async (appName: string) => {
    setBusyApp(appName);
    setError(null);
    let deferBusyClear = false;
    try {
      const response = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName, redirectUrl: window.location.href }),
      });
      const data = (await response.json()) as ConnectResponse;

      if (data.success && data.connectProvider === "nango" && data.sessionToken) {
        deferBusyClear = true;
        connectRef.current?.close();
        const nango = new Nango();
        const connect = nango.openConnectUI({
          onEvent: (event) => {
            if (event.type === "connect") {
              void (async () => {
                try {
                  const synced = await syncNangoConnection(appName);
                  if (!synced.success) {
                    setError(synced.error ?? "Failed to sync connection");
                  } else {
                    invalidateIntegrationsCache();
                    await fetchIntegrations();
                  }
                } catch {
                  setError("Failed to sync connection");
                } finally {
                  connect.close();
                  connectRef.current = null;
                  setBusyApp(null);
                }
              })();
            } else if (event.type === "close" || event.type === "error") {
              if (event.type === "error") {
                setError(event.payload.errorMessage ?? "Connection failed");
              }
              connect.close();
              connectRef.current = null;
              setBusyApp(null);
            }
          },
        });
        connectRef.current = connect;
        connect.setSessionToken(data.sessionToken);
        return;
      }

      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setError(data.error ?? "Failed to start OAuth flow");
    } catch {
      setError("Failed to start OAuth flow");
    } finally {
      if (!deferBusyClear) {
        setBusyApp(null);
      }
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!integration.connectionId) return;
    setBusyApp(integration.appName);
    setError(null);
    try {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: integration.connectionId,
          appName: integration.appName,
        }),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!data.success) {
        setError(data.error ?? "Failed to disconnect");
        return;
      }
      setPendingDisconnect(null);
      invalidateIntegrationsCache();
      await fetchIntegrations();
    } catch {
      setError("Failed to disconnect");
    } finally {
      setBusyApp(null);
    }
  };

  return (
    <aside className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Plug size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Integrations</h2>
            <p className="text-xs text-muted">Connect OAuth and API-key services</p>
          </div>
        </div>

        {!loading && !error && totalCount > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted">Connected</span>
              <span className="tabular-nums font-semibold text-foreground">
                {connectedCount}/{totalCount}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted">
            <Loader2 size={22} className="animate-spin text-primary" />
            <p className="text-xs font-medium">Loading integrations…</p>
          </div>
        )}

        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-start gap-2">
              <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-foreground">Could not load integrations</p>
                <p className="text-xs leading-relaxed text-muted">{error}</p>
                {error.toLowerCase().includes("composio_api_key") && (
                  <p className="text-xs leading-relaxed text-muted">
                    Add <code className="rounded bg-card px-1 py-0.5 text-foreground">COMPOSIO_API_KEY</code>{" "}
                    to your <code className="rounded bg-card px-1 py-0.5 text-foreground">.env.local</code> file,
                    then restart the dev server.
                  </p>
                )}
                {error.toLowerCase().includes("nango_secret_key") && (
                  <p className="text-xs leading-relaxed text-muted">
                    Add <code className="rounded bg-card px-1 py-0.5 text-foreground">NANGO_SECRET_KEY</code>{" "}
                    to your <code className="rounded bg-card px-1 py-0.5 text-foreground">.env.local</code> file,
                    configure Paddle in{" "}
                    <a
                      href="https://app.nango.dev/dev/integrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Nango
                    </a>
                    , then restart the dev server.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void fetchIntegrations()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {!loading && !error && (
          <ul className="space-y-2">
            {integrations.map((integration, idx) => (
              <IntegrationRow
                key={integration.appName}
                integration={integration}
                idx={idx}
                busyApp={busyApp}
                pendingDisconnect={pendingDisconnect}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onCancelDisconnect={() => setPendingDisconnect(null)}
                onRequestDisconnect={setPendingDisconnect}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
