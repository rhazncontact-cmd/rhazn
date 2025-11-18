import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, BackHandler, Easing, Image, PanResponder, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useWallet } from "../context/WalletContext";

export default function WalletRZAdmin() {
  const router = useRouter();
  const { balance } = useWallet();

  /** ✅ Immersive mode Android **/
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  /** ✅ Glow animation — FIX **/
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#2ecc71", "#8ef6b0"]
  });

  /** ✅ Swipe gestures **/
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15,
    onPanResponderMove: (_, g) => {
      if (g.dx < -80) router.back();       // swipe gauche → retour
      if (g.dx > 80) return;
      if (g.dy > 80) return;
      if (g.dy < -80) BackHandler.exitApp(); // swipe haut → quitter app
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ✅ Header */}
      <View style={styles.header}>
        <Text style={styles.title}>RZ-ADMIN</Text>
        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={{ width: 45, height: 45, resizeMode: "contain" }}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140, paddingTop: 150 }}>

        {/* ✅ Badge Admin */}
        <View style={[styles.balanceCard, { height: 180 }]}>
          <MaterialIcons name="security" size={60} color="#2ecc71" />
          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Espace Admin</Text>
        </View>

        {/* ✅ Gestion */}
        <Text style={styles.sectionTitle}>Gestion RHAZN</Text>

        <View style={styles.actionGrid}>

          <FeatureCard label="Créer Agent RZ" icon={<Feather name="user-plus" size={24} color="#FFD700" />} />
          <FeatureCard label="Vérifier Agent" icon={<MaterialIcons name="verified-user" size={26} color="#4ade80" />} />

          <FeatureCard label="Statistiques" icon={<Ionicons name="bar-chart-outline" size={26} color="#F97316" />} />
          <FeatureCard label="Paiements" icon={<MaterialIcons name="paid" size={26} color="#D4AF37" />} />

        </View>

        {/* ✅ Ligne animée */}
        <Animated.View
          style={{
            height: 2,
            backgroundColor: glowColor,
            marginTop: 18,
            marginBottom: 35,
            marginHorizontal: 24,
            borderRadius: 4,
            shadowColor: "#AFFFCC",
            shadowOpacity: 0.9,
            shadowRadius: 6,
          }}
        />

        <Text style={styles.sectionTitle}>À venir…</Text>
      </ScrollView>
    </View>
  );
}

/*************** Feature Card ***************/
function FeatureCard({ label, icon }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>{icon}</View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

/*************** Styles ***************/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    position: "absolute", top: 10, left: 0, right: 0,
    paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10,
    backgroundColor: "#000",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 999,
  },

  title: { fontSize: 28, fontWeight: "700", color: "#D4AF37" },

  balanceCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d0d0d",
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1B3B1B",
    padding: 22,
  },

  sectionTitle: { fontSize: 18, color: "#fff", fontWeight: "600", textAlign: "center", marginBottom: 10 },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
  },

  featureCard: {
    width: "48%",
    backgroundColor: "#111",
    paddingVertical: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
  },

  featureIcon: { backgroundColor: "#222", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#333" },
  featureLabel: { color: "#fff", fontSize: 13, textAlign: "center" },
});
