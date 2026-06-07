import * as React from "react";
import { useState } from "react";
import { Image, View } from "react-native";
import type { ThemePalette } from "./theme";

interface Props {
  uri: string;
  palette: ThemePalette;
  /** "thumb" = fixed-height cover (timeline); "full" = natural aspect (detail). */
  variant: "thumb" | "full";
}

/** Renders a remote post image. Thumbnails use a fixed crop; full images derive
 *  their aspect ratio from the loaded source (clamped so extreme shapes stay sane). */
export function FeedImage({ uri, palette, variant }: Props) {
  const [aspect, setAspect] = useState(1.5);

  const frame = {
    marginTop: variant === "thumb" ? 8 : 10,
    borderRadius: palette.radius,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  };

  if (variant === "thumb") {
    return (
      <View style={frame}>
        <Image
          source={{ uri }}
          style={{ width: "100%", height: 200 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={frame}>
      <Image
        source={{ uri }}
        style={{ width: "100%", aspectRatio: aspect }}
        resizeMode="cover"
        onLoad={(e) => {
          const src = e.nativeEvent?.source;
          if (src?.width && src?.height) {
            setAspect(Math.min(1.9, Math.max(0.6, src.width / src.height)));
          }
        }}
      />
    </View>
  );
}
