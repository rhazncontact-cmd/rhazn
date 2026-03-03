import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

/* 🎨 RHAZN COLORS */
const GOLD = "#D4AF37";

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>RZ · ADMIN</Text>
        <TouchableOpacity onPress={() => router.push("/rz-roles")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Centre de Commandement</Text>
        <View style={styles.divider} />

        {/* ================= FINANCE PREMIUM ================= */}

        <ActionGold
          icon={
            <MaterialCommunityIcons
              name="bank-outline"
              size={24}
              color="#000"
            />
          }
          label="Finance · Control-Center"
          onPress={() =>
            router.push(
              "/rz-admin-governance/admin-finance/wallets-control-center"
            )
          }
        />

        {/* ================= NOMINATION HAUT GAMME ================= */}

        <ActionSoft
          iconComponent={
            <Ionicons name="ribbon-outline" size={22} color={GOLD} />
          }
          label="Nomination"
          onPress={() =>
            router.push("/rz-admin-governance/admin-command/nomination")
          }
        />

        <Text style={styles.footer}>RHAZN — Sanctuaire du Mérite</Text>
      </ScrollView>
    </View>
  );
}

/* ================= COMPONENTS ================= */

function ActionGold({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionGold} onPress={onPress}>
      {icon}
      <Text style={styles.actionGoldText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionSoft({
  iconComponent,
  label,
  onPress,
}: {
  iconComponent: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionSoft} onPress={onPress}>
      {iconComponent}
      <Text style={styles.actionSoftText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 14,
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
    width: 38,
    height: 38,
    resizeMode: "contain",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  subtitle: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 6,
  },

  divider: {
    height: 2,
    width: "42%",
    backgroundColor: GOLD,
    borderRadius: 4,
    marginBottom: 22,
  },

  actionGold: {
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  actionGoldText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  actionSoft: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },

  actionSoftText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  footer: {
    color: "#666",
    fontSize: 11,
    marginTop: 30,
    textAlign: "center",
  },
});