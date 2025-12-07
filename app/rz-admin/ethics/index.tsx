// app/rz-admin/ethics/index.tsx
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AdminGuard from "../../components/AdminGuard";

const GOLD = "#D4AF37";

function RZAdminEthics() {
  const router = useRouter();

  // =====================================================
  // 🔥 Glow animation
  // =====================================================
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ef4444", "#b91c1c"],
  });

  // =====================================================
  // 📱 Navigation Android Stable (toujours visible)
  // =====================================================
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  return (
    <AdminGuard>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={26} color={GOLD} />
          </TouchableOpacity>

          <Text style={styles.title}>Anti-Fraude & Pureté</Text>

          <TouchableOpacity onPress={() => router.push("/dashboard")}>
            <Ionicons name="home-outline" size={26} color={GOLD} />
          </TouchableOpacity>
        </View>

        {/* Divider animé */}
        <Animated.View style={[styles.divider, { backgroundColor: glowColor }]} />

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={styles.sectionTitle}>Analyse & Détection des anomalies</Text>

          <EthicsCard
            icon={<MaterialIcons name="search" size={28} color={GOLD} />}
            title="Détection des comportements suspects"
            onPress={() => router.push("/rz-admin-ethics/suspicious")}
          />

          <EthicsCard
            icon={<MaterialIcons name="block" size={28} color="#ef4444" />}
            title="Blocage des comptes suspects"
            onPress={() => router.push("/rz-admin-ethics/block-user")}
          />

          <EthicsCard
            icon={<MaterialIcons name="psychology" size={28} color="#FB923C" />}
            title="Analyse automatique IA"
            onPress={() => router.push("/rz-admin-ethics/ai-analysis")}
          />

          <EthicsCard
            icon={<MaterialIcons name="verified-user" size={28} color="#4ade80" />}
            title="Pureté & Authentification"
            onPress={() => router.push("/rz-admin-ethics/purity")}
          />
        </ScrollView>
      </View>
    </AdminGuard>
  );
}

// =====================================================
// CARD COMPONENT
// =====================================================
function EthicsCard({ icon, title, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Feather name="chevron-right" size={22} color="#777" />
    </TouchableOpacity>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 22 },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "800",
  },

  divider: {
    height: 2,
    borderRadius: 8,
    marginTop: 14,
    marginBottom: 26,
    width: "50%",
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 18,
  },

  card: {
    backgroundColor: "#111",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconWrap: {
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 12,
    borderColor: "#333",
    borderWidth: 1,
    marginRight: 14,
  },

  cardTitle: { color: "#fff", fontSize: 14, flex: 1 },
});

export default RZAdminEthics;
