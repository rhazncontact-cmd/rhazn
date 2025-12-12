import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

const GOLD = "#D4AF37";

/* ---------------- BADGE ---------------- */
function getBadge(qob: number) {
  if (qob >= 10000) return { label: "DIAMANT", color: "#00f2ff" };
  if (qob >= 3000) return { label: "PLATINE", color: "#e5e4e2" };
  if (qob >= 1000) return { label: "OR", color: GOLD };
  return { label: "BRONZE", color: "#cd7f32" };
}

/* ---------------- SCREEN ---------------- */
export default function UserProfile() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ tan: 0, qob: 0 });
  const [loading, setLoading] = useState(true);
  const [qrVisible, setQrVisible] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return router.replace("/auth/login");

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("uid", uid)
        .single();

      if (data) {
        setUser(data);
        setStats({ tan: data?.tan || 0, qob: data?.qob || 0 });
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  const badge = getBadge(stats.qob);

  if (loading)
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );

  return (
    <SecureScreen scope="Profil">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ✅ HEADER PREMIUM */}
        <View style={styles.header}>
          <Text style={styles.title}>Mon Espace</Text>

          <TouchableOpacity onPress={() => router.push("/rz-user-dashboard")}>
            <Image
              source={require("../assets/images/rhazn-logo.png")}
              style={styles.logo}
            />
          </TouchableOpacity>
        </View>

        {/* ✅ PROFIL */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={() => router.push("/settings")}>
            <Image
              source={
                user?.avatar_url
                  ? { uri: user.avatar_url }
                  : require("../assets/images/avatar7.png")
              }
              style={styles.avatar}
            />
          </TouchableOpacity>

          <Text style={styles.name}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>

          {/* ✅ QR SUPABASE UID */}
          <TouchableOpacity onPress={() => setQrVisible(true)}>
            <Text style={styles.qrBtn}>Afficher mon QR</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ STATS */}
        <View style={styles.statsRow}>
          <Stat title="TAN Reçus" value={stats.tan} />
          <Stat title="QOB Reçus" value={stats.qob} />
        </View>

        {/* ✅ ACTIONS ACTIVÉES */}
        <View style={styles.actionsBox}>

          {/* ✅ ALERTES & NOTIFICATIONS */}
          <Action
            label="Alertes & Notifications"
            onPress={() => router.push("/notifications")}
          />

          {/* ✅ STATISTIQUES AVANCÉES */}
          <Action
            label="Statistiques Avancées"
            onPress={() => router.push("/rz-admin/stats")}
          />

          {/* ✅ SÉCURITÉ */}
          <Action
            label="Sécurité & PIN"
            onPress={() => router.push("/security-pin")}
          />

        </View>

        {/* ✅ QR MODAL */}
        <Modal visible={qrVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <QRCode value={user?.uid || ""} size={200} />

              <TouchableOpacity
                onPress={() => setQrVisible(false)}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnText}>FERMER</Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

      </ScrollView>
    </SecureScreen>
  );
}

/* ---------------- UI COMPONENTS ---------------- */
function Stat({ title, value }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );
}

function Action({ label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
      <Feather name="chevron-right" size={18} color={GOLD} />
    </TouchableOpacity>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },

  boot: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: GOLD,
    marginTop: 12,
  },

  logo: { width: 44, height: 44 },

  profileCard: {
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },

  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: GOLD,
  },

  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },

  email: { color: "#aaa", fontSize: 12 },

  badge: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
  },

  badgeText: { fontWeight: "900", color: "#000" },

  qrBtn: { color: GOLD, marginTop: 14, fontWeight: "700" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },

  statBox: {
    width: "48%",
    backgroundColor: "#111",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 16,
    borderColor: "#333",
    borderWidth: 1,
  },

  statValue: { color: GOLD, fontSize: 24, fontWeight: "900" },
  statLabel: { color: "#aaa" },

  actionsBox: {
    backgroundColor: "#111",
    marginTop: 20,
    borderRadius: 16,
    borderColor: "#333",
    borderWidth: 1,
    overflow: "hidden",
  },

  actionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomColor: "#222",
    borderBottomWidth: 1,
  },

  actionText: { color: "#fff", fontWeight: "600" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  modalBox: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 20,
    alignItems: "center",
  },

  modalBtn: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    width: 160,
  },

  modalBtnText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#000",
  },
});
