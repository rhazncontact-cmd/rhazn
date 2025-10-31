import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

export default function WelcomeScreen() {
  const router = useRouter();

  // ⏳ Redirection automatique vers /auth après 5 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/auth");
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* 🖤 Titre principal */}
      <Animated.View entering={FadeInUp.duration(1200)}>
        <Text style={styles.title}>BIENVENUE DANS RHAZN...!</Text>
      </Animated.View>

      {/* 🩶 Sous-titres */}
      <Animated.View entering={FadeInUp.duration(1200).delay(600)}>
        <Text style={styles.subtitle}>
          Le réseau où ton temps devient une récompense.
        </Text>
        <Text style={styles.subtitle}>
          Ensemble, bâtissons une économie du mérite !
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // 🌿 fond blanc pur
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    color: "#000000", // noir profond
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    color: "#7E7E7E", // gris doux
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
});
