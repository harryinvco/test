import { API_BASE_URL } from "@/config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiRequest = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

export async function apiFetch<T = unknown>({
  path,
  method = "GET",
  body,
  token,
  signal,
}: ApiRequest): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers["authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `${method} ${path} → ${res.status}`;
    throw new ApiError(message, res.status, payload);
  }
  return payload as T;
}

// --- Typed endpoints --------------------------------------------------------

export type LoginResponse = {
  token: string;
  email: string;
  expiresAt: number;
};

export function loginMobile(email: string, password: string) {
  return apiFetch<LoginResponse>({
    path: "/api/mobile/auth/login",
    method: "POST",
    body: { email, password },
  });
}

export type RemoteTab = {
  id: string;
  date: string;
  label: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type RemoteNote = {
  id: string;
  tabId: string;
  date: string;
  titlePreview: string;
  content: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type SyncRequest = {
  cursor: number | null;
  changes?: { tabs: RemoteTab[]; notes: RemoteNote[] };
};

export type SyncResponse = {
  serverCursor: number;
  tabs: RemoteTab[];
  notes: RemoteNote[];
  applied: { tabs: number; notes: number };
  rejected: { tabs: number; notes: number };
};

export function syncNotes(req: SyncRequest, token: string) {
  return apiFetch<SyncResponse>({
    path: "/api/mobile/notes/sync",
    method: "POST",
    body: req,
    token,
  });
}
