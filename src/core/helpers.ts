import type { Comment } from "./types";

const PALETTE = [
  "#ff4500",
  "#ff8717",
  "#ffb000",
  "#46d160",
  "#24a0ed",
  "#7193ff",
  "#a55eea",
  "#ea4c89",
  "#3aa57c",
  "#d63a3a",
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function colorForSeed(seed: string): string {
  return PALETTE[hash(seed) % PALETTE.length]!;
}

export function avatarLetter(seed: string, label: string | null): string {
  return (label || seed || "?").trim().charAt(0).toUpperCase() || "?";
}

export function formatTime(
  iso: string,
  format: "relative" | "absolute" = "relative",
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (format === "absolute") return d.toLocaleString();
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString();
}

export interface CommentNode {
  comment: Comment;
  children: CommentNode[];
}

export type SortKey = "top" | "newest";

/** Mirror web SDK: 2-level threading — every reply attaches to its root ancestor. */
export function buildTree(comments: Comment[], sort: SortKey): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  for (const c of comments) {
    byId.set(c.id, { comment: c, children: [] });
  }
  function findRootId(id: string): string {
    let cur = byId.get(id);
    const seen = new Set<string>();
    while (cur && cur.comment.parent_id && byId.has(cur.comment.parent_id)) {
      if (seen.has(cur.comment.id)) break;
      seen.add(cur.comment.id);
      cur = byId.get(cur.comment.parent_id);
    }
    return cur ? cur.comment.id : id;
  }

  const roots: CommentNode[] = [];
  for (const c of comments) {
    const node = byId.get(c.id)!;
    if (!c.parent_id) {
      roots.push(node);
      continue;
    }
    const rootId = findRootId(c.id);
    if (rootId === c.id) {
      roots.push(node);
    } else {
      byId.get(rootId)!.children.push(node);
    }
  }
  for (const node of byId.values()) {
    node.children.sort(
      (a, b) =>
        new Date(a.comment.created_at).getTime() -
        new Date(b.comment.created_at).getTime(),
    );
  }
  roots.sort((a, b) => {
    if (sort === "top") {
      const dl = b.comment.likes_count - a.comment.likes_count;
      if (dl !== 0) return dl;
    }
    return (
      new Date(b.comment.created_at).getTime() -
      new Date(a.comment.created_at).getTime()
    );
  });
  return roots;
}
