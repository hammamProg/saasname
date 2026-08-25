const SHIPNOW_LAST_PROJECT_KEY = "shipnow:lastProject";

export function readLastShipNowProjectId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem(SHIPNOW_LAST_PROJECT_KEY);
}

export function rememberShipNowProjectId(id: string) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(SHIPNOW_LAST_PROJECT_KEY, id);
}
