import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/auth/login"); // ✅ redirige vers Login après intro
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      
      {/* ✅ Titre */}
      <Animated.View entering={FadeInUp.duration(1200).delay(300)}>
        <Text style={styles.title}>Bienvenue dans RHAZN</Text>
      </Animated.View>

      {/* ✅ Sous-textes */}
      <Animated.View entering={FadeInUp.duration(1200).delay(700)}>
        <Text style={styles.subtitle}>
          Ici, ton temps devient une valeur réelle.
        </Text>
        <Text style={styles.subtitle}>
          Ensemble, construisons l'économie du mérite.
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
    paddingHorizontal: 20,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 25,
  },
  title: {
    color: "#D4AF37",
    fontSize: 24,
    fontWeight: "500", // ✅ subtil, plus de gras
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#AAA",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 4,
    lineHeight: 22,
  },
});
