// app/admin/nomination.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import SecureScreen from "../../components/SecureScreen";

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
  shadow: "rgba(0,0,0,0.12)",
};

/* ===================== TYPES ===================== */
type RoleKey = "USER" | "CAD" | "CADNA" | "AGENT";
type AccountStatusKey = "active" | "paused" | "disabled";
type WalletStatus = "ACTIVE" | "PAUSED" | "DISABLED";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_admin: boolean | null;
  account_status: string | null;
  profile_photo_url: string | null;

  /* 🔥 SOURCE UNIQUE AGENT */
  is_agent_from_eds?: boolean;
};

/* ===================== UTILS ===================== */
const norm = (v?: string | null) => (v ?? "").toLowerCase().trim();
const isSupremeEmail = (email?: string | null) => norm(email) === norm(SUPREME_EMAIL);

function statusColor(s?: string | null) {
  const v = norm(s);
  if (v === "active") return COLORS.green;
  if (v === "paused") return COLORS.orange;
  if (v === "disabled") return COLORS.red;
  return COLORS.sub;
}

function walletStatusFromAccountStatus(s: AccountStatusKey): WalletStatus {
  if (s === "active") return "ACTIVE";
  if (s === "paused") return "PAUSED";
  return "DISABLED";
}

function effectiveRole(p: ProfileRow): RoleKey {
  if (isSupremeEmail(p.email)) return "CAD";

  if (p.is_agent_from_eds) return "AGENT";

  const r = norm(p.role);

  if (r === "cad" || r === "admin") return "CAD";
  if (r === "cadna") return "CADNA";

  return "USER";
}

function displayRole(p: ProfileRow): string {
  if (isSupremeEmail(p.email)) return "SUPREME";
  const r = effectiveRole(p);
  if (r === "AGENT") return "ED";
  return r;
}

function normAccountStatus(s?: string | null): AccountStatusKey {
  const v = norm(s);
  if (v === "active" || v === "paused" || v === "disabled") return v;
  return "active";
}

function matchesFilter(p: ProfileRow, filter: RoleKey): boolean {
  const role = effectiveRole(p);
  if (filter === "USER") return true;
  return role === filter;
}

/* ===================== SCREEN ===================== */
export default function Nomination() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [meEmail, setMeEmail] = useState<string>("");

  const [activeRole, setActiveRole] = useState<RoleKey>("USER");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const liveTimer = useRef<any>(null);
  const [live, setLive] = useState("");

  const [sheet, setSheet] = useState<ProfileRow | null>(null);

  const isSupreme = useMemo(() => isSupremeEmail(meEmail), [meEmail]);

  /* ===================== GUARD ===================== */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (!u) return router.replace("/auth/login");

      setMeEmail(u.email || "");

      // ✅ accès réservé au SUPREME
      if (isSupremeEmail(u.email)) {
        setAuthorized(true);
        return;
      }

      router.replace("/rz-roles");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===================== FETCH ===================== */
  const fetchProfiles = async (silent = false) => {
    if (!silent) setLoading(true);

    /* ========= 1️⃣ PROFILES ========= */
    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,is_admin,account_status,profile_photo_url,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    /* ========= 2️⃣ EDS (SOURCE AGENT UNIQUE) ========= */
    const { data: eds } = await supabase
      .from("eds")
      .select("auth_uid")
      .eq("is_active", true);

    const edsMap: Record<string, boolean> = {};
    eds?.forEach((e) => {
      edsMap[e.auth_uid] = true;
    });

    /* ========= 3️⃣ MERGE ========= */
    const merged = (profilesData || []).map((p: any) => ({
      ...p,
      is_agent_from_eds: !!edsMap[p.id],
    }));

    setProfiles(merged);

    setLoading(false);
  };

  useEffect(() => {
    if (authorized) fetchProfiles(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  /* ===================== REALTIME ===================== */
  useEffect(() => {
    if (!authorized) return;

    const ch = supabase
      .channel("rz-admin-nomination-profiles-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        fetchProfiles(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  /* ===================== SEARCH (debounce) ===================== */
  useEffect(() => {
    if (liveTimer.current) clearTimeout(liveTimer.current);
    liveTimer.current = setTimeout(() => setLive(query), 220);
    return () => liveTimer.current && clearTimeout(liveTimer.current);
  }, [query]);

  /* ===================== COUNTS ===================== */
  const counts = useMemo(() => {
    const all = profiles.length;
    const cad = profiles.filter((p) => matchesFilter(p, "CAD")).length;
    const cadna = profiles.filter((p) => matchesFilter(p, "CADNA")).length;
    const agent = profiles.filter((p) => matchesFilter(p, "AGENT")).length;
    return { all, cad, cadna, agent };
  }, [profiles]);

  /* ===================== FILTERED ===================== */
  const filtered = useMemo(() => {
    const q = norm(live);
    const base = profiles.filter((p) => matchesFilter(p, activeRole));

    if (q.length < 2) return base;

    return base.filter((p) => {
      const em = norm(p.email);
      const fn = norm(p.full_name);
      const rr = norm(p.role);
      const tag = norm(displayRole(p));
      const st = norm(p.account_status);
      return em.includes(q) || fn.includes(q) || rr.includes(q) || tag.includes(q) || st.includes(q);
    });
  }, [profiles, activeRole, live]);

  /* ===================== ACTIONS ===================== */

  // ✅ Generate / Regenerate Agent Code (Supreme only)
  const generateCodeForAgent = async (p: ProfileRow) => {
    if (!isSupreme) return;

    const { data, error } = await supabase.rpc("generate_agent_code", {
      p_agent_id: p.id,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert(`Code Agent généré : ${data}`);
    fetchProfiles(true); // refresh list
  };

  // ✅ ROLE UPDATE (nouvelle logique: aucun eds ici)

  const setRole = async (p: ProfileRow, role: RoleKey) => {
  if (!isSupreme) return;

  try {
    /* 🔁 toujours sync profile.role (info visuelle uniquement) */
    await supabase
      .from("profiles")
      .update({ role: role.toLowerCase() })
      .eq("id", p.id);

    /* ======================================================
       🔥 NOUVELLE LOGIQUE FINTECH PRO
       - jamais delete
       - seulement activer / désactiver
    ====================================================== */

    if (role === "AGENT") {
      /* ✅ activer agent */
      await supabase
        .from("eds")
        .upsert(
          {
            auth_uid: p.id,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "auth_uid" }
        );
    } else {
      /* 🔴 désactiver agent (historique conservé) */
      await supabase
        .from("eds")
        .update({ is_active: false })
        .eq("auth_uid", p.id);
    }

    fetchProfiles(true);
  } catch (e: any) {
    Alert.alert("Erreur", e.message || "Impossible de modifier le rôle");
  }
};

  // ✅ STATUS UPDATE (sync profiles + wallets) — effet immédiat & realtime
  const setAccountStatus = async (p: ProfileRow, status: AccountStatusKey) => {
  if (!isSupreme) return;
  if (isSupremeEmail(p.email)) return; // ❌ Supreme intouchable

  // 1) profile
  await supabase.from("profiles").update({ account_status: status }).eq("id", p.id);

  // 2) wallet sync
  await supabase
    .from("wallets")
    .update({ status: walletStatusFromAccountStatus(status) })
    .eq("user_id", p.id);

  setSheet(null);
  fetchProfiles(true);
};

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfiles(true);
    setRefreshing(false);
  };

  /* ===================== UI ===================== */
  if (!authorized) {
    return <ActivityIndicator style={{ marginTop: 120 }} />;
  }

  return (
    <SecureScreen scope="RZ-Admin">
      <View style={styles.screen}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>RHAZN · Nomination</Text>
            <Text style={styles.sub}>Rôles & Statuts (sync wallets)</Text>
          </View>

          <View style={styles.supremePill}>
            <Text style={styles.supremePillText}>{isSupreme ? "SUPREME ✅" : "LOCKED"}</Text>
          </View>
        </View>

        {/* CARDS FILTER */}
        <View style={styles.cards}>
          <RoleCard
            label="USER"
            count={counts.all}
            active={activeRole === "USER"}
            onPress={() => setActiveRole("USER")}
          />
          <RoleCard
            label="CAD"
            count={counts.cad}
            active={activeRole === "CAD"}
            onPress={() => setActiveRole("CAD")}
          />
          <RoleCard
            label="CADNA"
            count={counts.cadna}
            active={activeRole === "CADNA"}
            onPress={() => setActiveRole("CADNA")}
          />
          <RoleCard
            label="AGENT"
            count={counts.agent}
            active={activeRole === "AGENT"}
            onPress={() => setActiveRole("AGENT")}
          />
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={COLORS.sub} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher email / nom / rôle / statut (≥ 2 lettres)…"
            placeholderTextColor={COLORS.sub}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Feather name="filter" size={16} color={COLORS.gold} />
        </View>

        {/* LIST */}
        {loading ? (
          <View style={{ paddingTop: 30 }}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : (
          <FlatList
  data={filtered}
  keyExtractor={(i) => i.id}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
  contentContainerStyle={{ paddingBottom: 24 }}
  initialNumToRender={14}
  windowSize={9}
  removeClippedSubviews
  renderItem={({ item }) => {
    const roleTag = displayRole(item);
    const statusTag = normAccountStatus(item.account_status).toUpperCase();

    const roleColor =
      roleTag === "SUPREME"
        ? COLORS.gold
        : roleTag === "CAD"
        ? "#111827"
        : roleTag === "CADNA"
        ? "#1F2937"
        : roleTag === "ED"
        ? "#0F172A"
        : "#374151";

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          {item.profile_photo_url ? (
            <Image source={{ uri: item.profile_photo_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Feather name="user" size={16} color={COLORS.sub} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.full_name ?? "—"}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {item.email ?? "—"}
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <View style={[styles.badge, { backgroundColor: roleColor }]}>
                <Text style={styles.badgeText}>{roleTag}</Text>
              </View>

              <View style={[styles.badge, { backgroundColor: statusColor(item.account_status) }]}>
                <Text style={styles.badgeText}>{statusTag}</Text>
              </View>
            </View>
          </View>

          {/* ✅ MODAL (supreme only, not for supreme target) */}
          {isSupreme && !isSupremeEmail(item.email) && (
            <Pressable onPress={() => setSheet(item)} style={styles.roleModBtn} hitSlop={10}>
              <Feather name="settings" size={16} color={COLORS.gold} />
              <Text style={styles.roleModText}>manage</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }}
  ListEmptyComponent={
    <View style={{ paddingTop: 40, alignItems: "center" }}>
      <Text style={{ color: COLORS.sub }}>Aucun résultat.</Text>
    </View>
  }
/>
        )}

        {/* MANAGE MODAL */}
        <Modal transparent visible={!!sheet} animationType="fade" onRequestClose={() => setSheet(null)}>
          <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSheet(null)} />

            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Gérer le compte</Text>
              <Text style={styles.sheetEmail} numberOfLines={1}>
                {sheet?.email ?? "—"}
              </Text>

              {/* ROLE */}
              <Text style={styles.sheetSection}>Rôle</Text>
              <View style={styles.sheetGrid}>
                {(["USER", "CAD", "CADNA", "AGENT"] as RoleKey[]).map((r) => (
                  <Pressable
                    key={r}
                    style={({ pressed }) => [
                      styles.sheetBtn,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                    ]}
                    onPress={() => {
  if (!sheet) return;
  setRole(sheet, r);
}}
                  >
                    <Text style={styles.sheetBtnText}>{r === "AGENT" ? "ED" : r}</Text>
                    <Text style={styles.sheetBtnSub}>
                      {r === "USER"
                        ? "Compte standard"
                        : r === "CAD"
                          ? "Admin"
                          : r === "CADNA"
                            ? "Validation"
                            : "Agent (ED)"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* STATUS */}
              <Text style={[styles.sheetSection, { marginTop: 14 }]}>Statut (effet immédiat)</Text>
              <View style={styles.sheetGrid}>
                {(["active", "paused", "disabled"] as AccountStatusKey[]).map((s) => (
                  <Pressable
                    key={s}
                    style={({ pressed }) => [
                      styles.sheetBtn,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                    ]}
                    onPress={() => {
  if (!sheet) return;
  setAccountStatus(sheet, s);
}}
                  >
                    <Text style={styles.sheetBtnText}>{s.toUpperCase()}</Text>
                    <Text style={styles.sheetBtnSub}>
                      {s === "active"
                        ? "Autorisé"
                        : s === "paused"
                          ? "Pause (bloque actions)"
                          : "Bloqué (stop total)"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* ✅ AGENT CODE (Supreme only) */}
{sheet && effectiveRole(sheet) === "AGENT" && (
  <Pressable
    onPress={() => generateCodeForAgent(sheet)}
    style={[styles.sheetClose, { backgroundColor: "#4FC3F7", marginTop: 14 }]}
  >
    <Text style={styles.sheetCloseText}>Générer / Regénérer Code Agent</Text>
  </Pressable>
)}

{/* 🔴 SUPREME — DISABLE USER (NOUVEAU BOUTON ICI) */}
{isSupreme && !isSupremeEmail(sheet?.email) && (
  <Pressable
    style={[styles.sheetClose, { backgroundColor: COLORS.red, marginTop: 10 }]}
    onPress={async () => {
      if (!sheet) return;

      Alert.alert(
        "Désactiver définitivement",
        "Ce compte sera bloqué définitivement.\nWallet désactivé.\nAgent révoqué.\n\nContinuer ?",
        [
          { text: "Annuler" },
          {
            text: "Confirmer",
            style: "destructive",
            onPress: async () => {
              await supabase.rpc("supreme_disable_user", {
                p_uid: sheet.id,
              });

              fetchProfiles(true);
              setSheet(null);
            },
          },
        ]
      );
    }}
  >
    <Text style={styles.sheetCloseText}>Désactiver définitivement</Text>
  </Pressable>
)}

{/* Fermer */}
<Pressable onPress={() => setSheet(null)} style={styles.sheetClose}>
  <Text style={styles.sheetCloseText}>Fermer</Text>
</Pressable>

            </View>
          </View>
        </Modal>
      </View>
    </SecureScreen>
  );
}

/* ===================== COMPONENTS ===================== */
function RoleCard({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const title = label === "AGENT" ? "AGENT" : label;
  const shown = label === "AGENT" ? "AGENT" : label;

  return (
    <Pressable onPress={onPress} style={[styles.roleCard, active && styles.roleCardActive]}>
  <Text style={[styles.roleTitle, active && { color: COLORS.text }]}>{shown}</Text>
  <Text style={styles.roleCount}>{count}</Text>
  <Text style={styles.roleHint}>{title === "USER" ? "Tous les comptes" : "Filtre"}</Text>
</Pressable>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 19, fontWeight: "900", color: COLORS.text },
  sub: { fontSize: 12, fontWeight: "800", color: COLORS.sub, marginTop: 2 },
  supremePill: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  supremePillText: { fontSize: 11, fontWeight: "900", color: "#000" },

  cards: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleCardActive: {
    borderColor: COLORS.gold,
    backgroundColor: "#FFF9E6",
  },
  roleTitle: { fontSize: 11, fontWeight: "900", color: COLORS.sub },
  roleCount: { fontSize: 18, fontWeight: "900", color: COLORS.text, marginTop: 4 },
  roleHint: { fontSize: 9, fontWeight: "800", color: COLORS.sub, marginTop: 2 },

  searchBox: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  card: {
    marginHorizontal: 18,
    marginBottom: 10,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  email: { fontSize: 11, fontWeight: "800", color: COLORS.sub, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 9, fontWeight: "900", color: "#FFF" },

  roleModBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(212,175,55,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleModText: { fontSize: 10, fontWeight: "900", color: COLORS.gold },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: "80%",
  },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text, textAlign: "center" },
  sheetEmail: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.sub,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  sheetSection: { fontSize: 13, fontWeight: "900", color: COLORS.text, marginBottom: 8 },
  sheetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sheetBtn: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetBtnText: { fontSize: 13, fontWeight: "900", color: COLORS.text },
  sheetBtnSub: { fontSize: 10, fontWeight: "800", color: COLORS.sub, marginTop: 2 },
  sheetClose: {
  marginTop: 14,
  backgroundColor: COLORS.gold,
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: "center",
},
sheetCloseText: {
  fontSize: 13,
  fontWeight: "900",
  color: "#000",
},
});