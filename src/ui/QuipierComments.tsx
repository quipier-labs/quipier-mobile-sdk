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
import {
  DEFAULT_API_BASE,
  DEFAULT_PASSPORT_APP_ORIGIN,
} from "../core/constants";
import { buildTree, type CommentNode, type SortKey } from "../core/helpers";
import {
  clearProjectSession,
  loadProjectSession,
  type ProjectSession,
  saveProjectSession,
} from "../core/storage";
import type { Comment, ReportReason } from "../core/types";
import { CommentItem } from "./CommentItem";
import { Composer } from "./Composer";
import {
  PassportWebViewModal,
  type PassportJoinResult,
} from "./PassportWebViewModal";
import { paletteFor, type ThemeMode } from "./theme";

export interface QuipierCommentsProps {
  apiKey: string;
  projectId: string;
  pageId: string;
  apiBase?: string;
  passportAppOrigin?: string;
  /** Light/dark theme. Default "auto" follows the OS. */
  theme?: ThemeMode | "auto";
  dateFormat?: "relative" | "absolute";
  maxDepth?: 1 | 2;
  sort?: SortKey;
  onComment?: (comment: Comment) => void;
}

export function QuipierComments(props: QuipierCommentsProps) {
  const {
    apiKey,
    projectId,
    pageId,
    apiBase = DEFAULT_API_BASE,
    passportAppOrigin = DEFAULT_PASSPORT_APP_ORIGIN,
    theme = "auto",
    dateFormat = "relative",
    maxDepth = 2,
    sort: initialSort = "top",
    onComment,
  } = props;

  const systemScheme = useColorScheme();
  const mode: ThemeMode =
    theme === "auto" ? (systemScheme === "dark" ? "dark" : "light") : theme;
  const palette = useMemo(() => paletteFor(mode), [mode]);

  const [session, setSession] = useState<ProjectSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [joinOpen, setJoinOpen] = useState(false);

  // Hydrate session from AsyncStorage on mount (or projectId change).
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

  // Platform.OS is one of "ios" | "android" | "web" | "windows" | "macos" — RN
  // ships the first two on the supported targets; anything else we don't claim
  // to support, so coerce to "ios" as a safe fallback (rare; never happens on
  // real devices). The server validates this value either way.
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

  // Fetch list when the page or page identity changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    client
      .listComments({ project_id: projectId, page_id: pageId, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setComments(res.comments);
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
  }, [client, projectId, pageId]);

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

  async function disconnect() {
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

  async function handleCreate(content: string) {
    if (!session) {
      openJoin();
      throw new ApiError(401, "UNAUTHORIZED", "패스포트 연결이 필요합니다");
    }
    const { comment } = await client.createComment({
      project_id: projectId,
      page_id: pageId,
      content,
    });
    setComments((prev) => [comment, ...prev]);
    onComment?.(comment);
  }

  async function handleReply(parentId: string, content: string) {
    if (!session) {
      openJoin();
      throw new ApiError(401, "UNAUTHORIZED", "패스포트 연결이 필요합니다");
    }
    const { comment } = await client.createComment({
      project_id: projectId,
      page_id: pageId,
      content,
      parent_id: parentId,
    });
    setComments((prev) => [...prev, comment]);
    onComment?.(comment);
  }

  async function handleEdit(id: string, content: string) {
    if (!session) {
      openJoin();
      throw new ApiError(401, "UNAUTHORIZED", "패스포트 연결이 필요합니다");
    }
    await client.updateComment(id, content);
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content } : c)),
    );
  }

  async function handleReport(id: string, reason: ReportReason) {
    if (!session) {
      openJoin();
      return;
    }
    try {
      await client.reportComment(id, reason);
      Alert.alert("신고 접수", "검토 후 조치됩니다.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearProjectSession(projectId);
        setSession(null);
      }
      setError(err instanceof Error ? err.message : "신고에 실패했습니다");
    }
  }

  async function handleDelete(id: string) {
    if (!session) return;
    try {
      await client.deleteComment(id);
      setComments((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, is_deleted: true, content: "" } : c,
        ),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearProjectSession(projectId);
        setSession(null);
      }
      setError(err instanceof Error ? err.message : "failed to delete");
    }
  }

  async function toggleLike(id: string) {
    if (!session) {
      openJoin();
      return;
    }
    let wasLiked = false;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        wasLiked = c.liked_by_me;
        return {
          ...c,
          liked_by_me: !c.liked_by_me,
          likes_count: c.likes_count + (c.liked_by_me ? -1 : 1),
        };
      }),
    );
    try {
      const result = wasLiked
        ? await client.unlikeComment(id)
        : await client.likeComment(id);
      setComments((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                likes_count: result.likes_count,
                liked_by_me: result.liked_by_me,
              }
            : c,
        ),
      );
    } catch (err) {
      // rollback on failure
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          return {
            ...c,
            liked_by_me: wasLiked,
            likes_count: c.likes_count + (wasLiked ? 1 : -1),
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

  async function loadMore() {
    if (!cursor) return;
    try {
      const res = await client.listComments({
        project_id: projectId,
        page_id: pageId,
        cursor,
        limit: 50,
      });
      setComments((prev) => [...prev, ...res.comments]);
      setCursor(res.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load more");
    }
  }

  function openSortMenu() {
    Alert.alert("정렬 기준", undefined, [
      { text: "인기순", onPress: () => setSort("top") },
      { text: "최신순", onPress: () => setSort("newest") },
      { text: "취소", style: "cancel" },
    ]);
  }

  const tree: CommentNode[] = useMemo(
    () => buildTree(comments, sort),
    [comments, sort],
  );
  const visibleCount = comments.filter((c) => !c.is_deleted).length;
  const composerSession = session
    ? { tokenId: session.projectTokenId, nickname: session.nickname }
    : null;

  const Header = (
    <View style={{ gap: 0 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: palette.text, fontWeight: "700", fontSize: 15 }}>
          댓글 {visibleCount}개
        </Text>
        <Pressable
          onPress={openSortMenu}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          })}
        >
          <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: "600" }}>
            {sort === "top" ? "인기순" : "최신순"} ▾
          </Text>
        </Pressable>
      </View>
      <Composer
        palette={palette}
        session={composerSession}
        onSubmit={handleCreate}
        onConnectRequest={openJoin}
        onDisconnect={disconnect}
      />
      {error ? (
        <Text
          style={{
            color: palette.danger,
            fontSize: 12,
            paddingVertical: 6,
          }}
        >
          {error}
        </Text>
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
            borderRadius: 18,
            borderWidth: 1,
            borderColor: palette.border,
          })}
        >
          <Text style={{ color: palette.text, fontWeight: "600", fontSize: 13 }}>
            더 보기
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() =>
          void Linking.openURL("https://quipier.com").catch(() => undefined)
        }
        style={{
          marginTop: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Text style={{ color: palette.textMuted, fontSize: 11 }}>
          powered by Quipier
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <FlatList
        data={tree}
        keyExtractor={(n) => n.comment.id}
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
              }}
            >
              아직 댓글이 없어요. 가장 먼저 남겨보세요.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <CommentItem
            palette={palette}
            node={item}
            ownAuthorId={session?.projectTokenId ?? null}
            onToggleLike={toggleLike}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReply={handleReply}
            onReport={handleReport}
            canReply={!!session}
            dateFormat={dateFormat}
            maxDepth={maxDepth}
          />
        )}
      />
      <PassportWebViewModal
        palette={palette}
        visible={joinOpen}
        projectId={projectId}
        passportAppOrigin={passportAppOrigin}
        onClose={() => setJoinOpen(false)}
        onResult={handlePassportResult}
      />
    </View>
  );
}
