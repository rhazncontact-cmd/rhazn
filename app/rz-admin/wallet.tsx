import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* ===================== THEME ===================== */
const GOLD = "#D4AF37";

/* ===================== SCREEN ===================== */
export default function RZAdminWallet() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>RZ · ADMIN</Text>

        <TouchableOpacity onPress={() => router.replace("/rz-roles")}>
          <Image
            source={require("../../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Autorité du Mérite</Text>
        <View style={styles.divider} />

        {/* ACTIONS */}
        <AdminCard
          icon={<MaterialIcons name="security" size={26} color={GOLD} />}
          title="Agents & Accréditations"
          onPress={() => router.push("/rz-admin/agents")}
        />

        <AdminCard
          icon={<Ionicons name="megaphone" size={24} color={GOLD} />}
          title="Communication"
          onPress={() => router.push("/rz-admin-communication")}
        />

        <AdminCard
          icon={<MaterialIcons name="movie" size={26} color={GOLD} />}
          title="Validation Vidéos"
          onPress={() => router.push("/rz-admin/videos")}
        />

        <AdminCard
          icon={<Feather name="award" size={24} color={GOLD} />}
          title="Classements & QOB"
          onPress={() => router.push("/rz-admin/qob")}
        />

        <AdminCard
          icon={<Ionicons name="wallet" size={24} color={GOLD} />}
          title="Finance · ACSET · TAN"
          onPress={() => router.push("/rz-admin/finance")}
        />

        <AdminCard
          icon={<Feather name="shield-off" size={24} color="#EF4444" />}
          title="Anti-Fraude & Éthique"
          onPress={() => router.push("/rz-admin/ethics")}
        />

        <Text style={styles.footer}>RHAZN — Sanctuaire du Mérite</Text>
      </ScrollView>
    </View>
  );
}

/* ===================== CARD ===================== */
function AdminCard({
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {icon}
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
  },

  logo: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  subtitle: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 6,
  },

  divider: {
    height: 2,
    width: "45%",
    backgroundColor: GOLD,
    borderRadius: 4,
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#222",
  },

  cardText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  footer: {
    color: "#666",
    textAlign: "center",
    marginTop: 30,
    fontSize: 11,
  },
});
