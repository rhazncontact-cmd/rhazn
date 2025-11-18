// app/rz-admin-agents.tsx
import { AntDesign, Feather } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function RZAdminAgents() {
  const router = useRouter();

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10,
    onPanResponderMove: (_, g) => {
      if (g.dx < -70) router.back();
    }
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
        <Text style={styles.title}>Agents — RHAZN</Text>

        <TouchableOpacity onPress={() => router.push("/rz-admin-wallet")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Vérification & Validation Agents</Text>
      <Animated.View style={[styles.divider, { backgroundColor: glowColor }]} />

      <ScrollView style={{ paddingHorizontal: 18 }}>
        
        {[1,2,3].map((id) => (
          <View key={id} style={styles.userCard}>
            <View>
              <Text style={styles.userName}>Utilisateur #{id}</Text>
              <Text style={styles.userInfo}>Niveau: Aspirant Agent</Text>
            </View>

            <View style={styles.actionBtns}>
              <TouchableOpacity style={styles.approve}>
                <Feather name="check" size={20} color="#0f0" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.reject}>
                <AntDesign name="close" size={20} color="#f00" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

      </ScrollView>

      <Text style={styles.footer}>Sanctification du réseau RHAZN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 999
  },
  title: {
    fontSize: 20,
    fontWeight: "500",
    color: "#FFD700"
  },
  subtitle: {
    color: "#C7C7C7",
    fontSize: 14,
    marginLeft: 22,
    marginTop: 135, 
    marginBottom: 6
  },
  logo: { width: 42, height: 42, resizeMode: "contain" },
  divider: {
    height: 2,
    width: "48%",
    marginLeft: 22,
    marginBottom: 20,
    borderRadius: 8
  },
  userCard: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  userName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  userInfo: { color: "#888", fontSize: 12, marginTop: 4 },
  actionBtns: { flexDirection: "row", gap: 12, alignItems: "center" },
  approve: { backgroundColor: "#07390c", padding: 8, borderRadius: 8 },
  reject: { backgroundColor: "#3a0000", padding: 8, borderRadius: 8 },
  footer: {
    color: "#555",
    fontSize: 11,
    marginTop: 12,
    textAlign: "center"
  }
});
