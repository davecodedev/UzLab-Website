const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Absolute URL of an API route, for the cases `request` cannot serve: links the
 * browser follows itself (an inline PDF) and multipart uploads.
 */
export function apiUrl(path: string): string {
  return `${API_URL}/api${path}`;
}

/**
 * A request that has not answered by now is not going to. Without this a page
 * whose data is unavailable does not fail — it hangs, holding the render open
 * until something further upstream gives up, which is a worse experience than
 * an honest "this is unavailable". Long enough for a cold API container, short
 * enough that nobody sits watching a blank page.
 */
const TIMEOUT_MS = 8_000;

/**
 * One refresh at a time.
 *
 * A page typically fires several authenticated requests at once, and when the
 * access token has expired they all come back 401 together. Without this they
 * would each post the refresh token — and since refreshing rotates it, the
 * first would succeed and the rest would present a token that had just been
 * revoked, signing the user out for no reason. They share one attempt instead.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  refreshInFlight ??= (async () => {
    const { getRefreshToken, storeSession, clearSession } = await import("./auth-client");
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        // The refresh token is gone too — expired, or revoked because this
        // account signed in somewhere else. Either way the session is over.
        clearSession();
        return null;
      }
      const body = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: Parameters<typeof storeSession>[2];
      };
      storeSession(body.accessToken, body.refreshToken, body.user);
      return body.accessToken;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  /** False on the retry, so a still-401 response cannot loop. */
  mayRefresh = true,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Status 0 means the request never reached the API — offline, refused, or
    // timed out. Callers distinguish it from a real HTTP error.
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "unreachable";
    throw new ApiError(0, `The service is ${reason}.`);
  }

  // An access token lasts fifteen minutes; a refresh token lasts thirty days.
  // Nothing used to spend the second one, so every signed-in page died after
  // a quarter of an hour and said only "Unauthorized" — which read as a
  // permissions problem rather than an expiry. One silent refresh and retry.
  const authHeader = new Headers(options.headers).get("Authorization");
  if (res.status === 401 && mayRefresh && authHeader) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set("Authorization", `Bearer ${fresh}`);
      return request<T>(path, { ...options, headers: retryHeaders }, false);
    }
    throw new ApiError(401, "Your session has ended. Please sign in again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? "Request failed");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/** class-validator returns `message` as an array; everything else as a string. */
function errorMessage(body: { message?: string | string[] }, fallback: string): string {
  if (Array.isArray(body.message)) return body.message.join(" ");
  return body.message ?? fallback;
}

export interface UploadOptions {
  token: string;
  /** 0–100, fired while the bytes are going out. */
  onProgress?: (percent: number) => void;
}

/**
 * multipart/form-data POST of a single file under the field name `file`.
 *
 * XMLHttpRequest rather than fetch: a 15 MB PDF on a slow connection takes long
 * enough that the member needs a progress bar, and fetch exposes no upload
 * progress event.
 *
 * A failed request rejects with `ApiError`. Status 0 means the request never
 * reached the API (offline, aborted, CORS) — callers show their own wording for
 * that rather than the placeholder message here.
 */
export function uploadFile<T>(path: string, file: File, opts: UploadOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(path));
    xhr.setRequestHeader("Authorization", `Bearer ${opts.token}`);
    // Content-Type is deliberately not set: the browser has to add the
    // multipart boundary, and overriding the header makes the body unparseable.

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        opts.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: { message?: string | string[] } = {};
      try {
        body = JSON.parse(xhr.responseText) as { message?: string | string[] };
      } catch {
        // A proxy error page rather than the API's JSON — keep the empty body.
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }
      reject(new ApiError(xhr.status, errorMessage(body, xhr.statusText || "Upload failed")));
    };

    xhr.onerror = () => reject(new ApiError(0, "Network error"));
    xhr.onabort = () => reject(new ApiError(0, "Upload aborted"));
    xhr.ontimeout = () => reject(new ApiError(0, "Upload timed out"));

    xhr.send(form);
  });
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  del: <T>(path: string, token?: string) =>
    request<T>(path, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
};
