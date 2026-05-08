// app/not-authorized.tsx
// ✅ RHAZN — Accès Refusé • Premium Apple-like

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const C = {
  bg:         "#000000",
  card:       "#0D0D0D",
  border:     "rgba(255,255,255,0.10)",
  white:      "#FFFFFF",
  muted:      "rgba(255,255,255,0.38)",
  mutedMed:   "rgba(255,255,255,0.62)",
  gold:       "#D4AF37",
  goldDim:    "rgba(212,175,55,0.09)",
  goldBorder: "rgba(212,175,55,0.22)",
  red:        "#FF453A",
  redDim:     "rgba(255,69,58,0.10)",
  redBorder:  "rgba(255,69,58,0.28)",
};

export default function NotAuthorizedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Animations
  const shieldS  = useRef(new Animated.Value(0.6)).current;
  const shieldOp = useRef(new Animated.Value(0)).current;
  const contentOp = useRef(new Animated.Value(0)).current;
  const contentY  = useRef(new Animated.Value(32)).current;
  const pulse     = useRef(new Animated.Value(1)).current;
  const glowOp    = useRef(new Animated.Value(0)).current;
  const lineW     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Shield in
    Animated.parallel([
      Animated.spring(shieldS,  { toValue: 1, damping: 14, stiffness: 160, useNativeDriver: true }),
      Animated.timing(shieldOp, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.timing(glowOp, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 200);

    // Content in
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOp, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(contentY,  { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
      Animated.timing(lineW, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    }, 420);

    // Pulse loop
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.07, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    }, 900);
  }, []);

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Grille de fond ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[...Array(9)].map((_, i) => (
          <View key={`h${i}`} style={[s.gridH, { top: `${i * 12}%` as any }]} />
        ))}
        {[...Array(7)].map((_, i) => (
          <View key={`v${i}`} style={[s.gridV, { left: `${i * 17}%` as any }]} />
        ))}
      </View>

      {/* ── Logo en haut à droite ── */}
      <View style={s.logoRow}>
        <Image source={require("../assets/images/rhazn-logo.png")} style={s.logo} resizeMode="contain" />
      </View>

      {/* ── Zone centrale ── */}
      <View style={s.main}>

        {/* Glow rouge */}
        <Animated.View style={[s.glowCircle, { opacity: glowOp }]} pointerEvents="none" />

        {/* Shield */}
        <Animated.View style={[s.shieldBox, { opacity: shieldOp, transform: [{ scale: shieldS }, { scale: pulse }] }]}>
          <View style={s.shieldRing1}>
            <View style={s.shieldRing2}>
              <Ionicons name="shield" size={56} color={C.red} />
              <View style={s.closeDot}>
                <Ionicons name="close" size={16} color={C.red} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Textes */}
        <Animated.View style={[s.texts, { opacity: contentOp, transform: [{ translateY: contentY }] }]}>

          <Text style={s.title}>Accès Refusé</Text>

          <Animated.View style={[s.line, { transform: [{ scaleX: lineW }] }]} />

          <Text style={s.subtitle}>
            Cet espace est réservé au{"\n"}
            <Text style={s.goldText}>Conseil Administratif RHAZN</Text>
          </Text>

          <Text style={s.body}>
            Chaque tentative est tracée, horodatée et{"\n"}
            jugée à la lumière de l'Administration.
          </Text>

          {/* Badge info */}
          <View style={s.badge}>
            <View style={s.badgeDot} />
            <Ionicons name="eye-outline" size={12} color={C.gold} />
            <Text style={s.badgeTxt}>Accès surveillé en temps réel</Text>
          </View>
        </Animated.View>
      </View>

      {/* ── Bouton retour ── */}
      <Animated.View style={[s.btnArea, { opacity: contentOp }]}>
        <TouchableOpacity
          style={s.btn}
          onPress={() => router.replace("/banq/suspentz" as any)}
          activeOpacity={0.88}
        >
          <Ionicons name="arrow-back" size={16} color="#000" />
          <Text style={s.btnTxt}>Retour à l'accueil</Text>
        </TouchableOpacity>

        <Text style={s.footer}>RHAZN · Sanctuaire du Mérite Absolu</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "space-between",
  },

  // Grille
  gridH: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "#FFFFFF", opacity: 0.04 },
  gridV: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: "#FFFFFF", opacity: 0.04 },

  // Logo
  logoRow: { alignItems: "flex-end", paddingRight: 24, paddingTop: 10 },
  logo:    { width: 42, height: 42, opacity: 0.85 },

  // Main zone
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 32,
  },

  // Glow
  glowCircle: {
    position: "absolute",
    width: 280, height: 280, borderRadius: 140,
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.15)",
    shadowColor: C.red,
    shadowOpacity: 0.4,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 0 },
  },

  // Shield
  shieldBox:  { alignItems: "center", justifyContent: "center" },
  shieldRing1: {
    width: 140, height: 140, borderRadius: 44,
    backgroundColor: C.redDim,
    borderWidth: 1.5, borderColor: C.redBorder,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.red, shadowOpacity: 0.30, shadowRadius: 40,
    shadowOffset: { width: 0, height: 10 }, elevation: 18,
  },
  shieldRing2: {
    width: 96, height: 96, borderRadius: 30,
    backgroundColor: "rgba(255,69,58,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  closeDot: {
    position: "absolute", bottom: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#000",
    borderWidth: 1, borderColor: C.redBorder,
    alignItems: "center", justifyContent: "center",
  },

  // Textes
  texts: { alignItems: "center", gap: 14, width: "100%" },
  title: {
    color: C.white,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  line: {
    width: 56, height: 2,
    backgroundColor: C.gold,
    borderRadius: 1,
    transformOrigin: "left center",
  },
  subtitle: {
    color: C.mutedMed,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },
  goldText: { color: C.gold, fontWeight: "900" },
  body: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 21,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.goldDim,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.goldBorder,
    marginTop: 4,
  },
  badgeDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.gold,
  },
  badgeTxt: { color: C.gold, fontWeight: "800", fontSize: 12 },

  // Bouton
  btnArea: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    gap: 16,
    alignItems: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: C.gold,
    borderRadius: 20,
    paddingVertical: 17,
    shadowColor: C.gold,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  btnTxt: { color: "#000", fontWeight: "900", fontSize: 16 },

  footer: {
    color: "rgba(255,255,255,0.15)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
});