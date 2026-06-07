import * as React from "react";
import { useContext, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { formatTime } from "../core/helpers";
import type { Post, ReportReason } from "../core/types";
import { Avatar } from "./Avatar";
import { CommentForm } from "./CommentForm";
import { FeaturesContext } from "./context";
import { FeedImage } from "./FeedImage";
import { avatarBorderRadius, type ThemePalette } from "./theme";

interface Props {
  palette: ThemePalette;
  post: Post;
  ownAuthorId: string | null;
  /** Open the post's detail / thread view. */
  onOpen: () => void;
  onToggleLike: (id: string) => void;
  onDelete: (id: string) => void;
  onReport: (id: string, reason: ReportReason) => void;
  onEdit: (id: string, content: string) => Promise<void>;
  dateFormat?: "relative" | "absolute";
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "스팸/광고" },
  { value: "harassment", label: "괴롭힘/혐오" },
  { value: "adult", label: "음란/선정성" },
  { value: "privacy", label: "개인정보 노출" },
  { value: "other", label: "기타" },
];

/** A single post in the timeline. Twitter-style: tapping the row opens the
 *  post's thread; replies are NOT expanded inline. */
export function FeedPostItem({
  palette,
  post,
  ownAuthorId,
  onOpen,
  onToggleLike,
  onDelete,
  onReport,
  onEdit,
  dateFormat = "relative",
}: Props) {
  const features = useContext(FeaturesContext);
  const [editing, setEditing] = useState(false);
  const isOwn = !!ownAuthorId && post.author_id === ownAuthorId;
  const display = post.nickname || post.author_id.slice(0, 8);
  const deleted = post.is_deleted;
  const liked = post.liked_by_me;
  const font = palette.fontFamily;

  async function submitEdit(text: string) {
    await onEdit(post.id, text);
    setEditing(false);
  }

  function openMenu() {
    const options: {
      text: string;
      onPress?: () => void;
      style?: "destructive" | "cancel";
    }[] = [];
    if (isOwn) {
      options.push({ text: "수정", onPress: () => setEditing(true) });
      options.push({
        text: "삭제",
        style: "destructive",
        onPress: () =>
          Alert.alert("포스트 삭제", "정말 삭제할까요?", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: () => onDelete(post.id) },
          ]),
      });
    } else {
      options.push({ text: "신고", onPress: openReportMenu });
    }
    options.push({ text: "취소", style: "cancel" });
    Alert.alert("포스트", undefined, options as never);
  }

  function openReportMenu() {
    const buttons = REPORT_REASONS.map((r) => ({
      text: r.label,
      onPress: () => onReport(post.id, r.value),
    }));
    buttons.push({ text: "취소", onPress: () => undefined });
    Alert.alert("신고 사유", "왜 이 포스트를 신고하나요?", buttons as never);
  }

  const showMenu = features.menu && !deleted && (isOwn || features.report);

  return (
    <Pressable
      onPress={() => {
        if (!editing) onOpen();
      }}
      accessibilityRole="button"
      style={({ pressed }) => ({
        opacity: pressed && !editing ? 0.96 : 1,
        marginTop: palette.gap,
        paddingBottom: palette.gap,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
      })}
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        {features.avatars ? (
          <Avatar
            seed={post.author_id}
            label={post.nickname}
            size={40}
            radius={avatarBorderRadius(40, palette.avatarShape)}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <Text style={{ color: palette.text, fontWeight: "700", fontSize: 14, fontFamily: font }}>
              {display}
            </Text>
            {post.author_blocked ? (
              <View
                style={{
                  backgroundColor: palette.danger,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>차단</Text>
              </View>
            ) : null}
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>·</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12, fontFamily: font }}>
              {formatTime(post.created_at, dateFormat)}
            </Text>
            {showMenu ? (
              <Pressable
                onPress={openMenu}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="포스트 메뉴"
                style={{ marginLeft: "auto", paddingHorizontal: 4 }}
              >
                <Text style={{ color: palette.textMuted, fontSize: 18, lineHeight: 18 }}>⋯</Text>
              </Pressable>
            ) : null}
          </View>

          {editing && !deleted ? (
            <CommentForm
              palette={palette}
              placeholder="포스트를 수정하세요"
              submitLabel="저장"
              initialValue={post.content}
              onCancel={() => setEditing(false)}
              onSubmit={submitEdit}
            />
          ) : deleted ? (
            <Text
              style={{
                color: palette.textMuted,
                fontStyle: "italic",
                marginTop: 4,
                fontSize: 13,
                fontFamily: font,
              }}
            >
              삭제된 포스트입니다
            </Text>
          ) : post.content ? (
            <Text
              style={{
                color: palette.text,
                fontSize: palette.fontSize,
                lineHeight: Math.round(palette.fontSize * 1.43),
                marginTop: 2,
                fontFamily: font,
              }}
            >
              {post.content}
            </Text>
          ) : null}

          {post.image_url && !deleted && !editing ? (
            <FeedImage uri={post.image_url} palette={palette} variant="thumb" />
          ) : null}

          {!deleted && !editing ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 8 }}
            >
              {features.likes ? (
                <Pressable
                  onPress={() => onToggleLike(post.id)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={liked ? "좋아요 취소" : "좋아요"}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Text style={{ color: liked ? palette.like : palette.textMuted, fontSize: 14 }}>
                    {liked ? "♥" : "♡"}
                  </Text>
                  <Text
                    style={{
                      color: liked ? palette.like : palette.textMuted,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {post.likes_count}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onOpen}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="답글 보기"
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text style={{ color: palette.textMuted, fontSize: 13 }}>💬</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: "600" }}>
                  답글{post.reply_count > 0 ? ` ${post.reply_count}` : ""}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
