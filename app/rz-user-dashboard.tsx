import { Entypo, Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import RZBottomSheet from "./components/RZBottomSheet"; // ⚡ Footer premium

export default function RZUserDashboard() {
  const router = useRouter();

  const menu = [
    {
      title: "Accéder a la BANQ",
      desc: "Découvrez les PACT authentiques",
      icon: "film-outline",
      route: "/banq",
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
      route: "/publish-suspentz",
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
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MENU</Text>
            <Text style={styles.subtitle}>
              Le mérite se découvre, se crée et se partage...
            </Text>
          </View>

          <Animated.View entering={FadeInUp.duration(1200)}>
            <Image
              source={require("@/assets/images/rhazn-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* MENU PRINCIPAL */}
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

                <Feather
                  name="chevron-right"
                  size={22}
                  color="rgba(212,175,55,0.6)"
                />

                {item.badge && <View style={styles.badge} />}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* FOOTER OFFICIEL */}
      <RZBottomSheet />
    </View>
  );
}

/******************************
 * STYLES — rien changé
 ******************************/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingHorizontal: 20,
    marginTop: 60,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: { width: 55, height: 55 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#D4AF37",
    marginBottom: 5,
  },
  subtitle: { fontSize: 14, color: "#aaa", maxWidth: 240 },

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
});
