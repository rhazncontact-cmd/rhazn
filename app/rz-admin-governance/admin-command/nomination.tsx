// app/admin/nomination.tsx
// ✅ RHAZN — Nomination · Supreme Admin
// ✅ Suppression / Blocage / Rôles — sélection max 50 emails
// ✅ Suppression = purge complète (auth + profiles + wallets + contenus)
// ✅ Apple-like premium UI

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SecureScreen from "../../../components/SecureScreen";
import { avatarStore } from "../../../lib/avatarStore";
import { supabase } from "../../../lib/supabase";

// ─── Palette ─────────────────────────────────────────────────
const GOLD     = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.12)";
const BG       = "#F2F2F7";
const CARD     = "#FFFFFF";
const SOFT     = "#E5E5EA";
const TEXT     = "#111111";
const MUTED    = "#6E6E73";
const GREEN    = "#34C759";
const ORANGE   = "#FF9500";
const RED      = "#FF3B30";
const BLUE     = "#007AFF";
const PURPLE   = "#AF52DE";

const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";
const MAX_SELECT    = 50;

// ─── Types ───────────────────────────────────────────────────
type RoleKey          = "USER" | "CAD" | "CADNA" | "AGENT";
type AccountStatusKey = "active" | "paused" | "disabled";

type ProfileRow = {
  id:                string;
  email:             string | null;
  full_name:         string | null;
  role:              string | null;
  is_admin:          boolean | null;
  account_status:    string | null;
  profile_photo_url: string | null;
  avatar_url:        string | null;
  is_agent_from_eds?: boolean;
};

// ─── Utils ───────────────────────────────────────────────────
const norm           = (v?: string | null) => (v ?? "").toLowerCase().trim();
const isSupremeEmail = (email?: string | null) => norm(email) === norm(SUPREME_EMAIL);

function effectiveRole(p: ProfileRow | null): RoleKey {
  if (!p) return "USER";
  if (isSupremeEmail(p.email)) return "CAD";
  if (p.is_agent_from_eds)     return "AGENT";
  const r = norm(p.role);
  if (r === "cad" || r === "admin") return "CAD";
  if (r === "cadna")                return "CADNA";
  return "USER";
}

function displayRole(p: ProfileRow | null): string {
  if (!p) return "USER";
  if (isSupremeEmail(p.email)) return "SUPREME";
  return effectiveRole(p);
}

function normAccountStatus(s?: string | null): AccountStatusKey {
  const v = norm(s);
  if (v === "active" || v === "paused" || v === "disabled") return v;
  return "active";
}

function matchesFilter(p: ProfileRow | null, filter: RoleKey): boolean {
  if (!p) return false;
  if (filter === "USER") return true;
  return effectiveRole(p) === filter;
}

// ─── Composants UI ───────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    SUPREME: { color: GOLD,   bg: GOLD_DIM },
    CAD:     { color: BLUE,   bg: "rgba(0,122,255,0.10)" },
    CADNA:   { color: PURPLE, bg: "rgba(175,82,222,0.10)" },
    AGENT:   { color: GREEN,  bg: "rgba(52,199,89,0.10)" },
    USER:    { color: MUTED,  bg: "rgba(110,110,115,0.10)" },
  };
  const s = map[role] ?? map.USER;
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color: s.color, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>{role}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    active:   { color: GREEN,  bg: "rgba(52,199,89,0.10)",  label: "ACTIF"  },
    paused:   { color: ORANGE, bg: "rgba(255,149,0,0.10)",  label: "PAUSE"  },
    disabled: { color: RED,    bg: "rgba(255,59,48,0.10)",  label: "BLOQUÉ" },
  };
  const s = map[status] ?? map.active;
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color: s.color, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>{s.label}</Text>
    </View>
  );
}

function Avatar({ uri, size, name }: { uri: string | null; size: number; name?: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?").trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
  if (uri && !failed) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: SOFT }} onError={() => setFailed(true)} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: GOLD_DIM, borderWidth: 1.5, borderColor: "rgba(212,175,55,0.3)", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: GOLD, fontWeight: "800", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

function IOSToast({ toast, anim }: {
  toast: { title: string; sub: string; type: "success" | "error" | "info" } | null;
  anim: Animated.Value;
}) {
  if (!toast) return null;
  const color = toast.type === "success" ? GREEN : toast.type === "error" ? RED : BLUE;
  const icon: any = toast.type === "success" ? "checkmark-circle" : toast.type === "error" ? "close-circle" : "information-circle";
  return (
    <Animated.View style={[s.toast, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
      <View style={[s.toastIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.toastTitle}>{toast.title}</Text>
        <Text style={s.toastSub}>{toast.sub}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────
export default function Nomination() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [authorized,  setAuthorized]  = useState<boolean | null>(null);
  const [meEmail,     setMeEmail]     = useState("");
  const [activeRole,  setActiveRole]  = useState<RoleKey>("USER");
  const [profiles,    setProfiles]    = useState<ProfileRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [query,       setQuery]       = useState("");
  const [live,        setLive]        = useState("");
  const [sheet,       setSheet]       = useState<ProfileRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Sélection multiple (max 50) ──────────────────────────
  const [selectMode,   setSelectMode]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());

  const liveTimer = useRef<any>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{ title: string; sub: string; type: "success" | "error" | "info" } | null>(null);

  const isSupreme = useMemo(() => isSupremeEmail(meEmail), [meEmail]);

  const showToast = (title: string, sub: string, type: "success" | "error" | "info" = "info") => {
    setToast({ title, sub, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3400);
  };

  // ─── Guard ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (!u) return router.replace("/auth/login");
      setMeEmail(u.email || "");
      if (isSupremeEmail(u.email)) { setAuthorized(true); return; }
      router.replace("/banq/suspentz");
    })();
  }, []);

  // ─── Fetch ───────────────────────────────────────────────
  const fetchProfiles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,is_admin,account_status,profile_photo_url,avatar_url,created_at")
      .order("created_at", { ascending: false });

    const { data: eds } = await supabase.from("eds").select("auth_uid").eq("is_active", true);
    const edsMap: Record<string, boolean> = {};
    eds?.forEach(e => { edsMap[e.auth_uid] = true; });

    const merged = (profilesData || [])
      .filter((p: any) => p?.id)
      .map((p: any) => ({
          ...p,
          is_agent_from_eds: !!edsMap[p.id],
          // ✅ Cache busting sur les avatars
          avatar_url:         avatarStore.bust(p.avatar_url, p.id),
          profile_photo_url:  avatarStore.bust(p.profile_photo_url, p.id),
        }));
    setProfiles(merged);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { if (authorized) fetchProfiles(); }, [authorized]);

  // ✅ Recharger si un avatar change
  useEffect(() => {
    return avatarStore.subscribe(() => fetchProfiles(true));
  }, [fetchProfiles]);

  // ─── Realtime ────────────────────────────────────────────
  useEffect(() => {
    if (!authorized) return;
    const ch = supabase.channel("rz-nomination-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProfiles(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authorized]);

  // ─── Debounce recherche ───────────────────────────────────
  useEffect(() => {
    if (liveTimer.current) clearTimeout(liveTimer.current);
    liveTimer.current = setTimeout(() => setLive(query), 220);
    return () => liveTimer.current && clearTimeout(liveTimer.current);
  }, [query]);

  // ─── Filtres + recherche ──────────────────────────────────
  const counts = useMemo(() => ({
    all:   profiles.length,
    cad:   profiles.filter(p => matchesFilter(p, "CAD")).length,
    cadna: profiles.filter(p => matchesFilter(p, "CADNA")).length,
    agent: profiles.filter(p => matchesFilter(p, "AGENT")).length,
  }), [profiles]);

  const filtered = useMemo(() => {
    const q    = norm(live);
    const base = profiles.filter(p => matchesFilter(p, activeRole));
    if (q.length < 2) return base;
    return base.filter(p =>
      norm(p.email).includes(q) || norm(p.full_name).includes(q) ||
      norm(p.role).includes(q)  || norm(displayRole(p)).includes(q)
    );
  }, [profiles, activeRole, live]);

  // ─── Sélection ───────────────────────────────────────────
  const toggleSelect = (id: string) => {
    if (isSupremeEmail(profiles.find(p => p.id === id)?.email)) return;
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); }
      else if (n.size < MAX_SELECT) { n.add(id); }
      else { showToast(`Maximum ${MAX_SELECT}`, "Désélectionnez un compte d'abord", "info"); }
      return n;
    });
  };

  const selectAll = () => {
    const eligible = filtered
      .filter(p => !isSupremeEmail(p.email))
      .slice(0, MAX_SELECT)
      .map(p => p.id);
    setSelectedIds(new Set(eligible));
  };

  const clearSelect = () => { setSelectedIds(new Set()); setSelectMode(false); };

  // ─── SUPPRESSION COMPLÈTE (via RPC supreme_delete_user) ──
  // La RPC supprime : auth.users + profiles + wallets + wallet_transactions
  //                  + store_products + user_content_access + user_paid_contents
  //                  + notifications + eds + tout le reste
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      `Supprimer ${selectedIds.size} compte${selectedIds.size > 1 ? "s" : ""} ?`,
      "Cette action est IRRÉVERSIBLE.\n\nTout sera supprimé :\n• Compte d'authentification\n• Profil\n• Wallet & historique\n• Contenus publiés\n• Accès & paiements\n\nContinuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "SUPPRIMER DÉFINITIVEMENT",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            let success = 0, failed = 0;
            for (const uid of selectedIds) {
              try {
                const { data: rpcData, error } = await supabase.rpc("supreme_delete_user", { p_uid: uid });
                console.log("🗑️ Delete", uid, "→", JSON.stringify(rpcData), "err:", error?.message);
                // ✅ Vérifier data.ok ET error — la RPC retourne {"ok":false} sans lever d'erreur Supabase
                if (error || !rpcData?.ok) {
                  const msg = error?.message ?? rpcData?.error ?? "unknown";
                  console.warn("❌ Delete failed:", uid, msg);
                  failed++;
                } else {
                  success++;
                }
              } catch { failed++; }
            }
            setActionLoading(false);
            clearSelect();
            fetchProfiles(true);
            if (failed === 0) showToast(`${success} compte${success > 1 ? "s" : ""} supprimé${success > 1 ? "s" : ""} ✅`, "Suppression complète dans toute l'application", "success");
            else showToast(`${success} OK · ${failed} échec${failed > 1 ? "s" : ""}`, "Certains comptes n'ont pas pu être supprimés", "error");
          },
        },
      ]
    );
  };

  // ─── BLOCAGE DÉFINITIF EN MASSE ──────────────────────────
  const handleBulkBlock = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      `Bloquer ${selectedIds.size} compte${selectedIds.size > 1 ? "s" : ""} ?`,
      "Les comptes seront bloqués :\n• Connexion impossible\n• Wallet désactivé\n• Agent révoqué\n\nAction réversible depuis ce panneau.\nContinuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Bloquer",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            const ids = [...selectedIds];
            // Bloquer profiles
            await supabase.from("profiles").update({ account_status: "disabled" }).in("id", ids);
            // Bloquer wallets
            await supabase.from("wallets").update({ status: "DISABLED" }).in("user_id", ids);
            // Révoquer agents
            await supabase.from("eds").update({ is_active: false }).in("auth_uid", ids);
            setActionLoading(false);
            clearSelect();
            fetchProfiles(true);
            showToast(`${ids.length} compte${ids.length > 1 ? "s" : ""} bloqué${ids.length > 1 ? "s" : ""} ✅`, "Wallet désactivé · Agent révoqué", "success");
          },
        },
      ]
    );
  };

  // ─── Actions individuelles ────────────────────────────────
  const setRole = async (p: ProfileRow, role: RoleKey) => {
    if (!isSupreme) { showToast("Non autorisé", "", "error"); return; }
    setActionLoading(true);
    await supabase.from("profiles").update({ role: role.toLowerCase() }).eq("id", p.id);
    if (role === "AGENT") {
      await supabase.from("eds").upsert(
        { auth_uid: p.id, name: p.full_name || p.email || "Agent RHAZN", is_active: true, updated_at: new Date().toISOString() },
        { onConflict: "auth_uid" }
      );
    } else {
      await supabase.from("eds").update({ is_active: false }).eq("auth_uid", p.id);
    }
    setActionLoading(false);
    showToast("Rôle mis à jour ✅", `${p.email} → ${role}`, "success");
    fetchProfiles(true);
    setSheet(null);
  };

  const setAccountStatus = async (p: ProfileRow, status: AccountStatusKey) => {
    if (!isSupreme || isSupremeEmail(p.email)) return;
    setActionLoading(true);
    const ws = status === "active" ? "ACTIVE" : status === "paused" ? "PAUSED" : "DISABLED";
    await supabase.from("profiles").update({ account_status: status }).eq("id", p.id);
    await supabase.from("wallets").update({ status: ws }).eq("user_id", p.id);
    if (status === "disabled") await supabase.from("eds").update({ is_active: false }).eq("auth_uid", p.id);
    setActionLoading(false);
    showToast("Statut mis à jour ✅", `${p.full_name ?? p.email} → ${status.toUpperCase()}`, "success");
    fetchProfiles(true);
    setSheet(null);
  };

  const deleteSingle = (p: ProfileRow) => {
    Alert.alert(
      "Supprimer ce compte ?",
      `${p.full_name ?? p.email}\n\nSuppression complète et irréversible de toutes les données.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            const { data: rd, error } = await supabase.rpc("supreme_delete_user", { p_uid: p.id });
            console.log("🗑️ Single delete", p.id, "→", JSON.stringify(rd), "err:", error?.message);
            setActionLoading(false);
            setSheet(null);
            if (error || !rd?.ok) {
              const msg = error?.message ?? rd?.error ?? "Erreur inconnue";
              showToast("Erreur suppression", msg, "error");
            } else {
              showToast("Compte supprimé ✅", p.email ?? "", "success");
              fetchProfiles(true);
            }
          },
        },
      ]
    );
  };

  const generateCodeForAgent = async (p: ProfileRow) => {
    const { data, error } = await supabase.rpc("generate_agent_code", { p_agent_id: p.id });
    if (error) { showToast("Erreur", error.message, "error"); return; }
    showToast("Code Agent généré ✅", `Code : ${data}`, "success");
    fetchProfiles(true);
  };

  if (!authorized) {
    return <View style={[s.center, { backgroundColor: BG }]}><ActivityIndicator color={GOLD} size="large" /></View>;
  }

  const selCount = selectedIds.size;

  return (
    <SecureScreen scope="RZ-Admin">
      <View style={s.screen}>
        <IOSToast toast={toast} anim={toastAnim} />

        {/* ── Overlay loading ───────────────────────── */}
        {actionLoading && (
          <View style={s.loadingOverlay}>
            <View style={s.loadingCard}>
              <ActivityIndicator color={GOLD} size="large" />
              <Text style={{ color: TEXT, fontWeight: "700", marginTop: 12, fontSize: 14 }}>En cours…</Text>
            </View>
          </View>
        )}

        {/* ── HEADER ─────────────────────────────────── */}
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => { if (selectMode) clearSelect(); else router.back(); }} style={s.backBtn}>
            <Ionicons name={selectMode ? "close" : "chevron-back"} size={18} color={TEXT} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={s.hTitle}>{selectMode ? `${selCount} sélectionné${selCount > 1 ? "s" : ""}` : "Nomination"}</Text>
            <Text style={s.hSub}>
              {selectMode ? `Max ${MAX_SELECT} · Appuyez sur un compte pour sélectionner` : `${profiles.length} membres`}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!selectMode ? (
              <>
                <View style={s.supremePill}>
                  <Ionicons name="shield-checkmark" size={12} color="#000" />
                  <Text style={s.supremePillTxt}>SUPREME</Text>
                </View>
                {/* ✅ Bouton mode sélection */}
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: `${GOLD}40`, alignItems: "center", justifyContent: "center" }}
                  onPress={() => setSelectMode(true)}
                >
                  <Ionicons name="checkmark-done-outline" size={18} color={GOLD} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: GOLD, borderRadius: 10 }} onPress={selectAll}>
                <Text style={{ color: "#000", fontWeight: "900", fontSize: 12 }}>Tout ({Math.min(filtered.filter(p => !isSupremeEmail(p.email)).length, MAX_SELECT)})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── BARRE D'ACTIONS BULK ────────────────────── */}
        {selectMode && selCount > 0 && (
          <View style={s.bulkBar}>
            <Text style={s.bulkCount}>{selCount}/{MAX_SELECT}</Text>
            <View style={{ flex: 1 }} />
            {/* Bloquer */}
            <TouchableOpacity style={s.bulkBtnOrange} onPress={handleBulkBlock}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={s.bulkBtnTxt}>Bloquer</Text>
            </TouchableOpacity>
            {/* Supprimer */}
            <TouchableOpacity style={s.bulkBtnRed} onPress={handleBulkDelete}>
              <Ionicons name="trash" size={14} color="#fff" />
              <Text style={s.bulkBtnTxt}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FILTRES RÔLE ────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
          {([
            { key: "USER",  label: "Tous",  count: counts.all,   color: MUTED,   icon: "people-outline"        },
            { key: "CAD",   label: "CAD",   count: counts.cad,   color: BLUE,    icon: "shield-outline"        },
            { key: "CADNA", label: "CADNA", count: counts.cadna, color: PURPLE,  icon: "ribbon-outline"        },
            { key: "AGENT", label: "Agent", count: counts.agent, color: GREEN,   icon: "person-circle-outline" },
          ] as const).map(f => {
            const isActive = activeRole === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, isActive && { backgroundColor: f.color, borderColor: f.color }]}
                onPress={() => setActiveRole(f.key as RoleKey)}
                activeOpacity={0.75}
              >
                <Ionicons name={f.icon as any} size={15} color={isActive ? "#fff" : f.color} />
                <Text style={[s.filterChipTxt, isActive && { color: "#fff" }]}>{f.label}</Text>
                <View style={[s.filterCount, isActive && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                  <Text style={[s.filterCountTxt, isActive && { color: "#fff" }]}>{f.count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── RECHERCHE ───────────────────────────────── */}
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={MUTED} />
          <TextInput
            value={query} onChangeText={setQuery}
            placeholder="Rechercher nom, email, rôle…"
            placeholderTextColor={MUTED}
            style={s.searchInput}
            autoCapitalize="none" autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── LISTE ───────────────────────────────────── */}
        {loading ? (
          <View style={s.center}><ActivityIndicator color={GOLD} size="large" /></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchProfiles(true); }} tintColor={GOLD} />}
            contentContainerStyle={{ paddingBottom: 150, paddingTop: 6 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={14}
            windowSize={9}
            removeClippedSubviews
            renderItem={({ item }) => {
              const roleTag    = displayRole(item);
              const statusTag  = normAccountStatus(item.account_status);
              const photo      = item.avatar_url || item.profile_photo_url || null;
              const isMe       = isSupremeEmail(item.email);
              const isSelected = selectedIds.has(item.id);
              const isDisabled = isMe && selectMode;

              return (
                <TouchableOpacity
                  style={[
                    s.card,
                    isMe       && s.cardSupreme,
                    isSelected && s.cardSelected,
                    isDisabled && { opacity: 0.4 },
                  ]}
                  onPress={() => {
                    if (selectMode) { if (!isMe) toggleSelect(item.id); return; }
                    if (!isSupreme) { showToast("Accès refusé", "Vous n'êtes pas SUPREME", "error"); return; }
                    if (isMe) { showToast("Action bloquée", "Impossible de modifier SUPREME", "info"); return; }
                    setSheet(item);
                  }}
                  onLongPress={() => {
                    if (!isMe) { setSelectMode(true); toggleSelect(item.id); }
                  }}
                  activeOpacity={0.75}
                >
                  <View style={s.cardTop}>
                    {/* ✅ Checkbox en mode sélection */}
                    {selectMode && !isMe && (
                      <View style={[s.checkbox, isSelected && s.checkboxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    )}
                    <Avatar uri={photo} size={52} name={item.full_name} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardName} numberOfLines={1}>{item.full_name || "Profil inconnu"}</Text>
                      <Text style={s.cardEmail} numberOfLines={1}>{item.email || "—"}</Text>
                      <View style={s.cardBadges}>
                        <RoleBadge role={roleTag} />
                        <StatusBadge status={statusTag} />
                      </View>
                    </View>
                    {/* Actions rapides — visible uniquement hors mode sélection */}
                    {!selectMode && isSupreme && !isMe && (
                      <View style={{ alignItems: "center", gap: 8 }}>
                        <View style={s.manageBtn}>
                          <Ionicons name="settings-outline" size={15} color={GOLD} />
                        </View>
                      </View>
                    )}
                    {isMe && <View style={s.crownWrap}><Text style={{ fontSize: 20 }}>👑</Text></View>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ paddingTop: 60, alignItems: "center", gap: 10 }}>
                <Ionicons name="people-outline" size={40} color={SOFT} />
                <Text style={{ color: MUTED, fontWeight: "600" }}>Aucun résultat</Text>
              </View>
            }
          />
        )}

        {/* ── MODAL GESTION INDIVIDUELLE ──────────────── */}
        <Modal visible={!!sheet} transparent animationType="slide">
          <Pressable style={s.modalBackdrop} onPress={() => setSheet(null)} />
          <View style={s.sheetOuter}>
            <View style={s.sheet}>
              <View style={s.sheetHandle} />

              {sheet && (
                <View style={s.sheetProfil}>
                  <Avatar uri={sheet.avatar_url || sheet.profile_photo_url || null} size={60} name={sheet.full_name} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.sheetName}>{sheet.full_name || "—"}</Text>
                    <Text style={s.sheetEmail}>{sheet.email || "—"}</Text>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                      <RoleBadge role={displayRole(sheet)} />
                      <StatusBadge status={normAccountStatus(sheet.account_status)} />
                    </View>
                  </View>
                </View>
              )}

              {/* ── Rôle ── */}
              <Text style={s.sheetSection}>Rôle</Text>
              <View style={s.sheetGrid}>
                {([
                  { key: "USER",  label: "USER",  sub: "Compte standard",      color: MUTED   },
                  { key: "CAD",   label: "CAD",   sub: "Administrateur",        color: BLUE    },
                  { key: "CADNA", label: "CADNA", sub: "Commission validation", color: PURPLE  },
                  { key: "AGENT", label: "AGENT", sub: "Agent RHAZN (ED)",      color: GREEN   },
                ] as const).map(r => (
                  <TouchableOpacity
                    key={r.key}
                    style={[s.sheetOptionBtn, effectiveRole(sheet!) === r.key && { borderColor: r.color, backgroundColor: `${r.color}10` }]}
                    onPress={() => sheet && setRole(sheet, r.key)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.color }} />
                      <Text style={[s.sheetOptionTxt, effectiveRole(sheet!) === r.key && { color: r.color }]}>{r.label}</Text>
                    </View>
                    <Text style={s.sheetOptionSub}>{r.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Statut ── */}
              <Text style={[s.sheetSection, { marginTop: 16 }]}>Statut du compte</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {([
                  { key: "active",   label: "ACTIF",  color: GREEN  },
                  { key: "paused",   label: "PAUSE",  color: ORANGE },
                  { key: "disabled", label: "BLOQUÉ", color: RED    },
                ] as const).map(st => {
                  const current = normAccountStatus(sheet?.account_status);
                  return (
                    <TouchableOpacity
                      key={st.key}
                      style={[s.statusBtn, current === st.key && { backgroundColor: st.color, borderColor: st.color }]}
                      onPress={() => sheet && setAccountStatus(sheet, st.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.statusBtnTxt, current === st.key && { color: "#fff" }]}>{st.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Code agent ── */}
              {sheet && effectiveRole(sheet) === "AGENT" && (
                <TouchableOpacity style={s.agentCodeBtn} onPress={() => sheet && generateCodeForAgent(sheet)} activeOpacity={0.85}>
                  <Ionicons name="key-outline" size={16} color={CARD} />
                  <Text style={s.agentCodeTxt}>Générer / Regénérer Code Agent</Text>
                </TouchableOpacity>
              )}

              {/* ✅ Bouton suppression individuelle */}
              <TouchableOpacity
                style={s.dangerBtn}
                activeOpacity={0.85}
                onPress={() => { setSheet(null); setTimeout(() => sheet && deleteSingle(sheet), 300); }}
              >
                <Ionicons name="trash-outline" size={16} color={CARD} />
                <Text style={s.dangerBtnTxt}>Supprimer définitivement</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setSheet(null)} style={s.cancelBtn}>
                <Text style={s.cancelBtnTxt}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </SecureScreen>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.40)", zIndex: 9999, alignItems: "center", justifyContent: "center" },
  loadingCard:    { backgroundColor: CARD, borderRadius: 20, padding: 30, alignItems: "center", borderWidth: 1, borderColor: SOFT },

  // Header
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  hTitle:  { color: TEXT, fontSize: 20, fontWeight: "800" },
  hSub:    { color: MUTED, fontSize: 12, marginTop: 2 },
  supremePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: GOLD, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  supremePillTxt: { color: "#000", fontSize: 11, fontWeight: "900" },

  // ✅ Barre d'actions bulk
  bulkBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: CARD, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: SOFT,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  bulkCount:     { color: TEXT, fontWeight: "900", fontSize: 15 },
  bulkBtnOrange: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  bulkBtnRed:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: RED,    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  bulkBtnTxt:    { color: "#fff", fontWeight: "900", fontSize: 13 },

  // Filtres
  filtersRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 14, paddingTop: 4, alignItems: "center" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: CARD, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: SOFT, minHeight: 44, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  filterChipTxt:  { color: TEXT, fontWeight: "800", fontSize: 14 },
  filterCount:    { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, minWidth: 28, alignItems: "center" },
  filterCountTxt: { color: MUTED, fontWeight: "900", fontSize: 12 },

  // Recherche
  searchBox:   { flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: SOFT, gap: 8, marginHorizontal: 16, marginBottom: 6 },
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },

  // Cards
  card: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: SOFT, marginTop: 10, marginHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardSupreme:  { borderColor: "rgba(212,175,55,0.4)", borderWidth: 1.5 },
  cardSelected: { borderColor: BLUE, borderWidth: 2, backgroundColor: "rgba(0,122,255,0.04)" },
  cardTop:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  cardName:     { color: TEXT, fontWeight: "800", fontSize: 15 },
  cardEmail:    { color: MUTED, fontSize: 12, marginTop: 2 },
  cardBadges:   { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  manageBtn:    { width: 38, height: 38, borderRadius: 12, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: "rgba(212,175,55,0.3)", alignItems: "center", justifyContent: "center" },
  crownWrap:    { width: 38, height: 38, alignItems: "center", justifyContent: "center" },

  // ✅ Checkbox
  checkbox:       { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: SOFT, backgroundColor: CARD, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: BLUE, borderColor: BLUE },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheetOuter:    { position: "absolute", left: 0, right: 0, bottom: 0 },
  sheet:         { backgroundColor: CARD, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24, paddingTop: 10, borderTopWidth: 1, borderColor: SOFT, gap: 14 },
  sheetHandle:   { width: 46, height: 4, borderRadius: 99, backgroundColor: "#D1D1D6", alignSelf: "center", marginBottom: 4 },
  sheetProfil:   { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: BG, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: SOFT },
  sheetName:     { color: TEXT, fontWeight: "800", fontSize: 16 },
  sheetEmail:    { color: MUTED, fontSize: 12 },
  sheetSection:  { color: MUTED, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  sheetGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sheetOptionBtn: { flex: 1, minWidth: "47%", backgroundColor: BG, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: SOFT },
  sheetOptionTxt: { color: TEXT, fontWeight: "800", fontSize: 13 },
  sheetOptionSub: { color: MUTED, fontSize: 11, marginTop: 3 },
  statusBtn:      { flex: 1, backgroundColor: BG, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1.5, borderColor: SOFT },
  statusBtnTxt:   { color: MUTED, fontWeight: "800", fontSize: 12 },
  agentCodeBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: BLUE, borderRadius: 14, paddingVertical: 14 },
  agentCodeTxt:   { color: CARD, fontWeight: "800", fontSize: 14 },
  dangerBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: RED, borderRadius: 14, paddingVertical: 14 },
  dangerBtnTxt:   { color: CARD, fontWeight: "800", fontSize: 14 },
  cancelBtn:      { alignItems: "center", paddingVertical: 6 },
  cancelBtnTxt:   { color: MUTED, fontWeight: "700", fontSize: 14 },

  // Toast
  toast:      { position: "absolute", top: Platform.OS === "ios" ? 56 : 28, left: 14, right: 14, zIndex: 9999, backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 14, borderWidth: 1, borderColor: SOFT },
  toastIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  toastTitle: { color: TEXT, fontWeight: "800", fontSize: 14 },
  toastSub:   { color: MUTED, fontSize: 12, marginTop: 2 },
});