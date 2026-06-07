import * as React from "react";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { ApiError, type Client } from "../core/client";
import { formatTime } from "../core/helpers";
import type { Post, ReportReason } from "../core/types";
import { Avatar } from "./Avatar";
import { CommentForm } from "./CommentForm";
import { FeaturesContext } from "./context";
import { FeedImage } from "./FeedImage";
import { avatarBorderRadius, type ThemePalette } from "./theme";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "스팸/광고" },
  { value: "harassment", label: "괴롭힘/혐오" },
  { value: "adult", label: "음란/선정성" },
  { value: "privacy", label: "개인정보 노출" },
  { value: "other", label: "기타" },
];

function reportMenu(title: string, onPick: (r: ReportReason) => void) {
  const buttons = REPORT_REASONS.map((r) => ({
    text: r.label,
    onPress: () => onPick(r.value),
  }));
  buttons.push({ text: "취소", onPress: () => undefined });
  Alert.alert("신고 사유", title, buttons as never);
}

interface Props {
  palette: ThemePalette;
  post: Post;
  client: Client;
  projectId: string;
  ownAuthorId: string | null;
  canInteract: boolean;
  dateFormat: "relative" | "absolute";
  onConnect: () => void;
  onBack: () => void;
  onToggleLike: (id: string) => void;
  onDelete: (id: string) => void;
  onReport: (id: string, reason: ReportReason) => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onReplyAdded: () => void;
  /** Canonical URL to share for this post. Null/undefined → hide share button. */
  shareUrl?: string | null;
}

/** Post detail / thread: the post in full, a reply composer, and the replies. */
export function FeedPostDetail({
  palette,
  post,
  client,
  projectId,
  ownAuthorId,
  canInteract,
  dateFormat,
  onConnect,
  onBack,
  onToggleLike,
  onDelete,
  onReport,
  onEdit,
  onReplyAdded,
  shareUrl,
}: Props) {
  const features = useContext(FeaturesContext);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const isOwn = !!ownAuthorId && post.author_id === ownAuthorId;
  const display = post.nickname || post.author_id.slice(0, 8);
  const deleted = post.is_deleted;
  const liked = post.liked_by_me;
  const font = palette.fontFamily;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .listReplies({ project_id: projectId, post_id: post.id, limit: 100 })
      .then((res) => {
        if (!cancelled) setReplies(res.posts);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, projectId, post.id]);

  async function submitReply(text: string) {
    if (!canInteract) {
      onConnect();
      throw new ApiError(401, "UNAUTHORIZED", "패스포트 연결이 필요합니다");
    }
    const { post: reply } = await client.createPost({
      project_id: projectId,
      content: text,
      parent_id: post.id,
    });
    setReplies((prev) => [...prev, reply]);
    onReplyAdded();
  }

  async function submitEdit(text: string) {
    await onEdit(post.id, text);
    setEditing(false);
  }

  async function doShare() {
    if (!shareUrl) return;
    const text = post.content?.trim();
    try {
      if (Platform.OS === "ios") {
        await Share.share(text ? { url: shareUrl, message: text } : { url: shareUrl });
      } else {
        // Android ignores `url` — fold the link into the message.
        await Share.share({ message: text ? `${text}\n${shareUrl}` : shareUrl });
      }
    } catch {
      // dismissed or unavailable — ignore
    }
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
            {
              text: "삭제",
              style: "destructive",
              onPress: () => {
                onDelete(post.id);
                onBack();
              },
            },
          ]),
      });
    } else {
      options.push({
        text: "신고",
        onPress: () => reportMenu("왜 이 포스트를 신고하나요?", (r) => onReport(post.id, r)),
      });
    }
    options.push({ text: "취소", style: "cancel" });
    Alert.alert("포스트", undefined, options as never);
  }

  const showMenu = features.menu && !deleted && (isOwn || features.report);

  const header = (
    <View>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
          paddingVertical: 12,
          alignSelf: "flex-start",
        })}
      >
        <Text style={{ color: palette.accent, fontSize: 14, fontWeight: "700", fontFamily: font }}>
          ← 피드
        </Text>
      </Pressable>

      {/* Main post */}
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          paddingBottom: palette.gap,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        }}
      >
        {features.avatars ? (
          <Avatar
            seed={post.author_id}
            label={post.nickname}
            size={44}
            radius={avatarBorderRadius(44, palette.avatarShape)}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <Text style={{ color: palette.text, fontWeight: "700", fontSize: 15, fontFamily: font }}>
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
            <Text style={{ color: palette.textMuted, fontStyle: "italic", marginTop: 4, fontFamily: font }}>
              삭제된 포스트입니다
            </Text>
          ) : post.content ? (
            <Text
              style={{
                color: palette.text,
                fontSize: Math.round(palette.fontSize * 1.15),
                lineHeight: Math.round(palette.fontSize * 1.6),
                marginTop: 4,
                fontFamily: font,
              }}
            >
              {post.content}
            </Text>
          ) : null}

          {post.image_url && !deleted && !editing ? (
            <FeedImage uri={post.image_url} palette={palette} variant="full" />
          ) : null}

          {!deleted && !editing && (features.likes || shareUrl) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 22, marginTop: 10 }}>
              {features.likes ? (
                <Pressable
                  onPress={() => onToggleLike(post.id)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={liked ? "좋아요 취소" : "좋아요"}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Text style={{ color: liked ? palette.like : palette.textMuted, fontSize: 16 }}>
                    {liked ? "♥" : "♡"}
                  </Text>
                  <Text
                    style={{
                      color: liked ? palette.like : palette.textMuted,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {post.likes_count}
                  </Text>
                </Pressable>
              ) : null}
              {shareUrl ? (
                <Pressable
                  onPress={doShare}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="공유"
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Text style={{ color: palette.textMuted, fontSize: 14 }}>🔗</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 13, fontWeight: "600" }}>
                    공유
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {/* Reply composer */}
      {features.composer && !deleted ? (
        <View style={{ paddingVertical: 8 }}>
          <CommentForm
            palette={palette}
            placeholder="답글을 작성하세요"
            submitLabel="답글"
            autoFocus={false}
            onCancel={() => undefined}
            onSubmit={submitReply}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={replies}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      ListEmptyComponent={
        loading ? (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : (
          <Text
            style={{
              color: palette.textMuted,
              textAlign: "center",
              paddingVertical: 24,
              fontSize: 13,
              fontFamily: font,
            }}
          >
            첫 답글을 남겨보세요.
          </Text>
        )
      }
      renderItem={({ item }) => (
        <ReplyRow
          palette={palette}
          reply={item}
          client={client}
          ownAuthorId={ownAuthorId}
          canInteract={canInteract}
          dateFormat={dateFormat}
          onConnect={onConnect}
          onReport={onReport}
        />
      )}
    />
  );
}

function ReplyRow({
  palette,
  reply,
  client,
  ownAuthorId,
  canInteract,
  dateFormat,
  onConnect,
  onReport,
}: {
  palette: ThemePalette;
  reply: Post;
  client: Client;
  ownAuthorId: string | null;
  canInteract: boolean;
  dateFormat: "relative" | "absolute";
  onConnect: () => void;
  onReport: (id: string, reason: ReportReason) => void;
}) {
  const features = useContext(FeaturesContext);
  const [liked, setLiked] = useState(reply.liked_by_me);
  const [likes, setLikes] = useState(reply.likes_count);
  const [deleted, setDeleted] = useState(reply.is_deleted);
  const isOwn = !!ownAuthorId && reply.author_id === ownAuthorId;
  const display = reply.nickname || reply.author_id.slice(0, 8);
  const font = palette.fontFamily;

  async function toggleLike() {
    if (!canInteract) {
      onConnect();
      return;
    }
    const was = liked;
    setLiked(!was);
    setLikes((n) => n + (was ? -1 : 1));
    try {
      const r = was ? await client.unlikePost(reply.id) : await client.likePost(reply.id);
      setLiked(r.liked_by_me);
      setLikes(r.likes_count);
    } catch {
      setLiked(was);
      setLikes((n) => n + (was ? 1 : -1));
    }
  }

  function openMenu() {
    const options: {
      text: string;
      onPress?: () => void;
      style?: "destructive" | "cancel";
    }[] = [];
    if (isOwn) {
      options.push({
        text: "삭제",
        style: "destructive",
        onPress: () => {
          void client.deletePost(reply.id).catch(() => undefined);
          setDeleted(true);
        },
      });
    } else {
      options.push({
        text: "신고",
        onPress: () => reportMenu("왜 이 답글을 신고하나요?", (r) => onReport(reply.id, r)),
      });
    }
    options.push({ text: "취소", style: "cancel" });
    Alert.alert("답글", undefined, options as never);
  }

  const showMenu = features.menu && !deleted && (isOwn || features.report);

  return (
    <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
      {features.avatars ? (
        <Avatar
          seed={reply.author_id}
          label={reply.nickname}
          size={32}
          radius={avatarBorderRadius(32, palette.avatarShape)}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <Text style={{ color: palette.text, fontWeight: "700", fontSize: 13, fontFamily: font }}>
            {display}
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>·</Text>
          <Text style={{ color: palette.textMuted, fontSize: 12, fontFamily: font }}>
            {formatTime(reply.created_at, dateFormat)}
          </Text>
          {showMenu ? (
            <Pressable
              onPress={openMenu}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="답글 메뉴"
              style={{ marginLeft: "auto", paddingHorizontal: 4 }}
            >
              <Text style={{ color: palette.textMuted, fontSize: 18, lineHeight: 18 }}>⋯</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Speech-bubble content */}
        <View
          style={{
            alignSelf: "flex-start",
            marginTop: 4,
            backgroundColor: palette.surface,
            borderRadius: 14,
            borderTopLeftRadius: 4,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              color: deleted ? palette.textMuted : palette.text,
              fontStyle: deleted ? "italic" : "normal",
              fontSize: palette.fontSize,
              lineHeight: Math.round(palette.fontSize * 1.43),
              fontFamily: font,
            }}
          >
            {deleted ? "삭제된 답글입니다" : reply.content}
          </Text>
        </View>

        {!deleted && features.likes ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <Pressable
              onPress={toggleLike}
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
                {likes}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
