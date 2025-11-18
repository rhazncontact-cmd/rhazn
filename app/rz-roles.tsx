// ================================================
// RZ-ROLES — Page des rôles RHAZN
// Logique :
// ADMIN → code secret (déjà en place)
// AGENT → code secret
// UTILISATEUR → redirection selon TAN
// VIDEO-INFOS → libre
// APPLY-AGENT → libre
// ================================================

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase"; // 🔥 Supabase import

export default function RZRoles() {
  const router = useRouter();
  const glow = useRef(new Animated.Value(0)).current;

  // ===============================
  // 🔥 Animation Glow
  // ===============================
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#2ecc71", "#8ef6b0"],
  });

  // ===============================
  // 🔥 Navigation immersive
  // ===============================
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  // ===============================
  // 🔥 Swipe (gauche = back)
  // ===============================
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15,
    onPanResponderMove: (_, g) => {
      if (g.dx < -80) router.back();
      if (g.dy < -80) BackHandler.exitApp();
    },
  });

  // ===============================
  // 🔥 Bouton : UTILISATEUR
  // Vérifie le TAN
  // ===============================
  const handleUserAccess = async () => {
    // Récupérer utilisateur connecté
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return router.push("/auth/login"); 
    }

    // Récupérer TAN dans la table users
    const { data, error } = await supabase
      .from("users")
      .select("tan")
      .eq("uid", user.id)
      .single();

    if (error || !data) {
      return router.push("/no-acset");
    }

    const tan = data.tan ?? 0;

    // Condition RHAZN
    if (tan >= 100) {
      router.push("/rz-user-dashboard");
    } else {
      router.push("/no-acset");
    }
  };

  // ===============================
  // 🔥 BOUTON AGENT (protégé par code)
  // ===============================
  const goAgentDashboard = () => {
    router.push("/rz-agent-dashboard");
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>

        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={{ width: 45, height: 45, resizeMode: "contain" }}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140, paddingTop: 150 }}>
        
        {/* ADMIN CARD */}
        <TouchableOpacity
          style={[styles.balanceCard, { height: 180 }]}
          onPress={() => router.push("/rz-admin-key")}
        >
          <MaterialIcons name="security" size={60} color="#FFD700" />
          <Text style={styles.adminTitle}>RZ-ADMIN CARD</Text>
          <Text style={styles.adminSub}>Accès Mérite · Contrôle · Système</Text>
        </TouchableOpacity>

        {/* GRID */}
        <View style={styles.actionGrid}>

          {/* AGENT */}
          <FeatureCard
            label="RZ-Agent"
            icon={<MaterialIcons name="send" size={26} color="#FFD700" />}
            onPress={goAgentDashboard}
          />

          {/* UTILISATEUR */}
          <FeatureCard
            label="Utilisateur"
            icon={<Ionicons name="swap-vertical" size={26} color="#4ade80" />}
            onPress={handleUserAccess}
          />

          {/* VIDEO-INFOS — pas de code */}
          <FeatureCard
            label="Video-Infos"
            icon={<MaterialIcons name="movie" size={26} color="#F97316" />}
            onPress={() => router.push("/video-infos")}
          />

          {/* APPLY-AGENT — pas de code */}
          <FeatureCard
            label="Postuler — Agent RZ"
            icon={<Feather name="user-plus" size={24} color="#D4AF37" />}
            onPress={() => router.push("/apply-agent")}
          />

        </View>

        {/* Divider animé */}
        <Animated.View
          style={{
            height: 2,
            backgroundColor: glowColor,
            marginTop: 18,
            marginBottom: 35,
            marginHorizontal: 24,
            borderRadius: 4,
          }}
        />
      </ScrollView>
    </View>
  );
}

/*********************
 * FEATURE CARD
 *********************/
function FeatureCard({ label, icon, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.featureCard}>
      <View style={styles.featureIcon}>{icon}</View>
      <Text style={styles.featureLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/*********************
 * STYLES
 *********************/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    position: "absolute",
    top: 25,
    left: 0,
    right: 0,
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 10,
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

  adminTitle: {
    color: "#FFD700",
    marginTop: 10,
    fontWeight: "700",
    fontSize: 16,
  },

  adminSub: {
    color: "#4ade80",
    fontSize: 12,
  },

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

  featureIcon: {
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },

  featureLabel: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
  },
});
