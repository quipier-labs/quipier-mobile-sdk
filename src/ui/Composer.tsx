import * as React from "react";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { LIMITS } from "../core/constants";
import { Avatar } from "./Avatar";
import { FeaturesContext } from "./context";
import { avatarBorderRadius, type ThemePalette } from "./theme";

interface Props {
  palette: ThemePalette;
  session: { tokenId: string; nickname: string } | null;
  onSubmit: (content: string) => Promise<void>;
  onConnectRequest: () => void;
  onDisconnect: () => void;
  placeholder?: string;
}

export function Composer({
  palette,
  session,
  onSubmit,
  onConnectRequest,
  onDisconnect,
  placeholder = "댓글 추가...",
}: Props) {
  const features = useContext(FeaturesContext);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expanded = focused || value.length > 0;
  const seed = session?.tokenId ?? "guest";
  const label = session?.nickname ?? null;

  async function handleSubmit() {
    const content = value.trim();
    if (content.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(content);
      setValue("");
      setFocused(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "failed to post";
      const friendly =
        /blocked from commenting/i.test(raw) || /차단/.test(raw)
          ? "이 패스포트는 운영자에 의해 차단되어 댓글을 작성할 수 없습니다."
          : /this IP is blocked/i.test(raw)
            ? "이 위치(IP)에서는 일시적으로 댓글 작성이 차단됐어요. 잠시 후 다시 시도해주세요."
            : /quota exceeded/i.test(raw)
              ? "이 프로젝트의 댓글 한도에 도달해 잠시 작성이 막혔습니다."
              : raw;
      setError(friendly);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setValue("");
    setFocused(false);
    setError(null);
  }

  function handleFocus() {
    if (!session) {
      onConnectRequest();
      return;
    }
    setFocused(true);
  }

  return (
    <View
      style={{
        paddingVertical: 12,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
      }}
    >
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        {features.avatars ? (
          <Pressable
            onPress={() => session && onDisconnect()}
            accessibilityRole="button"
            accessibilityLabel={
              session ? `${session.nickname} 패스포트 연결 해제` : "패스포트 연결"
            }
          >
            <Avatar
              seed={seed}
              label={label}
              size={32}
              radius={avatarBorderRadius(32, palette.avatarShape)}
            />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={palette.textMuted}
            maxLength={LIMITS.COMMENT_CONTENT_MAX}
            multiline
            editable={!submitting}
            onFocus={handleFocus}
            onBlur={() => {
              if (!value) setFocused(false);
            }}
            style={{
              color: palette.text,
              fontSize: 14,
              fontFamily: palette.fontFamily,
              minHeight: expanded ? 56 : 32,
              paddingVertical: 4,
              borderBottomWidth: 1,
              borderBottomColor: focused ? palette.accent : palette.border,
            }}
          />
        </View>
      </View>

      {error ? (
        <Text style={{ color: palette.danger, fontSize: 12 }}>{error}</Text>
      ) : null}

      {expanded ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <Pressable
            onPress={handleCancel}
            disabled={submitting}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: palette.pillRadius,
            })}
          >
            <Text
              style={{ color: palette.textMuted, fontWeight: "600", fontFamily: palette.fontFamily }}
            >
              취소
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || value.trim().length === 0}
            style={({ pressed }) => ({
              opacity:
                submitting || value.trim().length === 0
                  ? 0.5
                  : pressed
                    ? 0.85
                    : 1,
              backgroundColor: palette.accent,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: palette.pillRadius,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            })}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={palette.accentText} />
            ) : null}
            <Text
              style={{ color: palette.accentText, fontWeight: "700", fontFamily: palette.fontFamily }}
            >
              {submitting ? "Posting…" : "Post"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
