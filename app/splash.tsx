// app/splash.tsx — RHAZN Apple Transition 🍇 → Logo

import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
} from "react-native";

export default function SplashScreen() {
  const router = useRouter();

  // 🍇 Grape
  const grapeOpacity = useRef(new Animated.Value(1)).current;
  const grapeScale   = useRef(new Animated.Value(1)).current;

  // 🔥 Logo
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.85)).current;
  const logoGlow    = useRef(new Animated.Value(0)).current;

  // 🎬 Global fade
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
  Animated.sequence([

    // 🍇 1. Grape visible longtemps
    Animated.delay(4000),

    // 🍇 2. Disparition douce
    Animated.parallel([
      Animated.timing(grapeOpacity, {
        toValue: 0,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(grapeScale, {
        toValue: 1.15,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]),

    // 🔥 3. Apparition lente logo
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 3000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 3000,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(logoGlow, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    ]),

    // 🌬️ 4. Respiration longue (15 sec)
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 } // ≈ 15 sec
    ),

    // 🌑 5. Fade out lent
    Animated.timing(screenFade, {
      toValue: 0,
      duration: 6000,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }),

  ]).start(() => {
    router.replace("/flux-intro" as any);
  });
}, []);

  return (
    <Animated.View style={[s.container, { opacity: screenFade }]}>
      <StatusBar hidden />

      {/* 🍇 GRAPE */}
      <Animated.View
        style={{
          position: "absolute",
          opacity: grapeOpacity,
          transform: [{ scale: grapeScale }],
        }}
      >
        <Image
          source={require("../assets/images/grape.png")}
          style={s.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* 🔥 LOGO GLOW */}
      <Animated.View
        style={[
          s.glow,
          {
            opacity: logoGlow,
            transform: [{ scale: logoScale }],
          },
        ]}
      />

      {/* 🔥 LOGO */}
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
      >
        <Image
          source={require("../assets/images/rhazn-logo.png")}
          style={s.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 140,
    height: 140,
  },

  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(212,175,55,0.08)",
    shadowColor: "#D4AF37",
    shadowOpacity: 0.5,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 0 },
  },
});