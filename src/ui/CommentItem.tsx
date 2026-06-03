import * as React from "react";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import type { ReportReason } from "../core/types";
import { type CommentNode, formatTime } from "../core/helpers";
import { Avatar } from "./Avatar";
import { CommentForm } from "./CommentForm";
import type { ThemePalette } from "./theme";

interface Props {
  palette: ThemePalette;
  node: CommentNode;
  ownAuthorId: string | null;
  onToggleLike: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onReply: (parentId: string, content: string) => Promise<void>;
  onReport: (id: string, reason: ReportReason) => void;
  canReply: boolean;
  dateFormat?: "relative" | "absolute";
  maxDepth?: number;
  depth?: number;
  rootId?: string;
}

const REPLY_BATCH = 10;

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "스팸/광고" },
  { value: "harassment", label: "괴롭힘/혐오" },
  { value: "adult", label: "음란/선정성" },
  { value: "privacy", label: "개인정보 노출" },
  { value: "other", label: "기타" },
];

export function CommentItem({
  palette,
  node,
  ownAuthorId,
  onToggleLike,
  onDelete,
  onEdit,
  onReply,
  onReport,
  canReply,
  dateFormat = "relative",
  maxDepth = 2,
  depth = 0,
  rootId,
}: Props) {
  const { comment, children } = node;
  const repliesEnabled = maxDepth >= 2;
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [revealHidden, setRevealHidden] = useState(false);
  const [shownCount, setShownCount] = useState(REPLY_BATCH);
  const isOwn = !!ownAuthorId && comment.author_id === ownAuthorId;
  const display = comment.nickname || comment.author_id.slice(0, 8);
  const liked = comment.liked_by_me;
  const likesCount = comment.likes_count;
  const avatarSize = depth === 0 ? 32 : 24;
  const effectiveRootId = rootId ?? comment.id;

  const deletedNotice =
    comment.deleted_by_type === "operator"
      ? "운영자가 삭제한 댓글입니다"
      : comment.deleted_by_type === "passport"
        ? "사용자가 삭제한 댓글입니다"
        : "삭제된 댓글입니다";
  const isHidden = !!comment.is_hidden;

  async function submitReply(content: string) {
    await onReply(effectiveRootId, content);
    setReplying(false);
    setExpanded(true);
    setShownCount(Math.max(REPLY_BATCH, children.length + 1));
  }

  async function submitEdit(content: string) {
    await onEdit(comment.id, content);
    setEditing(false);
  }

  function openMenu() {
    const options: { text: string; onPress?: () => void; style?: "destructive" | "cancel" }[] = [];
    if (isOwn) {
      options.push({ text: "수정", onPress: () => setEditing(true) });
      options.push({
        text: "삭제",
        style: "destructive",
        onPress: () =>
          Alert.alert("댓글 삭제", "정말 삭제할까요?", [
            { text: "취소", style: "cancel" },
            {
              text: "삭제",
              style: "destructive",
              onPress: () => onDelete(comment.id),
            },
          ]),
      });
    } else {
      options.push({ text: "신고", onPress: openReportMenu });
    }
    options.push({ text: "취소", style: "cancel" });
    Alert.alert("댓글", undefined, options as never);
  }

  function openReportMenu() {
    const buttons = REPORT_REASONS.map((r) => ({
      text: r.label,
      onPress: () => onReport(comment.id, r.value),
    }));
    buttons.push({ text: "취소", onPress: () => undefined });
    Alert.alert("신고 사유", "왜 이 댓글을 신고하나요?", buttons as never);
  }

  const visibleChildren = expanded ? children.slice(0, shownCount) : [];
  const remaining = children.length - shownCount;
  const hasMore = expanded && remaining > 0;

  return (
    <View style={{ marginTop: depth === 0 ? 16 : 12 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Avatar seed={comment.author_id} label={comment.nickname} size={avatarSize} />
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <Text style={{ color: palette.text, fontWeight: "700", fontSize: 13 }}>
              {display}
            </Text>
            {comment.author_blocked ? (
              <View
                style={{
                  backgroundColor: palette.danger,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                  차단
                </Text>
              </View>
            ) : null}
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>·</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              {formatTime(comment.created_at, dateFormat)}
            </Text>
            {!comment.is_deleted && !isHidden ? (
              <Pressable
                onPress={openMenu}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="댓글 메뉴"
                style={{ marginLeft: "auto", paddingHorizontal: 4 }}
              >
                <Text style={{ color: palette.textMuted, fontSize: 18, lineHeight: 18 }}>
                  ⋯
                </Text>
              </Pressable>
            ) : null}
          </View>

          {editing && !comment.is_deleted && !isHidden ? (
            <CommentForm
              palette={palette}
              placeholder="댓글을 수정하세요"
              submitLabel="저장"
              initialValue={comment.content}
              onCancel={() => setEditing(false)}
              onSubmit={submitEdit}
            />
          ) : comment.is_deleted ? (
            <Text
              style={{
                color: palette.textMuted,
                fontStyle: "italic",
                marginTop: 4,
                fontSize: 13,
              }}
            >
              {deletedNotice}
            </Text>
          ) : isHidden ? (
            revealHidden ? (
              <View style={{ marginTop: 4, gap: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: palette.surface,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: palette.textMuted, fontSize: 12, flex: 1 }}>
                    운영자에 의해 숨겨진 댓글입니다.
                  </Text>
                  <Pressable onPress={() => setRevealHidden(false)}>
                    <Text
                      style={{ color: palette.accent, fontSize: 12, fontWeight: "700" }}
                    >
                      다시 숨기기
                    </Text>
                  </Pressable>
                </View>
                <Text style={{ color: palette.text, fontSize: 14, lineHeight: 20 }}>
                  {comment.content}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 4,
                  backgroundColor: palette.surface,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    color: palette.textMuted,
                    fontSize: 12,
                    fontStyle: "italic",
                    flex: 1,
                  }}
                >
                  이 댓글은 운영자에 의해 숨겨졌습니다.
                </Text>
                <Pressable onPress={() => setRevealHidden(true)}>
                  <Text
                    style={{ color: palette.accent, fontSize: 12, fontWeight: "700" }}
                  >
                    확인하기
                  </Text>
                </Pressable>
              </View>
            )
          ) : (
            <Text
              style={{
                color: palette.text,
                fontSize: 14,
                lineHeight: 20,
                marginTop: 2,
              }}
            >
              {comment.content}
            </Text>
          )}

          {!comment.is_deleted && !isHidden && !editing ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                marginTop: 6,
              }}
            >
              <Pressable
                onPress={() => onToggleLike(comment.id)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={liked ? "좋아요 취소" : "좋아요"}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text
                  style={{
                    color: liked ? palette.like : palette.textMuted,
                    fontSize: 14,
                  }}
                >
                  {liked ? "♥" : "♡"}
                </Text>
                <Text
                  style={{
                    color: liked ? palette.like : palette.textMuted,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {likesCount}
                </Text>
              </Pressable>
              {canReply && repliesEnabled ? (
                <Pressable
                  onPress={() => setReplying((v) => !v)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="답글"
                >
                  <Text
                    style={{
                      color: palette.textMuted,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    답글
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {replying ? (
            <CommentForm
              palette={palette}
              placeholder={`@${display}에게 답글…`}
              submitLabel="답글"
              initialValue={depth >= 1 ? `@${display} ` : ""}
              onCancel={() => setReplying(false)}
              onSubmit={submitReply}
            />
          ) : null}
        </View>
      </View>

      {repliesEnabled && children.length > 0 ? (
        <View style={{ marginTop: 4, marginLeft: avatarSize + 10 }}>
          {!expanded ? (
            <Pressable
              onPress={() => setExpanded(true)}
              style={{ paddingVertical: 6 }}
              accessibilityRole="button"
            >
              <Text style={{ color: palette.accent, fontSize: 12, fontWeight: "700" }}>
                ▾ 답글 {children.length}개
              </Text>
            </Pressable>
          ) : (
            <View>
              {visibleChildren.map((child) => (
                <CommentItem
                  key={child.comment.id}
                  palette={palette}
                  node={child}
                  ownAuthorId={ownAuthorId}
                  onToggleLike={onToggleLike}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onReply={onReply}
                  onReport={onReport}
                  canReply={canReply}
                  dateFormat={dateFormat}
                  maxDepth={maxDepth}
                  depth={depth + 1}
                  rootId={effectiveRootId}
                />
              ))}
              {hasMore ? (
                <Pressable
                  onPress={() => setShownCount((c) => c + REPLY_BATCH)}
                  style={{ paddingVertical: 6 }}
                >
                  <Text
                    style={{ color: palette.accent, fontSize: 12, fontWeight: "700" }}
                  >
                    답글 {Math.min(REPLY_BATCH, remaining)}개 더 보기
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setExpanded(false)}
                style={{ paddingVertical: 6 }}
              >
                <Text style={{ color: palette.accent, fontSize: 12, fontWeight: "700" }}>
                  ▴ 답글 숨기기
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
