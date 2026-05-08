// ─────────────────────────────────────────────────────────────
// RHAZN — FLUX INTRO
// Intro philosophique — nouveaux membres uniquement
// Après l'animation → routing intelligent selon état du profil
// ─────────────────────────────────────────────────────────────

import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";

import { supabase } from "../lib/supabase";

export default function FluxIntro() {
  const router   = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const aliveRef = useRef(true);

  // Animations
  const scale = useSharedValue(1);
  const float = useSharedValue(0);

  useEffect(() => {
    aliveRef.current = true;

    // ── Vérification session ──
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!aliveRef.current) return;

      // Pas de session → login
      if (!session?.user?.id) {
        router.replace("/auth/login");
        return;
      }

      // ── Lancer l'intro visuelle ──
      startAnimations();

      // ── Router après l'intro (7 secondes) ──
      timerRef.current = setTimeout(async () => {
        if (!aliveRef.current) return;
        await routeAfterIntro(session.user.id);
      }, 7000);
    };

    init();

    return () => {
      aliveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Routing intelligent ──
  const routeAfterIntro = async (uid: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("contract_accepted_at, signature_accepted_at")
        .eq("id", uid)
        .maybeSingle();

      if (!aliveRef.current) return;

      // Pas de contrat → contrat
      if (!profile?.contract_accepted_at) {
        router.replace("/legal/contract");
        return;
      }
      // Contrat OK mais pas signature → signature
      if (!profile?.signature_accepted_at) {
        router.replace("/legal/signature");
        return;
      }
      // Tout complet → accueil
      router.replace("/banq/suspentz");
    } catch {
      if (aliveRef.current) router.replace("/legal/contract");
    }
  };

  const startAnimations = () => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1600 }),
        withTiming(1.00, { duration: 1600 }),
      ),
      -1,
      true,
    );
    float.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 2000 }),
        withTiming(0,  { duration: 2000 }),
      ),
      -1,
      true,
    );
  };

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <View style={s.screen}>
      <Animated.View
        style={[s.card, cardStyle]}
        entering={FadeIn.duration(700)}
      >
        {/* Logo */}
        <Animated.View style={[s.logoWrap, logoStyle]}>
          <Image
            source={require("../assets/images/rz-logo-trans.png")}
            style={s.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Textes */}
        <Animated.Text
          entering={FadeInUp.delay(300).duration(700)}
          style={s.title}
        >
          Bienvenue dans RHAZN
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(700).duration(700)}
          style={s.subtitle}
        >
          Le premier écosystème où le temps devient valeur.
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(1200).duration(900)}
          style={s.body}
        >
          Chaque seconde compte.{"\n"}
          Chaque action génère du TAN.{"\n"}
          Chaque vision crée une opportunité.
        </Animated.Text>

        {/* Séparateur doré */}
        <Animated.View
          entering={FadeInUp.delay(1800).duration(700)}
          style={s.divider}
        />

        <Animated.Text
          entering={FadeInUp.delay(2200).duration(900)}
          style={s.signature}
        >
          RHAZN n'est pas une application.{"\n"}
          C'est une économie morale du temps.
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 38,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.30,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 20 },
    elevation: 22,
    gap: 0,
  },
  logoWrap: { marginBottom: 20 },
  logo:     { width: 100, height: 100 },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: "#555555",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: "#111111",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    marginBottom: 18,
  },
  signature: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#D4AF37",
    textAlign: "center",
    fontWeight: "700",
    lineHeight: 19,
  },
});