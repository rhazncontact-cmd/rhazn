import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated, Easing, Image, PanResponder, StatusBar,
    StyleSheet, Text, TouchableOpacity, View
} from "react-native";

export default function RZAdminQOB() {
  const router = useRouter();

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {});
  }, []);

  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15,
    onPanResponderMove: (_, g) => { if (g.dx < -70) router.back(); },
  });

  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: ["#A37E00", "#FFD700"] });

  return (
    <View style={s.container} {...pan.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>RZ-ADMIN · QOB</Text>
        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image source={require("../assets/images/rhazn-logo.png")} style={s.logo} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 120 }} />

      <Text style={s.subtitle}>Contrôle Classements / QOB</Text>
      <Animated.View style={[s.divider, { backgroundColor: glowColor }]} />

      <View style={s.cards}>
        <AdminCard icon={<Feather name="bar-chart-2" size={26} color="#FACC15" />} title="1. Classement QOB" onPress={() => router.push("/rz-admin-qob-ranking")} />
        <AdminCard icon={<Ionicons name="podium" size={26} color="#FFD700" />} title="2. Top 10 — Mérite" onPress={() => router.push("/rz-admin-qob-top10")} />
        <AdminCard icon={<Feather name="award" size={26} color="#22c55e" />} title="3. Prix d'Honneur & CIR" onPress={() => router.push("/rz-admin-qob-prizes")} />
        <AdminCard icon={<MaterialIcons name="verified" size={26} color="#60a5fa" />} title="4. Validation QOB & Scores" onPress={() => router.push("/rz-admin-qob-validate")} />
        <AdminCard icon={<Feather name="activity" size={26} color="#a78bfa" />} title="5. Statistiques d’Engagement" onPress={() => router.push("/rz-admin-qob-stats")} />
        <AdminCard icon={<MaterialIcons name="restart-alt" size={26} color="#ef4444" />} title="6. Réinitialisation Cycle" onPress={() => router.push("/rz-admin-qob-reset")} />
      </View>

      <Text style={s.footer}>RHAZN — Sanctuaire du Mérite</Text>
    </View>
  );
}

function AdminCard({ icon, title, onPress }: { icon: React.ReactNode; title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      {icon}
      <Text style={s.cardText}>{title}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { position: "absolute", top: 15, left: 0, right: 0, paddingTop: 40, paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0,0,0,0.55)", zIndex: 9 },
  title: { fontSize: 22, fontWeight: "400", color: "#FFD700", opacity: 0.9, letterSpacing: 1 },
  subtitle: { color: "#C7C7C7", fontSize: 14, marginLeft: 22, marginBottom: 6 },
  logo: { width: 50, height: 50, resizeMode: "contain" },
  divider: { height: 2, width: "50%", marginLeft: 22, marginBottom: 24, borderRadius: 8 },
  cards: { paddingHorizontal: 18, gap: 14 },
  card: { backgroundColor: "#0B0B0B", borderRadius: 14, paddingVertical: 20, borderWidth: 1, borderColor: "#222", flexDirection: "row", alignItems: "center", gap: 14, paddingLeft: 18 },
  cardText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  footer: { color: "#6C6C6C", textAlign: "left", marginLeft: 22, marginTop: 32, fontSize: 11 },
});
