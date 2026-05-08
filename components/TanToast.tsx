import { StyleSheet, Text } from "react-native";
import Animated, {
    FadeInUp,
    FadeOutDown,
} from "react-native-reanimated";

export function TanToast({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutDown}
      style={styles.tanToast}
    >
      <Text style={styles.tanText}>+1 TAN</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tanToast: {
    position: "absolute",
    bottom: 160,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  tanText: {
    color: "#D4AF37",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
