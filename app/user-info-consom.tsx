// app/user-info-consom.tsx
// 🍎 RHAZN — Info page premium (fallback catégories non actives)
// - évite page introuvable
// - UX haut de gamme Apple-like
// - explique que seul SUSPENTZ est actif

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef } from "react";
import {
    Animated,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

/* 🍎 RHAZN — Apple-like premium */
const COLORS = {
  bg: "#FFFFFF",
  card: "#F5F6F8",
  cardWhite: "#FFFFFF",
  text: "#0A0A0A",
  gray: "#6B7280",
  muted: "#9CA3AF",
  border: "#E5E7EB",
  gold: "#D4AF37",
  blue: "#e6a501ff",
  dark: "#111827",
};

export default function UserInfoConsom() {
  const router = useRouter();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  // 🎬 animation d’entrée douce
  Animated.parallel([
    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }),
    Animated.spring(scale, {
      toValue: 1,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }),
  ]).start();

  const goBackToSuspentz = () => {
    Haptics.selectionAsync().catch(() => {});
    router.replace("/banq/suspentz");
  };

  const goBackToPublish = () => {
    Haptics.selectionAsync().catch(() => {});
    router.replace("/user-publish-pact");
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <Animated.View
        style={[
          styles.card,
          {
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        {/* ===== ICON ===== */}
        <View style={styles.iconWrap}>
          <Ionicons name="construct-outline" size={28} color={COLORS.blue} />
        </View>

        {/* ===== TITLE ===== */}
        <Text style={styles.title}>Fonction en préparation</Text>

        {/* ===== MESSAGE ===== */}
        <Text style={styles.message}>
          Cette catégorie de publication n’est pas encore disponible.
          {"\n\n"}
          Pour le moment, seule la publication SUSPENTZ est activée et pleinement
          fonctionnelle.
          {"\n\n"}
          Les autres formats (Audio, PACT, KozeSans, Images…) sont en cours
          d’intégration finale selon les standards premium RHAZN.
          {"\n\n"}
          Vous serez automatiquement informé dès leur activation officielle.
        </Text>

        {/* ===== CTA PRIMARY ===== */}
        <Pressable
          onPress={goBackToSuspentz}
          style={({ pressed }) => [
            styles.ctaPrimary,
            pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
          ]}
        >
          <Ionicons name="flash-outline" size={18} color="#fff" />
          <Text style={styles.ctaPrimaryText}>Publier un SUSPENTZ</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>

        {/* ===== CTA SECONDARY ===== */}
        <Pressable
          onPress={goBackToPublish}
          style={({ pressed }) => [
            styles.ctaGhost,
            pressed && { transform: [{ scale: 0.99 }], opacity: 0.9 },
          ]}
        >
          <Ionicons name="arrow-back-outline" size={16} color={COLORS.gray} />
          <Text style={styles.ctaGhostText}>Retour aux catégories</Text>
        </Pressable>

        {/* ===== FOOTER NOTE ===== */}
        <Text style={styles.footerNote}>
          RHAZN privilégie la perfection à la précipitation.
        </Text>
      </Animated.View>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.cardWhite,
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D9E6FF",
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
    textAlign: "center",
  },

  message: {
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 22,
    fontWeight: "700",
  },

  ctaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.blue,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginBottom: 10,
  },

  ctaPrimaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  ctaGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F9FAFB",
  },

  ctaGhostText: {
    color: COLORS.gray,
    fontWeight: "900",
    fontSize: 14,
  },

  footerNote: {
    marginTop: 18,
    fontSize: 12.5,
    color: COLORS.muted,
    fontWeight: "800",
    textAlign: "center",
  },
});
