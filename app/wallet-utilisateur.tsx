import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { BackHandler, useEffect, useRef } from "react";
import { Animated, Easing, Image, PanResponder, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useWallet } from "../context/WalletContext";

export default function WalletUtilisateurRHAZN() {
  const router = useRouter();
  const { balance, tanBalance, transactions } = useWallet();

  /** ✅ Full immersive Mode **/
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  /** ✅ Swipe controls **/
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15,
    onPanResponderMove: (_, g) => {
      if (g.dx < -80) router.back();
      if (g.dx > 80) return;
      if (g.dy > 80) return;
      if (g.dy < -80) BackHandler.exitApp();
    },
  });

  /** ✅ Glow animation — FIXED **/
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#2ecc71", "#8ef6b0"]
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ✅ Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Utilisateur RHAZN</Text>
        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image source={require("../assets/images/rhazn-logo.png")} style={{ width: 45, height: 45 }} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 150, paddingTop: 150 }}>

        {/* ✅ Solde Cards */}
        <View style={styles.balanceContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.label}>Solde ACSET</Text>
            <Text style={styles.value}>{balance}</Text>
            <Text style={styles.sub}>Non transférable</Text>
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.label}>Solde TAN</Text>
            <Animated.Text style={[styles.value, { color: glowColor }]}>
              {tanBalance ?? 0}
            </Animated.Text>
            <Text style={styles.sub}>Utilisé pour visionnage</Text>
          </View>
        </View>

        {/* ✅ Menu */}
        <View style={styles.grid}>
          <MenuCard icon={<Feather name="send" size={26} color="#FFD700" />} label="Envoyer TAN" onPress={() => router.push("/send-tan-user")} />
          <MenuCard icon={<MaterialIcons name="account-balance-wallet" size={26} color="#FF9800" />} label="Retrait TAN (Agent)" onPress={() => router.push("/withdraw-tan")} />
          <MenuCard icon={<Ionicons name="location" size={26} color="#4ade80" />} label="Trouver Agent RZ" onPress={() => router.push("/agents")} />
          <MenuCard icon={<Ionicons name="time-outline" size={26} color="#9CA3AF" />} label="Historique" onPress={() => router.push("/transactions")} />
        </View>

        {/* ✅ Règlements */}
        <Text style={styles.sectionTitle}>Règlements</Text>

        <View style={styles.rulesBox}>
          <Text style={styles.rule}>• 1 TAN = 50 secondes</Text>
          <Text style={styles.rule}>• 1 ACSET = 10 publications + 510 TAN</Text>
          <Text style={styles.rule}>• Visionnage MIN: 10 TAN</Text>
          <Text style={styles.rule}>• ACSET ≠ Transférable</Text>
          <Text style={styles.rule}>• TAN non convertissable en ACSET</Text>
          <Text style={styles.rule}>• Retrait TAN via Agent RZ uniquement</Text>
        </View>

      </ScrollView>
    </View>
  );
}

/*************** Menu Card Component ***************/
function MenuCard({ icon, label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuCard}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
  );
}

/*************** Styles ***************/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    position: "absolute", top: 12, left: 0, right: 0,
    paddingTop: 50, paddingHorizontal: 20, paddingBottom: 6,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },

  title: { fontSize: 27, fontWeight: "700", color: "#D4AF37" },

  balanceContainer: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20 },

  balanceCard: {
    width: "48%", backgroundColor: "#111", paddingVertical: 20,
    borderRadius: 14, borderWidth: 1, borderColor: "#222", alignItems: "center",
  },

  label: { color: "#888", fontSize: 13 },
  value: { color: "#fff", fontSize: 38, fontWeight: "800", marginVertical: 4 },
  sub: { color: "#666", fontSize: 12 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 30 },

  menuCard: {
    width: "48%", backgroundColor: "#111", paddingVertical: 18, marginBottom: 16,
    borderRadius: 14, borderWidth: 1, borderColor: "#222", alignItems: "center",
  },

  iconBox: { backgroundColor: "#222", padding: 12, borderRadius: 10, marginBottom: 8 },
  menuText: { color: "#fff", fontSize: 13, textAlign: "center" },

  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginLeft: 20, marginVertical: 10 },

  rulesBox: { backgroundColor: "#111", borderRadius: 12, marginHorizontal: 20, padding: 14, borderWidth: 1, borderColor: "#222" },
  rule: { color: "#aaa", fontSize: 12, marginBottom: 4 },
});
