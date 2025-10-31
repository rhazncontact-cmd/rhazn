import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

export default function FluxIntro() {
  const router = useRouter();
  const scale = useSharedValue(1);

  // 🌟 Animation douce (pulsation sacrée)
  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.10, { duration: 1400 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // ✅ Transition automatique vers le Flux après 5s
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/flux");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Grappe animée */}
      <Animated.Image
        entering={FadeIn.duration(1000).delay(200)}
        source={require("../assets/images/grape.png")}
        style={[styles.icon, animatedStyle]}
        resizeMode="contain"
      />

      {/* Texte sacré */}
      <Animated.View entering={FadeInDown.duration(1200).delay(700)}>
        <Text style={styles.title}>BIENVENUE</Text>
        <Text style={styles.subtitle}>dans le Flux du Mérite</Text>
        <Text style={styles.goldText}>
          Là où l’authenticité devient valeur
        </Text>
      </Animated.View>
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
  icon: {
    width: 165,
    height: 165,
    marginBottom: 30,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 1.2,
  },
  subtitle: {
    color: "#D3D3D3",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "600",
  },
  goldText: {
    color: "#FFD700",
    fontSize: 16,
    textAlign: "center",
    fontStyle: "italic",
    fontWeight: "500",
  },
});
