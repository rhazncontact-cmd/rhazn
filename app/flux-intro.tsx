// ======================================================
// RHAZN — FLUX INTRO PREMIUM FINAL
// Intro philosophique → TOUJOURS → legal/contract
// Apple-like • Fintech • Moral Gate
// ======================================================

import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { supabase } from "../lib/supabase";

/* ======================================================
COMPONENT
====================================================== */

export default function FluxIntro() {
  const router = useRouter();

  const scale = useSharedValue(1);
  const float = useSharedValue(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* ======================================================
  🔐 SESSION GUARD STRICT
  ====================================================== */

  useEffect(() => {
    let alive = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      // ❌ pas connecté → login
      if (!session) {
        router.replace("/auth/login");
        return;
      }

      startIntro();
    })();

    return () => {
      alive = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /* ======================================================
  INTRO ANIMATION + REDIRECTION
  ====================================================== */

  const startIntro = () => {
    /* breathing logo */
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1600 }),
        withTiming(1, { duration: 1600 })
      ),
      -1,
      true
    );

    /* floating card */
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );

    /* ======================================================
    🔥 CRITICAL RULE RHAZN
    Toujours → CONTRAT
    ====================================================== */

    timerRef.current = setTimeout(() => {
      runOnJS(router.replace)("/legal/contract");
    }, 9500);
  };

  /* ======================================================
  ANIM STYLES
  ====================================================== */

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  /* ======================================================
  UI
  ====================================================== */

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.card, cardStyle]}
        entering={FadeIn.duration(700)}
      >
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require("../assets/images/rz-logo-trans.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(300).duration(700)}
          style={styles.title}
        >
          Bienvenue dans RHAZN
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(700).duration(700)}
          style={styles.subtitle}
        >
          Le premier écosystème où le temps devient valeur.
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(1200).duration(900)}
          style={styles.body}
        >
          Chaque seconde compte.{"\n"}
          Chaque action génère du TAN.{"\n"}
          Chaque vision crée une opportunité.
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(1800).duration(900)}
          style={styles.signature}
        >
          RHAZN n’est pas une application.{"\n"}
          C’est une économie morale du temps.
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

/* ======================================================
STYLES — APPLE / FINTECH PREMIUM
====================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },

  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 26,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 20,
  },

  logoWrap: {
    marginBottom: 22,
  },

  logo: {
    width: 110,
    height: 110,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#000",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    marginBottom: 16,
  },

  body: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111",
    textAlign: "center",
    marginBottom: 18,
    fontWeight: "500",
  },

  signature: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#D4AF37",
    textAlign: "center",
    fontWeight: "600",
  },
});
