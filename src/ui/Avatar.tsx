import * as React from "react";
import { Text, View } from "react-native";
import { avatarLetter, colorForSeed } from "../core/helpers";

interface Props {
  seed: string;
  label: string | null;
  size?: number;
}

export function Avatar({ seed, label, size = 32 }: Props) {
  const bg = colorForSeed(seed);
  const letter = avatarLetter(seed, label);
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#ffffff",
          fontSize: Math.round(size * 0.45),
          fontWeight: "700",
          includeFontPadding: false,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}
