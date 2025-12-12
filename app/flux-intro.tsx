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

  // =========================================
  // 🔐 VÉRIFICATION SESSION + CONTRAT
  // =========================================
  useEffect(() => {
    const checkAccess = async () => {
      const { data, error } = await supabase.auth.getUser();

      // 🔒 Pas de session → login obligatoire
      if (error || !data.user) {
        router.replace("/auth/login");
        return;
      }

      const uid = data.user.id;

      // 🔐 Vérifier acceptation du contrat
      const { data: profile, error: profileErr } = await supabase
        .from("users")
        .select("contract_accepted")
        .eq("uid", uid)
        .single();

      if (profileErr || !profile?.contract_accepted) {
        router.replace("/legal/contract");
        return;
      }

      // 🎬 Lancement intro + redirection
      startIntro();
    };

    checkAccess();

    return () => timerRef.current && clearTimeout(timerRef.current);
  }, []);

  // =========================================
  // 🎬 ANIMATION + REDIRECTION AUTOMATIQUE
  // =========================================
  const startIntro = () => {
    // Animation pulsation douce
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1400 }),
        withTiming(1, { duration: 1400 })
      ),
      -1,
      true
    );

    // Redirection après 10 secondes
    timerRef.current = setTimeout(() => {
      runOnJS(router.replace)("/rz-user-dashboard");
    }, 10000);
  };

  const animatedLogo = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // =========================================
  // 🎨 UI
  // =========================================
  return (
    <View style={styles.container}>
      {/* Logo RHAZN animé */}
      <Animated.View
        style={[styles.logoContainer, animatedLogo]}
        entering={FadeInUp.duration(1200).delay(400)}
      >
        <Image
          source={require("../assets/images/rz-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Texte : Titre */}
      <Animated.View entering={FadeInUp.duration(1200).delay(900)}>
        <Text style={styles.title}>Bienvenue - Menu principal</Text>
      </Animated.View>

      {/* Texte 1 */}
      <Animated.View entering={FadeInUp.duration(1200).delay(1500)}>
        <Text style={styles.subtitle}>
          Ici, chaque regard est un investissement inestimable.
        </Text>
      </Animated.View>

      {/* Texte 2 */}
      <Animated.View entering={FadeInUp.duration(1200).delay(2100)}>
        <Text style={styles.subtitle}>Donc, l’avenir se trouve ici.</Text>
      </Animated.View>

      {/* Signature */}
      <Animated.View entering={FadeInUp.duration(1200).delay(2700)}>
        <Text style={styles.signature}>Créer pour révéler des trésors cachés.</Text>
      </Animated.View>
    </View>
  );
}

// =========================================
// 🎨 STYLES
// =========================================
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
