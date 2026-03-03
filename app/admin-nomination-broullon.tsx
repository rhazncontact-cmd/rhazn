import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

/* ===================== CONFIG ===================== */
const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";

/* ===================== UI ===================== */
const COLORS = {
  bg: "#FFFFFF",
  card: "#F5F5F7",
  border: "rgba(0,0,0,0.08)",
  text: "#0A0A0A",
  sub: "#6E6E73",
  gold: "#D4AF37",
  green: "#16A34A",
  orange: "#FF9F0A",
  red: "#DC2626",
};

/* ===================== TYPES ===================== */
type RoleKey = "CAD" | "CADNA" | "AGENT" | "USER";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_admin: boolean | null;
  is_agent: boolean | null;
  account_status: string | null;
  profile_photo_url: string | null;
};

/* ===================== UTILS ===================== */
const norm = (v?: string | null) => (v ?? "").toLowerCase().trim();

function matchRole(p: ProfileRow, role: RoleKey) {
  const r = norm(p.role);
  if (role === "CAD") return r === "cad" || r === "admin" || r === "supreme" || p.is_admin;
  if (role === "CADNA") return r === "cadna";
  if (role === "AGENT") return r === "agent" || p.is_agent;
  return r === "user";
}

function statusColor(s?: string | null) {
  if (s === "active") return COLORS.green;
  if (s === "paused") return COLORS.orange;
  if (s === "disabled") return COLORS.red;
  return COLORS.sub;
}

/* ===================== SCREEN ===================== */
export default function RZAdmin() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeRole, setActiveRole] = useState<RoleKey>("CAD");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");

  /* ===================== GUARD ===================== */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (!u) return router.replace("/auth/login");

      if (norm(u.email) === norm(SUPREME_EMAIL)) {
        setAuthorized(true);
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("role,is_admin")
        .eq("id", u.id)
        .maybeSingle();

      if (!p?.is_admin && !["cad", "admin", "cadna"].includes(norm(p?.role))) {
        router.replace("/rz-roles");
        return;
      }

      setAuthorized(true);
    })();
  }, []);

  /* ===================== FETCH ===================== */
  const fetchProfiles = async (silent = false) => {
    if (!silent) setLoading(true);

    const { data } = await supabase
      .from("profiles")
      .select(
        "id,email,full_name,role,is_admin,is_agent,account_status,profile_photo_url"
      )
      .order("created_at", { ascending: false });

    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authorized) fetchProfiles();
  }, [authorized]);

  /* ===================== REALTIME ===================== */
  useEffect(() => {
    if (!authorized) return;
    const ch = supabase
      .channel("rz-admin-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchProfiles(true)
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [authorized]);

  /* ===================== DYNAMIC SEARCH ===================== */
  const filtered = useMemo(() => {
    const q = norm(query);
    return profiles.filter(
      (p) =>
        matchRole(p, activeRole) &&
        (q.length < 2 ||
          norm(p.email).includes(q) ||
          norm(p.full_name).includes(q) ||
          norm(p.role).includes(q))
    );
  }, [profiles, activeRole, query]);

  /* ===================== UI ===================== */
  if (!authorized) {
    return <ActivityIndicator style={{ marginTop: 100 }} />;
  }

  return (
    <SecureScreen scope="RZ-Admin">
      <View style={styles.screen}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>RHAZN · Admin Command</Text>
            <Text style={styles.sub}>Gouvernance & Comptes</Text>
          </View>

          <Image
            source={require("../assets/images/rz-logo-trans.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* ROLE CARDS */}
        <View style={styles.cards}>
          {(["CAD", "CADNA", "AGENT", "USER"] as RoleKey[]).map((r) => (
            <Pressable
              key={r}
              onPress={() => setActiveRole(r)}
              style={[
                styles.roleCard,
                activeRole === r && styles.roleCardActive,
              ]}
            >
              <Text style={styles.roleTitle}>{r}</Text>
              <Text style={styles.roleCount}>
                {profiles.filter((p) => matchRole(p, r)).length}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={COLORS.sub} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher (min. 2 lettres)…"
            style={styles.searchInput}
          />
          <Feather name="arrow-right" size={18} color={COLORS.gold} />
        </View>

        {/* LIST */}
        {loading ? (
          <ActivityIndicator color={COLORS.gold} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={fetchProfiles} />
            }
            initialNumToRender={10}
            windowSize={7}
            removeClippedSubviews
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.row}>
                  {item.profile_photo_url ? (
                    <Image source={{ uri: item.profile_photo_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback} />
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.full_name ?? "—"}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                  </View>

                  <View
                    style={[
                      styles.status,
                      { backgroundColor: statusColor(item.account_status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{item.account_status}</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SecureScreen>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "900", color: COLORS.text },
  sub: { color: COLORS.sub, fontWeight: "700" },
  logo: { width: 42, height: 42 },

  cards: { flexDirection: "row", gap: 10, marginVertical: 14 },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleCardActive: { borderColor: COLORS.gold },
  roleTitle: { fontWeight: "900", color: COLORS.sub },
  roleCount: { fontSize: 22, fontWeight: "900", marginTop: 6 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontWeight: "700" },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
  },
  name: { fontWeight: "900", fontSize: 16 },
  email: { color: COLORS.sub, fontSize: 13 },

  status: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { color: "#FFF", fontWeight: "900", fontSize: 12 },
});
