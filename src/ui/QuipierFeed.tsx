import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { ApiError, type Client, createClient } from "../core/client";
import { DEFAULT_API_BASE, DEFAULT_PASSPORT_APP_ORIGIN } from "../core/constants";
import type { Appearance, Features } from "../core/customize";
import {
  clearProjectSession,
  loadProjectSession,
  type ProjectSession,
  saveProjectSession,
} from "../core/storage";
import type { Post, ReportReason } from "../core/types";
import { Composer } from "./Composer";
import { DEFAULT_FEATURES, FeaturesContext } from "./context";
import { FeedPostDetail } from "./FeedPostDetail";
import { FeedPostItem } from "./FeedPostItem";
import {
  PassportWebViewModal,
  type PassportJoinResult,
} from "./PassportWebViewModal";
import { resolveTheme, type ThemeMode } from "./theme";

export interface QuipierFeedProps {
  apiKey: string;
  projectId: string;
  apiBase?: string;
  passportAppOrigin?: string;
  /** Light/dark theme. Default "auto" follows the OS. */
  theme?: ThemeMode | "auto";
  dateFormat?: "relative" | "absolute";
  onPost?: (post: Post) => void;
  /** Theme tokens (colors, font, radius, spacing, avatar shape). */
  appearance?: Appearance;
  /** Turn whole UI features on/off (composer, likes, menu, report, badge, …). */
  features?: Features;
  /** App-supplied image picker returning a `data:image/...` URL (or null if
   *  cancelled). When provided, the composer shows an image-attach button.
   *  Kept pluggable so the SDK never hard-depends on a native picker library. */
  imagePicker?: () => Promise<string | null>;
}

/** Project-global feed (Feed module): users write posts, reply, and like.
 *  Twitter-style — the timeline lists posts; tapping one opens its thread. */
export function QuipierFeed(props: QuipierFeedProps) {
  const {
    apiKey,
    projectId,
    apiBase = DEFAULT_API_BASE,
    passportAppOrigin = DEFAULT_PASSPORT_APP_ORIGIN,
    theme = "auto",
    dateFormat = "relative",
    onPost,
    appearance,
    features: featuresProp,
    imagePicker,
  } = props;

  const systemScheme = useColorScheme();
  const mode: ThemeMode =
    theme === "auto" ? (systemScheme === "dark" ? "dark" : "light") : theme;
  const palette = useMemo(() => resolveTheme(mode, appearance), [mode, appearance]);
  const features = useMemo(
    () => ({ ...DEFAULT_FEATURES, ...(featuresProp ?? {}) }),
    [featuresProp],
  );

  const [session, setSession] = useState<ProjectSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  // null = timeline; set = post detail / thread view.
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSessionLoaded(false);
    loadProjectSession(projectId).then((s) => {
      if (cancelled) return;
      setSession(s);
      setSessionLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const clientPlatform: "ios" | "android" =
    Platform.OS === "android" ? "android" : "ios";

  const client: Client = useMemo(
    () =>
      createClient({
        apiBase,
        apiKey,
        client: clientPlatform,
        getToken: () => session?.sessionToken ?? null,
      }),
    [apiBase, apiKey, clientPlatform, session?.sessionToken],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    client
      .listFeed({ project_id: projectId, limit: 30 })
      .then((res) => {
        if (cancelled) return;
        setPosts(res.posts);
        setCursor(res.next_cursor);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, projectId]);

  const handlePassportResult = useCallback(
    (msg: PassportJoinResult) => {
      setJoinOpen(false);
      if (!msg.ok) {
        setError(msg.message ?? "passport connect cancelled");
        return;
      }
      if (
        msg.project_id !== projectId ||
        !msg.project_token_id ||
        !msg.session_token ||
        !msg.expires_at
      ) {
        return;
      }
      const next: ProjectSession = {
        projectId: msg.project_id,
        projectTokenId: msg.project_token_id,
        nickname: msg.nickname ?? "",
        sessionToken: msg.session_token,
        expiresAt: new Date(msg.expires_at).getTime(),
      };
      void saveProjectSession(next);
      setSession(next);
      setError(null);
    },
    [projectId],
  );

  function openJoin() {
    setJoinOpen(true);
  }

  function disconnect() {
    Alert.alert("패스포트", "이 프로젝트의 연결을 해제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "연결 해제",
        style: "destructive",
        onPress: async () => {
          await clearProjectSession(projectId);
          setSession(null);
        },
      },
      {
        text: "패스포트 관리",
        onPress: () =>
          void Linking.openURL(passportAppOrigin + "/me").catch(() => undefined),
      },
    ]);
  }

  async function handleCreate(content: string, image?: string | null) {
    if (!session) {
      openJoin();
      throw new ApiError(401, "UNAUTHORIZED", "패스포트 연결이 필요합니다");
    }
    const { post } = await client.createPost({
      project_id: projectId,
      content,
      image: image ?? undefined,
    });
    setPosts((prev) => [post, ...prev]);
    onPost?.(post);
  }

  async function handleEdit(id: string, content: string) {
    if (!session) {
      openJoin();
      throw new ApiError(401, "UNAUTHORIZED", "패스포트 연결이 필요합니다");
    }
    await client.updatePost(id, content);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, content } : p)));
  }

  async function handleDelete(id: string) {
    if (!session) return;
    try {
      await client.deletePost(id);
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_deleted: true, content: "", image_url: null } : p)),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearProjectSession(projectId);
        setSession(null);
      }
      setError(err instanceof Error ? err.message : "failed to delete");
    }
  }

  async function handleReport(id: string, reason: ReportReason) {
    if (!session) {
      openJoin();
      return;
    }
    try {
      await client.reportPost(id, reason);
      Alert.alert("신고 접수", "검토 후 조치됩니다.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearProjectSession(projectId);
        setSession(null);
      }
      setError(err instanceof Error ? err.message : "신고에 실패했습니다");
    }
  }

  async function toggleLike(id: string) {
    if (!session) {
      openJoin();
      return;
    }
    let wasLiked = false;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        wasLiked = p.liked_by_me;
        return {
          ...p,
          liked_by_me: !p.liked_by_me,
          likes_count: p.likes_count + (p.liked_by_me ? -1 : 1),
        };
      }),
    );
    try {
      const result = wasLiked ? await client.unlikePost(id) : await client.likePost(id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, likes_count: result.likes_count, liked_by_me: result.liked_by_me }
            : p,
        ),
      );
    } catch (err) {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            liked_by_me: wasLiked,
            likes_count: p.likes_count + (wasLiked ? 1 : -1),
          };
        }),
      );
      if (err instanceof ApiError && err.status === 401) {
        await clearProjectSession(projectId);
        setSession(null);
      }
      setError(err instanceof Error ? err.message : "failed to like");
    }
  }

  function handleReplyAdded() {
    if (!openPostId) return;
    setPosts((prev) =>
      prev.map((p) => (p.id === openPostId ? { ...p, reply_count: p.reply_count + 1 } : p)),
    );
  }

  async function loadMore() {
    if (!cursor) return;
    try {
      const res = await client.listFeed({ project_id: projectId, cursor, limit: 30 });
      setPosts((prev) => [...prev, ...res.posts]);
      setCursor(res.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load more");
    }
  }

  const composerSession = session
    ? { tokenId: session.projectTokenId, nickname: session.nickname }
    : null;
  // Keep deleted posts that still carry replies so threads stay reachable.
  const visible = posts.filter((p) => !p.is_deleted || p.reply_count > 0);
  const openPost = openPostId ? posts.find((p) => p.id === openPostId) ?? null : null;

  const Header = (
    <View>
      {features.composer ? (
        <Composer
          palette={palette}
          session={composerSession}
          onSubmit={handleCreate}
          onConnectRequest={openJoin}
          onDisconnect={disconnect}
          placeholder="무슨 생각을 하고 있나요?"
          submitLabel="게시"
          allowImage={!!imagePicker}
          onPickImage={imagePicker}
        />
      ) : null}
      {error ? (
        <Text style={{ color: palette.danger, fontSize: 12, paddingVertical: 6 }}>{error}</Text>
      ) : null}
    </View>
  );

  const Footer = (
    <View style={{ marginTop: 16, alignItems: "center", paddingBottom: 12 }}>
      {cursor ? (
        <Pressable
          onPress={loadMore}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: palette.pillRadius,
            borderWidth: 1,
            borderColor: palette.border,
          })}
        >
          <Text style={{ color: palette.text, fontWeight: "600", fontSize: 13, fontFamily: palette.fontFamily }}>
            더 보기
          </Text>
        </Pressable>
      ) : null}
      {features.badge ? (
        <Pressable
          onPress={() => void Linking.openURL("https://quipier.com").catch(() => undefined)}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: palette.textMuted, fontSize: 11 }}>powered by Quipier</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <FeaturesContext.Provider value={features}>
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        {openPost ? (
          <FeedPostDetail
            palette={palette}
            post={openPost}
            client={client}
            projectId={projectId}
            ownAuthorId={session?.projectTokenId ?? null}
            canInteract={!!session}
            dateFormat={dateFormat}
            onConnect={openJoin}
            onBack={() => setOpenPostId(null)}
            onToggleLike={toggleLike}
            onDelete={handleDelete}
            onReport={handleReport}
            onEdit={handleEdit}
            onReplyAdded={handleReplyAdded}
          />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(p) => p.id}
            ListHeaderComponent={Header}
            ListFooterComponent={Footer}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ListEmptyComponent={
              loading || !sessionLoaded ? (
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
                    fontFamily: palette.fontFamily,
                  }}
                >
                  아직 포스트가 없어요. 가장 먼저 남겨보세요.
                </Text>
              )
            }
            renderItem={({ item }) => (
              <FeedPostItem
                palette={palette}
                post={item}
                ownAuthorId={session?.projectTokenId ?? null}
                onOpen={() => setOpenPostId(item.id)}
                onToggleLike={toggleLike}
                onDelete={handleDelete}
                onReport={handleReport}
                onEdit={handleEdit}
                dateFormat={dateFormat}
              />
            )}
          />
        )}
        <PassportWebViewModal
          palette={palette}
          visible={joinOpen}
          projectId={projectId}
          passportAppOrigin={passportAppOrigin}
          onClose={() => setJoinOpen(false)}
          onResult={handlePassportResult}
        />
      </View>
    </FeaturesContext.Provider>
  );
}
