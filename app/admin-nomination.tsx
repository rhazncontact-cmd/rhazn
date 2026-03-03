import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

/* ================= CONSTANTES ================= */
const GOLD = "#D4AF37";
const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";

/* ================= TYPES ================= */
type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
};

/* ================= PREMIUM ALERT ================= */
function PremiumAlert({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
}: any) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.alertOverlay}>
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          <View style={styles.alertActions}>
            {onCancel && (
              <TouchableOpacity
                style={styles.alertBtnGhost}
                onPress={onCancel}
              >
                <Text style={styles.alertGhostText}>Annuler</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.alertBtn} onPress={onConfirm}>
              <Text style={styles.alertBtnText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ================= UI PARTS ================= */
function Action({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.btnText, disabled && styles.btnTextDisabled]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ================= SCREEN ================= */
export default function AdminNomination() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [alert, setAlert] = useState<any>(null);

  const isSupreme = useMemo(
    () => currentUserEmail?.toLowerCase() === SUPREME_EMAIL.toLowerCase(),
    [currentUserEmail]
  );

  /* ================= INIT ================= */
  useEffect(() => {
    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const email = auth?.user?.email ?? "";
        setCurrentUserEmail(email);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  /* ================= REALTIME (profiles role updates) ================= */
  useEffect(() => {
    const channel = supabase
      .channel("profiles-realtime-admin-nomination")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as any;
          setResults((prev) =>
            prev.map((p) =>
              p.id === updated.id ? { ...p, role: updated.role } : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ================= RPC HELPERS ================= */
  const fetchProfiles = async () => {
    const { data, error } = await supabase.rpc("admin_list_profiles");
    if (error) throw error;
    return (data as Profile[]) || [];
  };

  /* ================= SEARCH ================= */
  const handleSearch = async () => {
    if (!search.trim()) {
      setAlert({
        title: "Recherche",
        message: "Veuillez entrer un email.",
        onConfirm: () => setAlert(null),
      });
      return;
    }

    if (!isSupreme) {
      setAlert({
        title: "Accès refusé",
        message: `Seul le compte SUPREME (${SUPREME_EMAIL}) peut nommer des rôles.`,
        onConfirm: () => setAlert(null),
      });
      return;
    }

    try {
      setSearching(true);
      const data = await fetchProfiles();
      const q = search.toLowerCase().trim();

      setResults(
        data.filter((p) => (p.email || "").toLowerCase().includes(q))
      );
    } catch (e: any) {
      setAlert({
        title: "Erreur",
        message: e?.message ?? "Erreur inconnue",
        onConfirm: () => setAlert(null),
      });
    } finally {
      setSearching(false);
    }
  };

  /* ================= ROLE ASSIGN ================= */
  const assignRole = (profile: Profile, role: string) => {
    const targetEmail = (profile.email || "").toLowerCase().trim();
    const supreme = SUPREME_EMAIL.toLowerCase();

    if (!targetEmail) return;

    if (targetEmail === supreme) {
      setAlert({
        title: "Interdit",
        message: "Le compte SUPREME est intouchable.",
        onConfirm: () => setAlert(null),
      });
      return;
    }

    setAlert({
      title: "Confirmation",
      message: `Nommer ${profile.email} comme ${role.toUpperCase()} ?`,
      onCancel: () => setAlert(null),
      onConfirm: async () => {
        setAlert(null);

        const { error } = await supabase.rpc("admin_set_role", {
          target_email: profile.email,
          new_role: role,
        });

        if (error) {
          setAlert({
            title: "Erreur",
            message: error.message,
            onConfirm: () => setAlert(null),
          });
          return;
        }

        // Refresh résultats (garde ta recherche active)
        const data = await fetchProfiles();
        const q = search.toLowerCase().trim();
        setResults(data.filter((p) => (p.email || "").toLowerCase().includes(q)));

        setAlert({
          title: "Succès",
          message: `Rôle attribué : ${role.toUpperCase()}`,
          onConfirm: () => setAlert(null),
        });
      },
    });
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <SecureScreen scope="Admin-Nomination">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Nominations officielles</Text>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#999" />
          <TextInput
            placeholder="Entrer un email"
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          {searching ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.searchBtnText}>
              {isSupreme ? "Rechercher" : "Réservé au SUPREME"}
            </Text>
          )}
        </TouchableOpacity>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isTargetSupreme =
              (item.email || "").toLowerCase().trim() ===
              SUPREME_EMAIL.toLowerCase();

            return (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.name}>{item.full_name || "—"}</Text>
                  {isTargetSupreme && (
                    <View style={styles.supremeBadge}>
                      <Text style={styles.supremeBadgeText}>SUPREME</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.role}>Rôle actuel : {item.role || "—"}</Text>

                <View style={styles.actions}>
                  <Action
                    label="CAD"
                    disabled={isTargetSupreme}
                    onPress={() => assignRole(item, "cad")}
                  />
                  <Action
                    label="CADNA"
                    disabled={isTargetSupreme}
                    onPress={() => assignRole(item, "cadna")}
                  />
                  <Action
                    label="ED"
                    disabled={isTargetSupreme}
                    onPress={() => assignRole(item, "agent")}
                  />
                </View>
              </View>
            );
          }}
        />
      </View>

      {alert && <PremiumAlert visible {...alert} />}
    </SecureScreen>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { marginTop: 12, marginBottom: 22 },
  title: { color: GOLD, fontSize: 22, fontWeight: "900" },

  logo: {
    position: "absolute",
    right: 0,
    top: -4,
    width: 34,
    height: 34,
    resizeMode: "contain",
    opacity: 0.9,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: { flex: 1, marginLeft: 8, color: "#fff" },

  searchBtn: {
    backgroundColor: GOLD,
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
    alignItems: "center",
  },
  searchBtnText: { color: "#000", fontWeight: "900" },

  card: {
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#222",
  },

  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { color: "#fff", fontWeight: "800", fontSize: 16 },
  email: { color: "#aaa", marginTop: 4 },
  role: { color: GOLD, marginTop: 6, fontWeight: "700" },

  supremeBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  supremeBadgeText: { color: "#000", fontWeight: "900", fontSize: 12 },

  actions: { flexDirection: "row", gap: 10, marginTop: 14 },

  btn: {
    flex: 1,
    backgroundColor: GOLD,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { fontWeight: "900", color: "#000" },

  btnDisabled: {
    backgroundColor: "rgba(212,175,55,0.25)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },
  btnTextDisabled: { color: "rgba(0,0,0,0.45)" },

  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertCard: {
    width: "85%",
    backgroundColor: "#111",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  alertTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  alertMessage: { color: "#ddd", marginBottom: 20 },

  alertActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },

  alertBtn: {
    backgroundColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  alertBtnText: { color: "#000", fontWeight: "900" },

  alertBtnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  alertGhostText: { color: "#aaa", fontWeight: "700" },
});
