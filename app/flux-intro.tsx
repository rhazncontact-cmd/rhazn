import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function FluxIntro() {
  const router = useRouter();
  const scale = useSharedValue(1);

  useEffect(() => {
    // 💫 Pulsation douce
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );

    // ⏳ Redirection après 10 secondes
    const timer = setTimeout(() => {
      runOnJS(router.replace)("/rz-roles");
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const animatedLogo = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>

      {/* ✅ Logo raisin pulsant */}
      <Animated.View style={[styles.logoContainer, animatedLogo]} entering={FadeInUp.duration(1200).delay(600)}>
        <Image
          source={require("@/assets/images/grape.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ✅ Titre */}
      <Animated.View entering={FadeInUp.duration(1200).delay(900)}>
        <Text style={styles.title}>Bienvenue le menu principal</Text>
      </Animated.View>

      {/* ✅ Texte 1 */}
      <Animated.View entering={FadeInUp.duration(1200).delay(1500)}>
        <Text style={styles.subtitle}>Ici, chaque regard est un investissement inestimable.</Text>
      </Animated.View>

      {/* ✅ Texte 2 */}
      <Animated.View entering={FadeInUp.duration(1200).delay(2200)}>
        <Text style={styles.subtitle}>l'avenir se trouve ici</Text>
      </Animated.View>

      {/* ✅ Signature */}
      <Animated.View entering={FadeInUp.duration(1200).delay(3000)}>
        <Text style={styles.signature}>Bienvenue chez vouz.</Text>
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
    padding: 24,
  },
  rLogo: {
    width: 120,
    height: 120,
    opacity: 0.9,
    marginBottom: 10,
  },
  logoContainer: {
    marginBottom: 25,
  },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 22,
    color: "#FFD700",
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 6,
    opacity: 0.95,
  },
  subtitle: {
    fontSize: 16,
    color: "#DDDDDD",
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 6,
    fontWeight: "300",
  },
  signature: {
    fontSize: 15,
    color: "#D4AF37",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
    opacity: 0.9,
  },
});
