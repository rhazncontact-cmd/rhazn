import { Entypo, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RzPinLock from "../components/RzPinLock";

/* 🎨 PALETTE RHAZN — Apple-like (clair) */
const COLORS = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#D4AF37",
  black: "#000000",
  gray: "#6E6E73",
  lightGray: "#8E8E93",
  hairline: "rgba(0,0,0,0.12)",
};

export default function UserSpaceHub() {
  const router = useRouter();

  const navigate = (route: string) => {
    Haptics.selectionAsync();
    router.push(route);
  };

  const items = [
    {
      title: "Mon Profil",
      subtitle: "Identité et informations personnelles",
      icon: "person-outline",
      route: "/user-profile/",
    },
    {
      title: "Mon Wallet",
      subtitle: "TAN, ACSET et mouvements",
      icon: "wallet-outline",
      route: "/user-wallet/",
    },
    {
      title: "Mes Gains",
      subtitle: "Revenus et performances",
      icon: "trending-up",
      route: "/user-gains/",
    },
    {
      title: "Mes Créations",
      subtitle: "PACT, vidéos, contenus",
      icon: "layers-outline",
      route: "/user-mes-creations/",
    },
  ];

  return (
    
  <RzPinLock>
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.bg} barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
      >
        <View style={{ height: 32 }} />

        <View style={styles.header}>
          <Text style={styles.title}>Mon Espace</Text>
          <Text style={styles.subtitle}>Centre personnel RHAZN</Text>
        </View>

        <View style={styles.list}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigate(item.route)}
            >
              <Ionicons name={item.icon as any} size={22} color={COLORS.gold} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
              <Entypo name="chevron-right" size={18} color={COLORS.lightGray} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  </RzPinLock>
);

}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  content: {
    flexGrow: 1, // 🔑 scroll permanent
    paddingHorizontal: 22,
  },

  header: {
    marginBottom: 22,
  },

  title: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
  },

  list: {
    marginTop: 6,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    marginBottom: 14,
  },

  cardTitle: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "700",
  },

  cardSubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 2,
  },
});
