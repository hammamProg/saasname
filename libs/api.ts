import config from "@/config";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`/api${path}`, {
    ...rest,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = config.auth.loginUrl;
    }
    throw new ApiError(
      typeof data.error === "string" ? data.error : "Not signed in",
      401
    );
  }

  if (!response.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : "Request failed",
      response.status
    );
  }

  return data as T;
}

/** Axios-style helper for protected API routes — base path `/api`. */
const apiClient = {
  get: <T = unknown>(path: string) => request<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body }),
  put: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body }),
  patch: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: async <T = unknown>(path: string, body: FormData) => {
    const response = await fetch(`/api${path}`, {
      method: "POST",
      credentials: "same-origin",
      body,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = config.auth.loginUrl;
      }
      throw new ApiError(
        typeof data.error === "string" ? data.error : "Not signed in",
        401
      );
    }

    if (!response.ok) {
      throw new ApiError(
        typeof data.error === "string" ? data.error : "Request failed",
        response.status
      );
    }

    return data as T;
  },
};

export default apiClient;
