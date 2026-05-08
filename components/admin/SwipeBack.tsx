import { useRouter } from "expo-router";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

export default function SwipeBackWrapper({ children }) {
  const router = useRouter();

  const swipe = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX < -60) {
        router.back();
      }
    })
    .activeOffsetX([-20, 20]) // bloque les swipes inutiles
    .failOffsetY([-20, 20]);  // bloque le vertical

  return (
    <GestureDetector gesture={swipe}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </GestureDetector>
  );
}
