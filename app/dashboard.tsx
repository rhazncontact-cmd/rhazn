import { Entypo, Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

export default function Dashboard() {
  const router = useRouter();

  const menu = [
    {
      title: "Accéder au Flux du Mérite",
      desc: "Découvrez les PACT authentiques",
      icon: "film-outline",
      route: "/flux", // ✅ correction: aller direct au flux
      IconLib: Ionicons,
    },
    {
      title: "Explorer",
      desc: "Classements, créateurs, tendances",
      icon: "search",
      route: "/explorer",
      IconLib: Feather,
    },
    {
      title: "Publier un PACT",
      desc: "Partagez votre talent authentique",
      icon: "upload",
      route: "/publish",
      IconLib: Feather,
    },
    {
      title: "Notifications",
      desc: "QOB reçus, classements, alertes",
      icon: "notifications-outline",
      route: "/notifications",
      IconLib: Ionicons,
      badge: true,
    },
    {
      title: "Mon Profil",
      desc: "Statistiques, PACT, paramètres",
      icon: "user",
      route: "/profile",
      IconLib: Feather,
    },
    {
      title: "Wallet",
      desc: "ACSET, TAN et transactions",
      icon: "wallet",
      route: "/wallet",
      IconLib: Entypo,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Explorer RHAZN</Text>
          <Text style={styles.subtitle}>Le mérite se découvre, se crée et se partage</Text>
        </View>

        <View style={styles.menuContainer}>
          {menu.map((item, i) => (
            <Animated.View key={i} entering={FadeInUp.delay(i * 120)}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push(item.route)}
              >
                <View style={styles.menuIcon}>
                  <item.IconLib name={item.icon} size={24} color="#D4AF37" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDesc}>{item.desc}</Text>
                </View>

                <Feather name="chevron-right" size={22} color="rgba(212,175,55,0.6)" />

                {item.badge && <View style={styles.badge} />}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerTxt}>
          Propulsé par <Text style={styles.brand}>RHAZN</Text>
        </Text>
        <View style={styles.indicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { paddingHorizontal: 20, marginTop: 60, marginBottom: 15 },
  title: { fontSize: 32, fontWeight: "700", color: "#D4AF37", marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#aaa" },
  menuContainer: { paddingHorizontal: 20, marginTop: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    marginBottom: 14,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
    marginRight: 15,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.4)",
  },
  menuTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  menuDesc: { color: "#888", fontSize: 12, marginTop: 4 },
  badge: {
    width: 10,
    height: 10,
    backgroundColor: "#FF3B30",
    borderRadius: 50,
    marginLeft: 6,
  },
  footer: { position: "absolute", bottom: 10, alignSelf: "center", alignItems: "center" },
  footerTxt: { color: "#666", fontSize: 12 },
  brand: { color: "#D4AF37", fontWeight: "700" },
  indicator: { width: 120, height: 4, backgroundColor: "#333", borderRadius: 100, marginTop: 6 },
});
