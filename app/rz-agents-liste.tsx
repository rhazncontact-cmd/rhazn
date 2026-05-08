// app/rz-agents.tsx
// ✅ Liste des Agents RHAZN — Apple-like premium
// ✅ Même logique fetch que nomination.tsx (2 requêtes séparées)
// ✅ Carte : code agent, photo, nom, zone, commune, statut
// ✅ Bouton Contacter → vendor-chat | Bouton Recharger → user-agent-access

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const FOOTER_H = 80;

const C = {
  bg:       "#F2F2F7",
  card:     "#FFFFFF",
  gold:     "#D4AF37",
  goldDim:  "rgba(212,175,55,0.12)",
  goldBd:   "rgba(212,175,55,0.28)",
  teal:     "#32ADE6",
  tealDim:  "rgba(50,173,230,0.10)",
  tealBd:   "rgba(50,173,230,0.28)",
  green:    "#30D158",
  greenDim: "rgba(48,209,88,0.10)",
  greenBd:  "rgba(48,209,88,0.28)",
  blue:     "#0A84FF",
  text:     "#0A0A0A",
  sub:      "#3C3C43",
  muted:    "#8E8E93",
  border:   "#E5E5EA",
  soft:     "#F2F2F7",
};

type Agent = {
  auth_uid:  string;
  eds_name:  string | null;
  is_active: boolean;
  is_online: boolean;        // ✅ présence temps réel
  full_name: string | null;
  avatar_url:string | null;
};

function getInitials(name?: string | null): string {
  if (!name) return "A";
  const p = name.trim().split(" ").filter(Boolean);
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// ─────────────────────────────────────────────────────
// CARTE AGENT — Apple-like
// ─────────────────────────────────────────────────────
function AgentCard({ agent, myUid, onContact, onRecharge, index }: {
  agent: Agent;
  myUid: string | null;
  onContact: () => void;
  onRecharge: () => void;
  index: number;
}) {
  const isSelf = agent.auth_uid === myUid;

  return (
    <View style={a.card}>

      {/* ROW PRINCIPAL */}
      <View style={a.row}>

        {/* AVATAR + statut connexion */}
        <View style={{ alignItems: "center", gap: 5 }}>
          <View style={{ position: "relative" }}>
            {agent.avatar_url ? (
              <Image
                source={{ uri: agent.avatar_url }}
                style={a.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[a.avatar, a.avatarFallback]}>
                <Text style={a.avatarInitials}>{getInitials(agent.full_name)}</Text>
              </View>
            )}
            {/* ✅ Dot vert uniquement si actif (en ligne) */}
            {agent.is_online && <View style={a.dot} />}
          </View>
          {/* ✅ Texte statut sous la photo */}
          <Text style={[a.onlineTxt, agent.is_online ? a.onlineTxtOn : a.onlineTxtOff]}>
            {agent.is_online ? "En ligne" : "Hors ligne"}
          </Text>
        </View>

        {/* INFOS */}
        <View style={{ flex: 1, gap: 5 }}>

          {/* Nom */}
          <Text style={a.name} numberOfLines={1}>
            {agent.full_name ?? "Agent RHAZN"}
          </Text>

          {/* ✅ Badge Agent Certifié RHAZN */}
          <View style={a.certifiedBadge}>
            <Ionicons name="shield-checkmark" size={11} color={C.gold} />
            <Text style={a.certifiedTxt}>Agent Certifié RHAZN</Text>
          </View>

          {/* Nom EDS si différent du profil */}
          {agent.eds_name && agent.eds_name !== agent.full_name && (
            <View style={a.locationRow}>
              <Ionicons name="business-outline" size={11} color={C.muted} />
              <Text style={a.locationTxt} numberOfLines={1}>{agent.eds_name}</Text>
            </View>
          )}
        </View>

        {/* BADGE STATUT */}
        <View style={[a.statusChip, agent.is_active ? a.chipOn : a.chipOff]}>
          <Text style={[a.statusTxt, agent.is_active ? a.txtOn : a.txtOff]}>
            {agent.is_active ? "Actif" : "Inactif"}
          </Text>
        </View>
      </View>

      {/* SÉPARATEUR */}
      <View style={a.divider} />

      {/* BOUTONS */}
      {!isSelf ? (
        <View style={a.btnRow}>
          <TouchableOpacity style={a.contactBtn} onPress={onContact} activeOpacity={0.82}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.blue} />
            <Text style={a.contactTxt}>Contacter</Text>
          </TouchableOpacity>
          <View style={a.btnDivider} />
          <TouchableOpacity style={a.rechargeBtn} onPress={onRecharge} activeOpacity={0.82}>
            <Ionicons name="flash-outline" size={16} color={C.gold} />
            <Text style={a.rechargeTxt}>Recharger</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={a.replyBtn} onPress={onContact} activeOpacity={0.85}>
          <Ionicons name="chatbubbles" size={16} color="#000" />
          <Text style={a.replyTxt}>Répondre aux clients</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const AVATAR_SZ = 56;
const a = StyleSheet.create({
  card:          { backgroundColor: C.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 20, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: "hidden" },
  row:           { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 16 },
  avatar:        { width: AVATAR_SZ, height: AVATAR_SZ, borderRadius: AVATAR_SZ / 2, borderWidth: 2, borderColor: C.teal },
  avatarFallback:{ backgroundColor: C.tealDim, alignItems: "center", justifyContent: "center" },
  avatarInitials:{ color: C.teal, fontWeight: "900", fontSize: AVATAR_SZ * 0.32 },
  dot:           { position: "absolute", bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, borderWidth: 2.5, borderColor: C.card, backgroundColor: C.green },
  onlineTxt:     { fontSize: 10, fontWeight: "700", textAlign: "center" },
  onlineTxtOn:   { color: C.green },
  onlineTxtOff:  { color: C.red },
  name:          { color: C.text, fontWeight: "800", fontSize: 15, letterSpacing: -0.2 },
  codePill:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.tealDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.tealBd, alignSelf: "flex-start" },
  codeTxt:       { color: C.teal, fontWeight: "900", fontSize: 11, letterSpacing: 0.5 },
  certifiedBadge:{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.goldDim, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: C.goldBd, alignSelf: "flex-start" },
  certifiedTxt:  { color: C.gold, fontWeight: "800", fontSize: 11 },
  locationRow:   { flexDirection: "row", alignItems: "center", gap: 5 },
  locationTxt:   { color: C.muted, fontSize: 12, fontWeight: "600", flex: 1 },
  statusChip:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, alignSelf: "flex-start", marginTop: 2 },
  chipOn:        { backgroundColor: C.greenDim, borderColor: C.greenBd },
  chipOff:       { backgroundColor: "rgba(255,59,48,0.10)", borderColor: "rgba(255,59,48,0.28)" },
  statusTxt:     { fontWeight: "800", fontSize: 11, letterSpacing: 0.3 },
  txtOn:         { color: C.green },
  txtOff:        { color: C.red },
  divider:       { height: 1, backgroundColor: C.border, marginHorizontal: 0 },
  btnRow:        { flexDirection: "row" },
  btnDivider:    { width: 1, backgroundColor: C.border },
  contactBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14 },
  contactTxt:    { color: C.blue, fontWeight: "800", fontSize: 14 },
  rechargeBtn:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14 },
  rechargeTxt:   { color: C.gold, fontWeight: "800", fontSize: 14 },
  selfRow:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  selfTxt:       { color: C.gold, fontWeight: "700", fontSize: 13 },
  replyBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.gold, borderRadius: 14, paddingVertical: 13, marginHorizontal: 0 },
  replyTxt:      { color: "#000", fontWeight: "900", fontSize: 14 },
});

// ─────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────
export default function RzAgentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [myUid,      setMyUid]      = useState<string | null>(null);
  const [agents,     setAgents]     = useState<Agent[]>([]);
  const [dbError,    setDbError]    = useState<string | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setMyUid(session?.user?.id ?? null);
      await loadAgents();
    })();
  }, []);

  // ✅ Fetch avec debug console
  const loadAgents = async () => {
    console.log("🔍 RZ-AGENTS: début loadAgents");

    // 1. Tester la connexion Supabase simplement
    const { data: edsData, error: edsErr } = await supabase
      .from("eds")
      .select("auth_uid, name, is_active");

    console.log("📦 eds data count:", edsData?.length ?? 0);
    console.log("❌ eds error:", edsErr?.message ?? "none");

    if (edsErr) {
      console.error("Supabase eds error:", edsErr);
      setAgents([]);
      setLoading(false);
      setRefreshing(false);
      setDbError(`Erreur DB: ${edsErr.message}`);
      return;
    }

    if (!edsData || edsData.length === 0) {
      console.log("⚠️ eds table vide ou inaccessible");
      setAgents([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // 2. Profils
    const uids = edsData.map((e: any) => e.auth_uid);
    console.log("👥 UIDs à charger:", uids.length, uids[0]);

    const { data: profilesData, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, profile_photo_url")
      .in("id", uids);

    console.log("👤 profiles count:", profilesData?.length ?? 0);
    console.log("❌ profiles error:", profErr?.message ?? "none");

    const profMap: Record<string, any> = {};
    (profilesData ?? []).forEach((p: any) => { profMap[p.id] = p; });

    // 3. Merge
    const enriched: Agent[] = edsData.map((e: any) => {
      const prof = profMap[e.auth_uid] ?? {};
      return {
        auth_uid:   e.auth_uid,
        eds_name:   e.name ?? null,
        is_active:  e.is_active ?? false,
        is_online:  false, // sera mis à jour par presenceMap
        full_name:  prof.full_name ?? e.name ?? null,
        avatar_url: prof.avatar_url ?? prof.profile_photo_url ?? null,
      };
    });

    console.log("✅ agents enriched:", enriched.length, JSON.stringify(enriched[0]));
    setAgents(enriched);
    // ✅ Charger la présence des agents
    await loadPresence(uids);
    setLoading(false);
    setRefreshing(false);
  };

  // ✅ Charger la présence depuis user_presence
  const loadPresence = async (uids: string[]) => {
    if (uids.length === 0) return;
    const { data } = await supabase
      .from("user_presence")
      .select("user_uid, is_online, last_seen")
      .in("user_uid", uids);

    const map: Record<string, boolean> = {};
    const now = Date.now();
    (data ?? []).forEach((p: any) => {
      // Considéré en ligne si is_online = true ET last_seen < 2 minutes
      const lastSeen = new Date(p.last_seen).getTime();
      map[p.user_uid] = p.is_online && (now - lastSeen) < 300_000;
    });
    setPresenceMap(map);
  };

  // ✅ Realtime presence subscription
  useEffect(() => {
    const channel = supabase
      .channel("agents-presence")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "user_presence",
      }, (payload: any) => {
        const uid = payload.new?.user_uid ?? payload.old?.user_uid;
        if (!uid) return;
        const now = Date.now();
        const lastSeen = new Date(payload.new?.last_seen ?? 0).getTime();
        const online = payload.new?.is_online && (now - lastSeen) < 300_000;
        setPresenceMap(prev => ({ ...prev, [uid]: online }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const onRefresh = async () => { setRefreshing(true); await loadAgents(); };

  // ✅ Enrichir avec présence temps réel
  const agentsWithPresence = agents.map(a => ({ ...a, is_online: presenceMap[a.auth_uid] ?? false }));

  // ✅ Filtrage
  const filtered = agentsWithPresence.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.full_name ?? "").toLowerCase().includes(q) ||
      (a.eds_name  ?? "").toLowerCase().includes(q)
    );
  });

  // ✅ Trier : en ligne en premier, puis actifs, puis inactifs
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return 0;
  });

  const activeCount = agents.filter(a => a.is_active).length;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Ionicons name="people-circle" size={22} color={C.teal} />
          </View>
          <View>
            <Text style={s.headerTitle}>Agents RHAZN</Text>
            <Text style={s.headerSub}>
              {loading
                ? "Chargement…"
                : `${activeCount} actif${activeCount > 1 ? "s" : ""} · ${agents.length} total`
              }
            </Text>
          </View>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} activeOpacity={0.75}>
          <Ionicons name="refresh" size={18} color={C.teal} />
        </TouchableOpacity>
      </View>

      {/* ── BARRE DE RECHERCHE ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={C.muted} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, code, zone, commune…"
          placeholderTextColor={C.muted}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── CONTENU ── */}
      {dbError && (
        <View style={{ margin: 16, backgroundColor: "rgba(255,59,48,0.08)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,59,48,0.25)" }}>
          <Text style={{ color: "#FF3B30", fontWeight: "800", fontSize: 13 }}>{dbError}</Text>
          <Text style={{ color: "#FF3B30", fontSize: 11, marginTop: 4, fontWeight: "600" }}>Vérifiez la console pour plus de détails.</Text>
        </View>
      )}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={{ color: C.muted, fontWeight: "700", fontSize: 14 }}>
            Chargement des agents…
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={a => a.auth_uid}
          renderItem={({ item, index }) => (
            <AgentCard
              agent={item}
              myUid={myUid}
              index={index}
              onContact={() => {
                if (item.auth_uid === myUid) {
                  // ✅ L'agent voit ses propres messages → boîte de réception
                  router.push("/rz-channel/vendor-inbox" as any);
                } else {
                  // Autre utilisateur → chat avec cet agent
                  router.push({
                    pathname: "/rz-channel/vendor-chat",
                    params: {
                      vendorId:   item.auth_uid,
                      vendorName: item.full_name ?? item.eds_name ?? "Agent RHAZN",
                      isAgent:    "true",
                    },
                  } as any);
                }
              }}
              onRecharge={() => router.push("/user-agent-access" as any)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.teal}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: FOOTER_H + 24,
          }}
          ListHeaderComponent={
            search.trim().length > 0 ? (
              <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>
                  {sorted.length} résultat{sorted.length > 1 ? "s" : ""} pour "{search}"
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16, paddingHorizontal: 40 }}>
              <View style={s.emptyIcon}>
                <Ionicons name="people-outline" size={36} color={C.teal} />
              </View>
              <Text style={s.emptyTitle}>
                {search ? "Aucun résultat" : "Aucun agent"}
              </Text>
              <Text style={s.emptySub}>
                {search
                  ? `Aucun agent ne correspond à "${search}"`
                  : "Les agents RHAZN apparaîtront ici."
                }
              </Text>
              {search ? (
                <TouchableOpacity style={s.clearSearch} onPress={() => setSearch("")}>
                  <Text style={s.clearSearchTxt}>Effacer la recherche</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: "#F2F2F7" },

  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E5EA" },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon:  { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(50,173,230,0.10)", borderWidth: 1, borderColor: "rgba(50,173,230,0.25)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#0A0A0A", fontWeight: "900", fontSize: 17, letterSpacing: -0.3 },
  headerSub:   { color: "#8E8E93", fontSize: 11, fontWeight: "600", marginTop: 1 },
  refreshBtn:  { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(50,173,230,0.10)", borderWidth: 1, borderColor: "rgba(50,173,230,0.25)", alignItems: "center", justifyContent: "center" },

  searchWrap:  { flexDirection: "row", alignItems: "center", gap: 10, margin: 14, backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: "#E5E5EA", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  searchInput: { flex: 1, color: "#0A0A0A", fontSize: 14, fontWeight: "500" },

  emptyIcon:   { width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(50,173,230,0.10)", borderWidth: 1, borderColor: "rgba(50,173,230,0.25)", alignItems: "center", justifyContent: "center" },
  emptyTitle:  { color: "#0A0A0A", fontWeight: "900", fontSize: 18, textAlign: "center" },
  emptySub:    { color: "#8E8E93", fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20 },
  clearSearch: { backgroundColor: "rgba(50,173,230,0.12)", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(50,173,230,0.28)" },
  clearSearchTxt:{ color: "#32ADE6", fontWeight: "800", fontSize: 13 },
});