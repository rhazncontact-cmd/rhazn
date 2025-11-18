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

export default function RZAdminVideos() {
  const router = useRouter();

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15,
    onPanResponderMove: (_, g) => {
      if (g.dx < -70) router.back();
      if (g.dx > 0) return;
      if (g.dy !== 0) return;
    },
  });

  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false })
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#A37E00", "#FFD700"]
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vidéos — RZ-ADMIN</Text>

        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </TouchableOpacity>
      </View>

      <View style={{ height: 135 }} />

      <Text style={styles.subtitle}>Contrôle Sacré des Flux-Vidéos</Text>

      <Animated.View style={[styles.divider, { backgroundColor: glowColor }]} />

      <View style={styles.cards}>

        {/* 🟡 NOUVELLE CARTE : Ajouter / Supprimer vidéos */}
        <AdminCard
          icon={<Feather name="folder-plus" size={26} color="#FFD700" />}
          title="Ajouter / Supprimer Vidéos"
          onPress={() => router.push("/rz-admin-videos-manage")}
        />

        <AdminCard
          icon={<Ionicons name="play-circle" size={28} color="#4ade80" />}
          title="Valider Vidéos"
          onPress={() => router.push("/rz-admin-videos-validate")}
        />

        <AdminCard
          icon={<MaterialIcons name="visibility" size={28} color="#38bdf8" />}
          title="Visionnage & Vérification"
          onPress={() => router.push("/rz-admin-videos-review")}
        />

        <AdminCard
          icon={<Feather name="search" size={26} color="#eab308" />}
          title="Détection Contenu Interdit"
          onPress={() => router.push("/rz-admin-videos-detect")}
        />

        <AdminCard
          icon={<Feather name="copy" size={26} color="#c084fc" />}
          title="Anti-Plagiat & Originalité"
          onPress={() => router.push("/rz-admin-videos-plagiarism")}
        />

        <AdminCard
          icon={<MaterialIcons name="block" size={28} color="#ef4444" />}
          title="Sanction / Suppression"
          onPress={() => router.push("/rz-admin-videos-ban")}
        />

        <AdminCard
          icon={<Feather name="bar-chart-2" size={26} color="#60a5fa" />}
          title="Statistiques Vidéos"
          onPress={() => router.push("/rz-admin-videos-stats")}
        />

      </View>

      <Text style={styles.footer}>Pureté du Contenu — RHAZN</Text>
    </View>
  );
}

function AdminCard({ icon, title, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {icon}
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    position: "absolute", top: 15, left: 0, right: 0,
    paddingTop: 40, paddingHorizontal: 20, paddingBottom: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 999
  },
  title: { fontSize: 22, fontWeight: "400", color: "#FFD700", opacity: 0.9, letterSpacing: 1 },
  subtitle: { color: "#C7C7C7", fontSize: 14, marginLeft: 22, marginBottom: 6 },
  logo: { width: 50, height: 50, resizeMode: "contain" },
  divider: { height: 2, width: "62%", marginLeft: 22, marginBottom: 28, borderRadius: 8 },
  cards: { paddingHorizontal: 18, gap: 14 },
  card: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: "#262626",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingLeft: 18
  },
  cardText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  footer: { color: "#6C6C6C", textAlign: "left", marginLeft: 22, marginTop: 35, fontSize: 11 }
});
