import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
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
  View
} from "react-native";

import AdminGuard from "../../components/admin/AdminGuard";

export default function RZAdminEthics() {
  const router = useRouter();

  /** Mode immersif uniquement */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {});
  }, []);

  /** Gold Divine Glow */
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        })
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#9A7F00", "#FFD700"]
  });

  return (
    <AdminGuard>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* HEADER */}
        <View style={styles.header}>

          {/* BOUTON RETOUR */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={25} color="#FFD700" />
          </TouchableOpacity>

          <Text style={styles.title}>Anti-Fraude & Pureté</Text>

          <TouchableOpacity onPress={() => router.push("/dashboard")}>
            <Image
              source={require("../../assets/images/rhazn-logo.png")}
              style={styles.logo}
            />
          </TouchableOpacity>
        </View>

        <View style={{ height: 135 }} />

        {/* Subtitle */}
        <Text style={styles.subtitle}>Gardien de la Pureté Morale</Text>

        <Animated.View style={[styles.divider, { backgroundColor: glowColor }]} />

        {/* Tools */}
        <View style={styles.cards}>

          <EthicCard
            icon={<Feather name="eye-off" size={26} color="#ef4444" />}
            title="Scanner de contenus suspects"
            desc="Détection IA — langage, attitude, moralité"
            onPress={() => router.push("/rz-admin-ethics/scanner")}
          />

          <EthicCard
            icon={<MaterialIcons name="gavel" size={27} color="#FACC15" />}
            title="Avertissements / Sanctions"
            desc="Journal moral & actions disciplinaires"
            onPress={() => router.push("/rz-admin-ethics/sanctions")}
          />

          <EthicCard
            icon={<Feather name="cpu" size={26} color="#22c55e" />}
            title="IA Pureté-Score"
            desc="Analyse intelligente du comportement"
            onPress={() => router.push("/rz-admin-ethics/purity-score")}
          />

          <EthicCard
            icon={<Feather name="users" size={26} color="#60a5fa" />}
            title="Signalements Communauté"
            desc="Traitement & validation des plaintes"
            onPress={() => router.push("/rz-admin-ethics/reports")}
          />

        </View>

        <Text style={styles.footer}>RHAZN — Sanctuaire de Pureté</Text>
      </View>
    </AdminGuard>
  );
}

function EthicCard({ icon, title, desc, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {icon}
      <View>
        <Text style={styles.cardText}>{title}</Text>
        <Text style={styles.cardSub}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ---------------------------------- */
/*               STYLES               */
/* ---------------------------------- */

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
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 999
  },

  backBtn: {
    padding: 6,
    paddingRight: 12
  },

  title: {
    fontSize: 20,
    fontWeight: "400",
    color: "#FFD700",
    opacity: 0.92,
    letterSpacing: 1
  },

  subtitle: {
    color: "#C7C7C7",
    fontSize: 14,
    marginLeft: 22,
    marginBottom: 6
  },

  logo: {
    width: 50,
    height: 50,
    resizeMode: "contain"
  },

  divider: {
    height: 2,
    width: "48%",
    marginLeft: 22,
    marginBottom: 26,
    borderRadius: 8
  },

  cards: { paddingHorizontal: 18, gap: 14 },

  card: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingLeft: 18
  },

  cardText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cardSub: { color: "#999", fontSize: 11 },

  footer: {
    color: "#666",
    textAlign: "left",
    marginLeft: 22,
    marginTop: 34,
    fontSize: 11
  }
});
