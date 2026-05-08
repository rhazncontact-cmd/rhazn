// app/components/Badge.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type BadgeProps = {
  value: number;
};

export default function Badge({ value }: BadgeProps) {
  if (!Number.isFinite(value) || value <= 0) return null;

  const display = value > 9 ? "9+" : String(value);

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.text}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: -8,
    right: -10,

    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,

    borderRadius: 9,
    backgroundColor: "#FF3B30", // 🔴 Apple-style alert (plus lisible que gold)

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",

    zIndex: 50,
  },

  text: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
    textAlign: "center",
  },
});
