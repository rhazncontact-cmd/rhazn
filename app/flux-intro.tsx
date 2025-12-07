import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
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
import { supabase } from "../lib/supabase";

export default function FluxIntro() {
  const router = useRouter();
  const scale = useSharedValue(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================
  // 🔐 VÉRIFICATION LÉGALE AVANT ACCÈS
  // ============================
  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 🚫 Pas de session → retour auth
      if (!user) {
        router.replace("/auth");
        return;
      }

      // 🔐 Vérification acceptation contrat
      const { data, error } = await supabase
        .from("users")
        .select("contract_accepted")
        .eq("uid", user.id)
        .single();

      if (error || !data?.contract_accepted) {
        router.replace("/legal/contract");
        return;
      }

      // ✅ Lancement animation + redirection normale
      startIntro();
    };

    checkAccess();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ============================
  // 🎬 ANIMATIONS + REDIRECTION
  // ============================
  const startIntro = () => {
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
    timerRef.current = setTimeout(() => {
      runOnJS(router.replace)("/rz-roles");
    }, 10000);
  };

  const animatedLogo = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // ============================
  // ✅ UI
  // ============================

  return (
    <View style={styles.container}>
      {/* ✅ Logo raisin pulsant */}
      <Animated.View
        style={[styles.logoContainer, animatedLogo]}
        entering={FadeInUp.duration(1200).delay(600)}
      >
        <Image
          source={require("@/assets/images/grape.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ✅ Titre */}
      <Animated.View entering={FadeInUp.duration(1200).delay(900)}>
        <Text style={styles.title}>Bienvenue dans le menu principal</Text>
      </Animated.View>

      {/* ✅ Texte 1 */}
      <Animated.View entering={FadeInUp.duration(1200).delay(1500)}>
        <Text style={styles.subtitle}>
          Ici, chaque regard est un investissement inestimable.
        </Text>
      </Animated.View>

      {/* ✅ Texte 2 */}
      <Animated.View entering={FadeInUp.duration(1200).delay(2200)}>
        <Text style={styles.subtitle}>L’avenir se trouve ici.</Text>
      </Animated.View>

      {/* ✅ Signature */}
      <Animated.View entering={FadeInUp.duration(1200).delay(3000)}>
        <Text style={styles.signature}>Bienvenue chez vous.</Text>
      </Animated.View>
    </View>
  );
}

// ============================
// 🎨 STYLES
// ============================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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
