import * as React from "react";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { LIMITS } from "../core/constants";
import type { ThemePalette } from "./theme";

interface Props {
  palette: ThemePalette;
  placeholder: string;
  submitLabel: string;
  initialValue?: string;
  /** Focus the field on mount. Default true (reply/edit forms). Pass false for
   *  a persistent composer so entering a view doesn't pop the keyboard. */
  autoFocus?: boolean;
  onCancel: () => void;
  onSubmit: (content: string) => Promise<void>;
}

export function CommentForm({
  palette,
  placeholder,
  submitLabel,
  initialValue = "",
  autoFocus = true,
  onCancel,
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const content = value.trim();
    if (content.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(content);
      setValue(""); // clear so persistent composers (thread reply box) reset
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setValue("");
    setError(null);
    onCancel();
  }

  return (
    <View style={{ gap: 6, marginTop: 6 }}>
      <TextInput
        autoFocus={autoFocus}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        maxLength={LIMITS.COMMENT_CONTENT_MAX}
        multiline
        editable={!submitting}
        style={{
          color: palette.text,
          fontSize: 14,
          fontFamily: palette.fontFamily,
          minHeight: 48,
          paddingVertical: 4,
          borderBottomWidth: 1,
          borderBottomColor: palette.accent,
        }}
      />
      {error ? (
        <Text style={{ color: palette.danger, fontSize: 12 }}>{error}</Text>
      ) : null}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        <Pressable
          onPress={handleCancel}
          disabled={submitting}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            paddingHorizontal: 12,
            paddingVertical: 6,
          })}
        >
          <Text style={{ color: palette.textMuted, fontWeight: "600" }}>
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
            paddingHorizontal: 12,
            paddingVertical: 6,
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
    </View>
  );
}
