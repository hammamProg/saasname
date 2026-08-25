import apiClient from "@/libs/api";
import type { Integration } from "@/app/components/IntegrationRow";
import type { Project } from "@/libs/projects";

const TTL_MS = 60_000;

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

let projectsEntry: CacheEntry<Project[]> | null = null;
let integrationsEntry: CacheEntry<Integration[]> | null = null;
let projectsInflight: Promise<Project[]> | null = null;
let integrationsInflight: Promise<Integration[]> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return entry != null && Date.now() - entry.fetchedAt < TTL_MS;
}

export function getCachedProjects(): Project[] | null {
  return isFresh(projectsEntry) ? projectsEntry.data : null;
}

export function getCachedIntegrations(): Integration[] | null {
  return isFresh(integrationsEntry) ? integrationsEntry.data : null;
}

export function integrationIsConnected(appName: string): boolean {
  return Boolean(getCachedIntegrations()?.find((item) => item.appName === appName)?.connected);
}

export function invalidateProjectsCache() {
  projectsEntry = null;
}

export function invalidateIntegrationsCache() {
  integrationsEntry = null;
}

async function loadProjects(): Promise<Project[]> {
  const result = await apiClient.get<{ data: Project[] }>("/projects");
  const data = result.data ?? [];
  projectsEntry = { data, fetchedAt: Date.now() };
  return data;
}

async function loadIntegrations(): Promise<Integration[]> {
  const response = await fetch("/api/integrations");
  const payload = (await response.json()) as {
    success?: boolean;
    integrations?: Integration[];
  };
  const data = payload.success && payload.integrations ? payload.integrations : [];
  integrationsEntry = { data, fetchedAt: Date.now() };
  return data;
}

export async function fetchProjectsCached(force = false): Promise<Project[]> {
  if (!force && isFresh(projectsEntry)) {
    return projectsEntry.data;
  }
  if (projectsInflight) {
    return projectsInflight;
  }
  projectsInflight = loadProjects().finally(() => {
    projectsInflight = null;
  });
  return projectsInflight;
}

export async function fetchIntegrationsCached(force = false): Promise<Integration[]> {
  if (!force && isFresh(integrationsEntry)) {
    return integrationsEntry.data;
  }
  if (integrationsInflight) {
    return integrationsInflight;
  }
  integrationsInflight = loadIntegrations().finally(() => {
    integrationsInflight = null;
  });
  return integrationsInflight;
}

/** Warm caches after dashboard shell mounts. */
export function prefetchDashboardData(hasAccess: boolean) {
  if (!hasAccess) return;
  void fetchProjectsCached();
  void fetchIntegrationsCached();
}

export function revalidateProjectsInBackground() {
  void fetchProjectsCached(true).catch(() => undefined);
}

export function revalidateIntegrationsInBackground() {
  void fetchIntegrationsCached(true).catch(() => undefined);
}
