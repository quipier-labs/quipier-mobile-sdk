import * as React from "react";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  /** Second arg carries an attached image data URL (feed posts only). */
  onSubmit: (content: string, image?: string | null) => Promise<void>;
  onConnectRequest: () => void;
  onDisconnect: () => void;
  placeholder?: string;
  /** Show an image-attach button (feed). Needs `onPickImage` to do anything. */
  allowImage?: boolean;
  /** App-supplied picker returning a `data:image/...` URL (or null if cancelled).
   *  Kept pluggable so the SDK never hard-depends on a native image-picker. */
  onPickImage?: () => Promise<string | null>;
  submitLabel?: string;
}

export function Composer({
  palette,
  session,
  onSubmit,
  onConnectRequest,
  onDisconnect,
  placeholder = "댓글 추가...",
  allowImage = false,
  onPickImage,
  submitLabel = "Post",
}: Props) {
  const features = useContext(FeaturesContext);
  const [value, setValue] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expanded = focused || value.length > 0 || !!image;
  const seed = session?.tokenId ?? "guest";
  const label = session?.nickname ?? null;

  async function handleSubmit() {
    const content = value.trim();
    if ((content.length === 0 && !image) || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(content, image);
      setValue("");
      setImage(null);
      setFocused(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "failed to post";
      const friendly =
        /blocked from (commenting|posting)/i.test(raw) || /차단/.test(raw)
          ? "이 패스포트는 운영자에 의해 차단되어 작성할 수 없습니다."
          : /this IP is blocked/i.test(raw)
            ? "이 위치(IP)에서는 일시적으로 작성이 차단됐어요. 잠시 후 다시 시도해주세요."
            : /quota exceeded/i.test(raw)
              ? "이 프로젝트의 한도에 도달해 잠시 작성이 막혔습니다."
              : /≤|too large|KB/i.test(raw)
                ? "이미지를 처리하지 못했어요. 다른 이미지로 다시 시도해주세요."
                : raw;
      setError(friendly);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setValue("");
    setImage(null);
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

  async function pickImage() {
    if (!session) {
      onConnectRequest();
      return;
    }
    if (!onPickImage || picking) return;
    setError(null);
    setPicking(true);
    try {
      const uri = await onPickImage();
      if (uri) {
        setImage(uri);
        setFocused(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지를 불러오지 못했습니다");
    } finally {
      setPicking(false);
    }
  }

  const canSubmit = (value.trim().length > 0 || !!image) && !submitting;

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
        {allowImage ? (
          <Pressable
            onPress={pickImage}
            disabled={picking}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="이미지 첨부"
            style={({ pressed }) => ({
              opacity: pressed || picking ? 0.5 : 1,
              paddingTop: 4,
              paddingHorizontal: 2,
            })}
          >
            {picking ? (
              <ActivityIndicator size="small" color={palette.textMuted} />
            ) : (
              <Text style={{ fontSize: 20 }}>🖼️</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {image ? (
        <View
          style={{
            borderRadius: palette.radius,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: palette.border,
            position: "relative",
          }}
        >
          <Image
            source={{ uri: image }}
            style={{ width: "100%", height: 180 }}
            resizeMode="cover"
          />
          <Pressable
            onPress={() => setImage(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="이미지 제거"
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, lineHeight: 18 }}>×</Text>
          </Pressable>
        </View>
      ) : null}

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
            disabled={!canSubmit}
            style={({ pressed }) => ({
              opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1,
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
              {submitLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
