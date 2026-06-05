// Public customization contract for the React Native widget.
//
// Mirrors the web SDK (@quipier/sdk) so the mental model is identical, but slot
// functions return React nodes (not DOM) — there's no SlotHost/bridge needed
// because everything is already React.
import type { ReactNode } from "react";
import type { Comment, ReportReason } from "./types";

/** Avatar corner style. */
export type AvatarShape = "circle" | "square" | "rounded";

/** Friendly theme knobs merged over the built-in light/dark palette. Anything
 *  unset keeps the default look (an empty object = the stock widget). */
export interface Appearance {
  // colors
  bg?: string;
  text?: string;
  textMuted?: string;
  border?: string;
  surface?: string;
  accent?: string;
  accentText?: string;
  danger?: string;
  like?: string;
  // typography / shape / spacing
  fontFamily?: string;
  fontSize?: number; // body size, default 14
  radius?: number; // cards / inputs, default 8
  pillRadius?: number; // buttons, default 999
  gap?: number; // spacing between top-level comments, default 16
  avatarShape?: AvatarShape; // default "circle"
}

/** Toggle whole UI features on/off. All default to `true`. */
export interface Features {
  sort?: boolean;
  composer?: boolean;
  likes?: boolean;
  replies?: boolean;
  report?: boolean;
  menu?: boolean;
  badge?: boolean;
  avatars?: boolean;
}

/** A slot's return value. `null`/`undefined` ⇒ render the default. */
export type SlotResult = ReactNode;

/** Stable, public projection of a comment passed to slot functions. */
export interface QuipierCommentView {
  id: string;
  author: {
    id: string;
    nickname: string | null;
    isOwn: boolean;
    blocked: boolean;
  };
  content: string;
  createdAt: string; // ISO 8601
  likes: { count: number; likedByMe: boolean };
  isDeleted: boolean;
  isHidden: boolean;
  parentId: string | null;
  replyCount: number;
  /** Escape hatch to the raw wire object. Avoid depending on this. */
  raw: Comment;
}

/** Behaviour bound to a single comment — lets a custom row drive the same
 *  actions the default UI exposes. */
export interface CommentActions {
  like(): void;
  unlike(): void;
  reply(content: string): Promise<void>;
  edit(content: string): Promise<void>;
  remove(): void;
  report(reason: ReportReason): void;
}

export interface SlotHelpers {
  formatTime(iso: string, format?: "relative" | "absolute"): string;
  avatarColor(seed: string): string;
}

/** Resolved theme tokens (colors + shape) handed to slot functions. */
export interface ResolvedTheme {
  bg: string;
  text: string;
  textMuted: string;
  border: string;
  surface: string;
  accent: string;
  accentText: string;
  danger: string;
  like: string;
  badgeBg: string;
  fontFamily?: string;
  fontSize: number;
  radius: number;
  pillRadius: number;
  gap: number;
  avatarShape: AvatarShape;
}

export interface BaseCtx {
  /** The default rendering for this slot, so you can wrap / decorate it. */
  defaultNode(): ReactNode;
  theme: ResolvedTheme;
  helpers: SlotHelpers;
}

export interface CommentCtx extends BaseCtx {
  actions: CommentActions;
  isOwn: boolean;
}

/** Per-part render overrides. Omit a slot to keep the default rendering. */
export interface Slots {
  header?: (ctx: BaseCtx) => SlotResult;
  composer?: (ctx: BaseCtx) => SlotResult;
  empty?: (ctx: BaseCtx) => SlotResult;
  /** Replace an entire comment row. */
  comment?: (view: QuipierCommentView, ctx: CommentCtx) => SlotResult;
  // partial overrides inside the default row
  avatar?: (view: QuipierCommentView, ctx: CommentCtx) => SlotResult;
  authorLabel?: (view: QuipierCommentView, ctx: CommentCtx) => SlotResult;
  content?: (view: QuipierCommentView, ctx: CommentCtx) => SlotResult;
  actions?: (view: QuipierCommentView, ctx: CommentCtx) => SlotResult;
}

/** Build the stable public view from an internal comment row. */
export function toCommentView(
  c: Comment,
  ownAuthorId: string | null,
  replyCount: number,
): QuipierCommentView {
  return {
    id: c.id,
    author: {
      id: c.author_id,
      nickname: c.nickname,
      isOwn: !!ownAuthorId && c.author_id === ownAuthorId,
      blocked: !!c.author_blocked,
    },
    content: c.content,
    createdAt: c.created_at,
    likes: { count: c.likes_count, likedByMe: c.liked_by_me },
    isDeleted: c.is_deleted,
    isHidden: !!c.is_hidden,
    parentId: c.parent_id,
    replyCount,
    raw: c,
  };
}

/** `null`/`undefined` slot result falls back to the default node. */
export function hostSlot(result: SlotResult, fallback: ReactNode): ReactNode {
  return result === undefined || result === null ? fallback : result;
}
