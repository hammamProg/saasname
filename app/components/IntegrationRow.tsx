"use client";

import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { ServiceLogo } from "./ServiceLogo";
import { getIntegrationBrand } from "../lib/serviceBrands";

export type Integration = {
  appName: string;
  displayName: string;
  logoUrl?: string;
  connected: boolean;
  connectionId: string | null;
  status: string;
  authType?: "oauth" | "api_key";
  connectProvider?: "composio" | "nango";
};

type IntegrationRowProps = {
  integration: Integration;
  idx: number;
  busyApp: string | null;
  pendingDisconnect: string | null;
  onConnect: (appName: string) => void;
  onDisconnect: (integration: Integration) => void;
  onCancelDisconnect: () => void;
  onRequestDisconnect: (appName: string) => void;
};

export function IntegrationRow(props: IntegrationRowProps) {
  const {
    integration,
    idx,
    busyApp,
    pendingDisconnect,
    onConnect,
    onDisconnect,
    onCancelDisconnect,
    onRequestDisconnect,
  } = props;
  const brand = getIntegrationBrand(integration.appName);
  const isBusy = busyApp === integration.appName;
  const isConfirming = pendingDisconnect === integration.appName;
  const canDisconnect = Boolean(integration.connectionId);

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="rounded-xl border border-border bg-surface p-3"
    >
      <div className="flex items-center gap-3">
        <ServiceLogo
          src={integration.logoUrl ?? brand?.logoUrl}
          name={integration.displayName}
          size={36}
          connected={integration.connected}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{integration.displayName}</p>
          <p className="text-xs capitalize text-muted">
            {integration.connected ? "Connected" : integration.status}
          </p>
        </div>
        {integration.connected && canDisconnect ? (
          isConfirming ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onDisconnect(integration)}
                className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {isBusy ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={onCancelDisconnect}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onRequestDisconnect(integration.appName)}
              className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-60"
            >
              Disconnect
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onConnect(integration.appName)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isBusy ? <Loader2 size={12} className="animate-spin" /> : "Connect"}
          </button>
        )}
      </div>
    </motion.li>
  );
}
