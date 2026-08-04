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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
