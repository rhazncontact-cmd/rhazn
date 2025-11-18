import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export default function SplashScreen() {
  const router = useRouter();

  // 💫 Valeur animée pour effet de pulsation
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.1, { duration: 1000 }), -1, true);

    const timer = setTimeout(() => {
      router.replace("/welcome"); // redirection vers la page suivante
    }, 7000); // durée totale 7 secondes

    return () => clearTimeout(timer);
  }, []);

  // 🔄 Style animé
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.Image
        entering={FadeIn.duration(1000)}
        exiting={FadeOut.duration(800)}
        source={require("@/assets/images/rhazn-logo.png")}
        style={[styles.logo, animatedStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 180,
  },
});
