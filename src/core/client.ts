import { HEADERS } from "./constants";
import type {
  Comment,
  CreateCommentBody,
  ListCommentsResponse,
  ReportReason,
} from "./types";

export interface ClientConfig {
  apiBase: string;
  apiKey: string;
  getToken: () => string | null;
  /** Value sent as the `Origin` header. Native apps don't have a document
   *  origin, so we default to `http://localhost` — which Quipier's API treats
   *  as always-allowed (same path that browser-based localhost dev uses). The
   *  origin check is meaningless for native apps anyway (no host page to
   *  forge); the publishable apiKey is what identifies the project. */
  origin?: string;
  /** Sent as `x-quipier-client`. Server stores it on comments + passports so
   *  operators can split mobile traffic by platform in the dashboard. */
  client: "ios" | "android";
}

const DEFAULT_NATIVE_ORIGIN = "http://localhost";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function createClient(config: ClientConfig) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    auth: "passport" | "anonymous" = "anonymous",
  ): Promise<T> {
    const nativeOrigin = config.origin ?? DEFAULT_NATIVE_ORIGIN;
    const headers: Record<string, string> = {
      [HEADERS.API_KEY]: config.apiKey,
      // RN's fetch sometimes treats `Origin` as a forbidden header and strips
      // it. Send the same value under both names — the server accepts either.
      origin: nativeOrigin,
      "x-quipier-origin": nativeOrigin,
      // Operator dashboards split web vs mobile by this header.
      "x-quipier-client": config.client,
    };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (auth === "passport") {
      const token = config.getToken();
      if (!token) throw new ApiError(401, "UNAUTHORIZED", "no project session token");
      headers[HEADERS.AUTHORIZATION] = `Bearer ${token}`;
    }
    const res = await fetch(config.apiBase + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "omit",
    });
    if (res.status === 204) return undefined as T;
    const json = (await res.json()) as {
      data?: T;
      error?: { code: string; message: string };
    };
    if (!res.ok || !json.data) {
      const code = json.error?.code ?? "INTERNAL";
      const message = json.error?.message ?? "request failed";
      throw new ApiError(res.status, code, message);
    }
    return json.data;
  }

  return {
    listComments(params: {
      project_id: string;
      page_id: string;
      cursor?: string;
      limit?: number;
    }): Promise<ListCommentsResponse> {
      const u = new URLSearchParams({
        project_id: params.project_id,
        page_id: params.page_id,
      });
      if (params.cursor) u.set("cursor", params.cursor);
      if (params.limit) u.set("limit", String(params.limit));
      return request<ListCommentsResponse>("GET", `/v1/comments?${u.toString()}`);
    },
    createComment(body: CreateCommentBody): Promise<{ comment: Comment }> {
      return request<{ comment: Comment }>("POST", "/v1/comments", body, "passport");
    },
    deleteComment(id: string): Promise<void> {
      return request<void>("DELETE", `/v1/comments/${id}`, undefined, "passport");
    },
    updateComment(id: string, content: string): Promise<void> {
      return request<void>(
        "PATCH",
        `/v1/comments/${id}`,
        { content },
        "passport",
      );
    },
    likeComment(id: string): Promise<{ likes_count: number; liked_by_me: boolean }> {
      return request<{ likes_count: number; liked_by_me: boolean }>(
        "POST",
        `/v1/comments/${id}/like`,
        undefined,
        "passport",
      );
    },
    unlikeComment(id: string): Promise<{ likes_count: number; liked_by_me: boolean }> {
      return request<{ likes_count: number; liked_by_me: boolean }>(
        "DELETE",
        `/v1/comments/${id}/like`,
        undefined,
        "passport",
      );
    },
    reportComment(id: string, reason: ReportReason): Promise<void> {
      return request<void>("POST", `/v1/comments/${id}/report`, { reason }, "passport");
    },
  };
}

export type Client = ReturnType<typeof createClient>;
