// HTTP wire-format types — kept in sync with @quipier/sdk / Quipier API (/v1).
// Mirrors quipier.js/src/types.ts. Inlined so the package has zero internal deps.

export interface Comment {
  id: string;
  project_id: string;
  /** Public per-project author id (project_token_id for new comments). */
  author_id: string;
  /** Per-project nickname chosen at join. Null for legacy guest comments. */
  nickname: string | null;
  page_id: string;
  content: string;
  parent_id: string | null;
  is_deleted: boolean;
  deleted_by_type?: "passport" | "operator" | null;
  trashed_at?: string | null;
  purged_at?: string | null;
  is_hidden?: boolean;
  author_blocked?: boolean;
  created_at: string;
  likes_count: number;
  liked_by_me: boolean;
}

export interface CreateCommentBody {
  project_id: string;
  page_id: string;
  content: string;
  parent_id?: string;
}

export interface ListCommentsResponse {
  comments: Comment[];
  next_cursor: string | null;
}

export type ReportReason = "spam" | "harassment" | "adult" | "privacy" | "other";
