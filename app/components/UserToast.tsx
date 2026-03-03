// app/components/UserToast.tsx
import { StyleSheet, Text, View } from "react-native";

export default function UserToast({
  message,
}: {
  message: string | null;
}) {
  if (!message) return null;

  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 90,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 9999,
  },
  toastText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
