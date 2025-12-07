// app/rz-admin/wallet.tsx

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    Image,
    PanResponder,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import AdminGuard from "../components/AdminGuard"; // ✅ même logique que agents.tsx

export default function RZAdminWallet() {
  const router = useRouter();

  // ============================================================
  // 🔥 Android Navigation Bar
  // ============================================================
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  // ============================================================
  // 🔥 Swipe gauche → retour
  // ============================================================
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15,
    onPanResponderMove: (_, g) => {
      if (g.dx < -70) router.back();
    },
  });

  // ============================================================
  // 🔥 Glow Animation
  // ============================================================
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#A37E00", "#FFD700"],
  });

  // ============================================================
  // 🔥 UI
  // ============================================================
  return (
    <AdminGuard>
      <View style={styles.container} {...panResponder.panHandlers}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>RZ-ADMIN</Text>

          <TouchableOpacity onPress={() => router.replace("/rz-user-dashboard")}>
            <Image
              source={require("../../assets/images/rhazn-logo.png")}
              style={styles.logo}
            />
          </TouchableOpacity>
        </View>

        {/* Spacer */}
        <View style={{ height: 135 }} />

        <Text style={styles.subtitle}>Autorité Sacrée du Mérite</Text>

        <Animated.View style={[styles.divider, { backgroundColor: glowColor }]} />

        {/* ====================================================== */}
        {/* MAIN GRID */}
        {/* ====================================================== */}
        <View style={styles.cards}>
          <AdminCard
            icon={<MaterialIcons name="security" size={30} color="#FFD700" />}
            title="Vérifier & Approuver Agents"
            onPress={() => router.push("/rz-admin/agents")}
          />

          <AdminCard
            icon={<MaterialIcons name="movie-filter" size={30} color="#4ade80" />}
            title="Validations Flux-Vidéos"
            onPress={() => router.push("/rz-admin/videos")}
          />

          <AdminCard
            icon={<Feather name="award" size={28} color="#FACC15" />}
            title="Contrôle Classements / QOB"
            onPress={() => router.push("/rz-admin/qob")}
          />

          <AdminCard
            icon={<Ionicons name="wallet" size={28} color="#22c55e" />}
            title="ACSET / TAN / Retraits"
            onPress={() => router.push("/rz-admin/finance")}
          />

          <AdminCard
            icon={<Feather name="shield-off" size={27} color="#ef4444" />}
            title="Anti-Fraude & Pureté"
            onPress={() => router.push("/rz-admin/ethics")}
          />
        </View>

        <Text style={styles.footer}>RHAZN — Sanctuaire du Mérite</Text>
      </View>
    </AdminGuard>
  );
}

/* =======================================================
   CARD COMPONENT
======================================================= */
function AdminCard({
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {icon}
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
  );
}

/* =======================================================
   STYLES
======================================================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    position: "absolute",
    top: 15,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 999,
  },

  title: {
    fontSize: 22,
    fontWeight: "400",
    color: "#FFD700",
    opacity: 0.85,
    letterSpacing: 1,
  },

  subtitle: {
    color: "#C7C7C7",
    fontSize: 14,
    marginLeft: 22,
    marginBottom: 6,
  },

  logo: { width: 50, height: 50, resizeMode: "contain" },

  divider: {
    height: 2,
    width: "46%",
    marginLeft: 22,
    marginBottom: 28,
    borderRadius: 8,
  },

  cards: { paddingHorizontal: 18, gap: 14 },

  card: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingLeft: 18,
  },

  cardText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  footer: {
    color: "#6C6C6C",
    marginLeft: 22,
    marginTop: 35,
    fontSize: 11,
  },
});
