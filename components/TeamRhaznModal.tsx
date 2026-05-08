// components/TeamRhaznModal.tsx
// ✅ Multi-sélection jusqu'à 50 membres parmi les utilisateurs existants
// ✅ Fiche haute gamme Apple-like premium dark
// ✅ Gestion des erreurs visible + retrait membre

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

// ─── Constantes ───────────────────────────────────────────
const MAX_SELECT  = 50;
const GOLD        = "#D4AF37";
const GOLD_DIM    = "rgba(212,175,55,0.12)";
const GOLD_BD     = "rgba(212,175,55,0.30)";
const RED         = "#FF3B30";
const GREEN       = "#34C759";
const BLUE        = "#007AFF";
const PURPLE      = "#AF52DE";

const ACCENT_COLORS = [GOLD, BLUE, PURPLE, GREEN];

// ─── Types ────────────────────────────────────────────────
type AppUser = {
  id:         string;
  full_name:  string | null;
  avatar_url: string | null;
  email?:     string | null;
};

export type TeamMember = {
  id:         string;
  user_id:    string | null;
  full_name:  string;
  avatar_url: string | null;
  title:      string;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────
function getInitials(name: string): string {
  const p = name.trim().split(" ").filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1
    ? (p[0][0] || "?").toUpperCase()
    : ((p[0][0] || "") + (p[p.length - 1][0] || "")).toUpperCase();
}

function displayName(u: AppUser): string {
  return u.full_name?.trim() || u.email?.split("@")[0] || "Membre RHAZN";
}

// ═════════════════════════════════════════════════════════════
// MEMBER CARD — Apple-like premium dark
// ═════════════════════════════════════════════════════════════
export function MemberCard({ member, index, isSupreme, onDelete }: {
  member: TeamMember; index: number;
  isSupreme: boolean; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];

  return (
    <View style={mc.card}>
      <View style={[mc.topStripe, { backgroundColor: accent }]} />
      <View style={mc.body}>

        {/* Avatar */}
        <View style={[mc.avatarWrap, { borderColor: accent + "60" }]}>
          {member.avatar_url ? (
            <Image source={{ uri: member.avatar_url }} style={mc.avatarImg} />
          ) : (
            <View style={[mc.avatarFallback, { backgroundColor: accent + "18" }]}>
              <Text style={[mc.avatarInitials, { color: accent }]}>
                {getInitials(member.full_name)}
              </Text>
            </View>
          )}
          <View style={[mc.rhaznBadge, { backgroundColor: accent }]}>
            <Ionicons name="checkmark" size={8} color="#fff" />
          </View>
        </View>

        {/* Infos */}
        <View style={mc.info}>
          <Text style={mc.name} numberOfLines={2}>{member.full_name}</Text>
          <View style={[mc.titlePill, { backgroundColor: accent + "15", borderColor: accent + "35" }]}>
            <View style={[mc.titleDot, { backgroundColor: accent }]} />
            <Text style={[mc.titleTxt, { color: accent }]}>{member.title}</Text>
          </View>
          <View style={mc.teamTag}>
            <Ionicons name="people" size={9} color="rgba(255,255,255,0.30)" />
            <Text style={mc.teamTagTxt}>TEAM RHAZN</Text>
          </View>
        </View>

        {/* Retirer — Supreme seulement */}
        {isSupreme && (
          <View style={mc.actions}>
            {!confirmDelete ? (
              <TouchableOpacity style={mc.deleteBtn} onPress={() => setConfirmDelete(true)} activeOpacity={0.8}>
                <Ionicons name="person-remove-outline" size={14} color={RED} />
              </TouchableOpacity>
            ) : (
              <View style={mc.confirmWrap}>
                <TouchableOpacity style={mc.confirmYes}
                  onPress={() => { onDelete(); setConfirmDelete(false); }} activeOpacity={0.85}>
                  <Text style={mc.confirmYesTxt}>Retirer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirmDelete(false)} activeOpacity={0.75}>
                  <Text style={mc.confirmNo}>Non</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={mc.footer}>
        <Text style={mc.footerNum}>#{String(index + 1).padStart(2, "0")}</Text>
        <View style={mc.footerLine} />
        <Text style={mc.footerLabel}>Membre officiel</Text>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════
// MODAL SÉLECTION MULTI — jusqu'à 50 membres
// ═════════════════════════════════════════════════════════════
function SelectMemberModal({ visible, alreadyAdded, onConfirm, onClose }: {
  visible:      boolean;
  alreadyAdded: string[];
  onConfirm:    (users: AppUser[], title: string) => Promise<string | null>;
  onClose:      () => void;
}) {
  const [users,    setUsers]    = useState<AppUser[]>([]);
  const [filtered, setFiltered] = useState<AppUser[]>([]);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [title,    setTitle]    = useState("Membre");

  // ✅ Multi-sélection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set());
      setSearch("");
      setTitle("Membre");
      setError("");
      return;
    }
    loadUsers();
  }, [visible]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) { setFiltered(users); return; }
    setFiltered(users.filter(u =>
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    ));
  }, [search, users]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email")
      .order("full_name", { ascending: true })
      .limit(500);
    if (!err && data) {
      const available = (data as AppUser[]).filter(u => !alreadyAdded.includes(u.id));
      setUsers(available);
      setFiltered(available);
    }
    setLoading(false);
  };

  const toggleUser = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else if (n.size < MAX_SELECT) {
        n.add(id);
        Haptics.selectionAsync().catch(() => {});
      } else {
        setError(`Maximum ${MAX_SELECT} membres sélectionnables.`);
      }
      return n;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0 || saving) return;
    setSaving(true);
    setError("");
    const selectedUsers = users.filter(u => selectedIds.has(u.id));
    const err = await onConfirm(selectedUsers, title);
    setSaving(false);
    if (err) {
      setError(err);
    }
    // onConfirm ferme le modal si succès
  };

  const selCount = selectedIds.size;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={!saving ? onClose : undefined}>
      <Pressable style={sel.backdrop} onPress={!saving ? onClose : undefined} />
      <View style={sel.sheet}>
        <View style={sel.handle} />

        {/* Header */}
        <View style={sel.header}>
          <View style={sel.headerIcon}>
            <Ionicons name="people-circle" size={22} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sel.headerTitle}>Nommer des membres</Text>
            <Text style={sel.headerSub}>
              {selCount > 0
                ? `${selCount} sélectionné${selCount > 1 ? "s" : ""} · max ${MAX_SELECT}`
                : `Sélectionnez jusqu'à ${MAX_SELECT} membres`}
            </Text>
          </View>
          <View style={sel.supremeBadge}>
            <Ionicons name="shield-checkmark" size={10} color="#000" />
            <Text style={sel.supremeBadgeTxt}>SUPREME</Text>
          </View>
        </View>

        {/* Barre de recherche */}
        <View style={sel.searchWrap}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.30)" />
          <TextInput
            style={sel.searchInput}
            placeholder="Rechercher un membre…"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.30)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Erreur */}
        {!!error && (
          <View style={sel.errorBox}>
            <Ionicons name="warning-outline" size={14} color={RED} />
            <Text style={sel.errorTxt}>{error}</Text>
            <TouchableOpacity onPress={() => setError("")}>
              <Ionicons name="close" size={14} color={RED} />
            </TouchableOpacity>
          </View>
        )}

        {/* Liste */}
        {loading ? (
          <View style={sel.loadingWrap}>
            <ActivityIndicator color={GOLD} />
            <Text style={sel.loadingTxt}>Chargement des membres…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={sel.emptyWrap}>
            <Ionicons name="people-outline" size={32} color="rgba(255,255,255,0.20)" />
            <Text style={sel.emptyTxt}>
              {search ? "Aucun résultat" : "Tous les membres sont déjà dans la team"}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={sel.list}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.map(user => {
              const isSelected = selectedIds.has(user.id);
              const name = displayName(user);
              return (
                <TouchableOpacity
                  key={user.id}
                  style={[sel.userRow, isSelected && sel.userRowSelected]}
                  onPress={() => toggleUser(user.id)}
                  activeOpacity={0.82}
                >
                  {/* Checkbox */}
                  <View style={[sel.checkbox, isSelected && sel.checkboxOn]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color="#000" />}
                  </View>

                  {/* Avatar */}
                  <View style={sel.userAvatar}>
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={sel.userAvatarImg} />
                    ) : (
                      <View style={sel.userAvatarFallback}>
                        <Text style={sel.userAvatarInitials}>{getInitials(name)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Infos */}
                  <View style={{ flex: 1 }}>
                    <Text style={sel.userName} numberOfLines={1}>{name}</Text>
                    {user.email && (
                      <Text style={sel.userEmail} numberOfLines={1}>{user.email}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Titre — visible seulement si ≥1 sélectionné */}
        {selCount > 0 && (
          <View style={sel.titleSection}>
            <Text style={sel.titleSectionLabel}>TITRE POUR TOUS LES MEMBRES SÉLECTIONNÉS</Text>
            <View style={sel.titleOptions}>
              {["Membre", "Ambassadeur", "Partenaire", "Conseiller"].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[sel.titleOption, title === t && sel.titleOptionOn]}
                  onPress={() => setTitle(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[sel.titleOptionTxt, title === t && sel.titleOptionTxtOn]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bouton confirmer */}
        <TouchableOpacity
          style={[sel.confirmBtn, (selCount === 0 || saving) && { opacity: 0.4 }]}
          onPress={handleConfirm}
          disabled={selCount === 0 || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="person-add" size={17} color="#000" />
              <Text style={sel.confirmBtnTxt}>
                {selCount === 0
                  ? "Sélectionner des membres"
                  : `Nommer ${selCount} membre${selCount > 1 ? "s" : ""}`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={sel.cancelBtn}
          onPress={onClose}
          disabled={saving}
          activeOpacity={0.75}
        >
          <Text style={sel.cancelBtnTxt}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════
// MODAL TEAM RHAZN — composant principal
// ═════════════════════════════════════════════════════════════
export default function TeamRhaznModal({ visible, isSupreme, onClose }: {
  visible:   boolean;
  isSupreme: boolean;
  onClose:   () => void;
}) {
  const [members,    setMembers]    = useState<TeamMember[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const [saveError,  setSaveError]  = useState("");

  useEffect(() => {
    if (visible) fetchMembers();
  }, [visible]);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("team_rhazn")
      .select("id, user_id, full_name, avatar_url, title, created_at")
      .order("created_at", { ascending: true });
    if (!error && data) setMembers(data as TeamMember[]);
    setLoading(false);
  };

  // ── Insérer plusieurs membres en une seule opération ───
  const handleConfirm = async (users: AppUser[], title: string): Promise<string | null> => {
    try {
      if (!users || users.length === 0) return "Aucun membre sélectionné.";

      const { data: authData } = await supabase.auth.getUser();
      const addedBy = authData?.user?.id ?? null;

      const rows = users.map(u => ({
        user_id:    u.id,
        full_name:  (u.full_name?.trim() || u.email?.split("@")[0] || "Membre RHAZN"),
        avatar_url: u.avatar_url ?? null,
        title,
        added_by:   addedBy,
      }));

      const { error } = await supabase.from("team_rhazn").insert(rows);

      if (error) {
        console.error("team_rhazn insert error:", JSON.stringify(error));
        return `Erreur : ${error.message}`;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowSelect(false);
      setSaveError("");
      await fetchMembers();
      return null;

    } catch (e: any) {
      console.error("handleConfirm crash:", e);
      return e?.message ?? "Erreur inattendue.";
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("team_rhazn").delete().eq("id", id);
    if (!error) {
      setMembers(prev => prev.filter(m => m.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  };

  const alreadyAdded = members.map(m => m.user_id).filter(Boolean) as string[];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={tm.backdrop} onPress={onClose} />
        <View style={tm.sheet}>
          <View style={tm.handle} />

          {/* Header */}
          <View style={tm.header}>
            <View style={tm.headerLeft}>
              <View style={tm.headerIcon}>
                <Ionicons name="people" size={22} color={GOLD} />
              </View>
              <View>
                <Text style={tm.headerTitle}>TEAM RHAZN</Text>
                <Text style={tm.headerSub}>
                  {loading ? "Chargement…" : `${members.length} membre${members.length > 1 ? "s" : ""}`}
                </Text>
              </View>
            </View>

            {/* ✅ Bouton nommer — Supreme seulement */}
            {isSupreme && (
              <TouchableOpacity
                style={tm.addBtn}
                onPress={() => { setSaveError(""); setShowSelect(true); }}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#000" />
                <Text style={tm.addBtnTxt}>Nommer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Erreur save */}
          {!!saveError && (
            <View style={tm.errorBox}>
              <Ionicons name="warning-outline" size={14} color={RED} />
              <Text style={tm.errorTxt}>{saveError}</Text>
            </View>
          )}

          {/* Liste membres */}
          {loading ? (
            <View style={tm.loadingWrap}>
              <ActivityIndicator color={GOLD} />
              <Text style={tm.loadingTxt}>Chargement…</Text>
            </View>
          ) : members.length === 0 ? (
            <View style={tm.emptyWrap}>
              <View style={tm.emptyIcon}>
                <Ionicons name="people-outline" size={32} color={GOLD} />
              </View>
              <Text style={tm.emptyTitle}>Aucun membre pour l'instant</Text>
              {isSupreme && (
                <Text style={tm.emptySub}>Appuyez sur "Nommer" pour désigner le premier membre.</Text>
              )}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tm.membersList}>
              {members.map((member, idx) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  index={idx}
                  isSupreme={isSupreme}
                  onDelete={() => handleDelete(member.id)}
                />
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={tm.closeBtn} onPress={onClose}>
            <Text style={tm.closeTxt}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal sélection multi */}
      <SelectMemberModal
        visible={showSelect}
        alreadyAdded={alreadyAdded}
        onConfirm={handleConfirm}
        onClose={() => setShowSelect(false)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const mc = StyleSheet.create({
  card:           { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  topStripe:      { height: 4, width: "100%" },
  body:           { flexDirection: "row", alignItems: "center", gap: 16, padding: 18 },
  avatarWrap:     { position: "relative", width: 70, height: 70, borderRadius: 35, borderWidth: 2.5, overflow: "visible", flexShrink: 0 },
  avatarImg:      { width: 70, height: 70, borderRadius: 35 },
  avatarFallback: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 24, fontWeight: "900" },
  rhaznBadge:     { position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  info:           { flex: 1, gap: 6 },
  name:           {  color: "#111111", fontSize: 15, fontWeight: "900", letterSpacing: -0.3, lineHeight: 20 },
  titlePill:      { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, alignSelf: "flex-start" },
  titleDot:       { width: 5, height: 5, borderRadius: 3 },
  titleTxt:       { fontSize: 11, fontWeight: "900", letterSpacing: 0.3 },
  teamTag:        { flexDirection: "row", alignItems: "center", gap: 5 },
  teamTagTxt:     { color: "rgba(0,0,0,0.35)", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  actions:        { alignItems: "center", gap: 6 },
  deleteBtn:      { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,59,48,0.10)", borderWidth: 1, borderColor: "rgba(255,59,48,0.25)", alignItems: "center", justifyContent: "center" },
  confirmWrap:    { alignItems: "center", gap: 4 },
  confirmYes:     { backgroundColor: RED, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  confirmYesTxt:  { color: "#fff", fontWeight: "900", fontSize: 10 },
  confirmNo:      { color: "rgba(255,255,255,0.40)", fontWeight: "700", fontSize: 10 },
  footer:         { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingBottom: 14 },
  footerNum:      { color: "rgba(212,175,55,0.70)", fontSize: 10, fontWeight: "900", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  footerLine:     { flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.08)" },
  footerLabel:    { color: "rgba(0,0,0,0.30)", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
});

const sel = StyleSheet.create({
  backdrop:          { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet:             { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111111", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 36 : 24, maxHeight: "92%", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)" },
  handle:            { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginBottom: 18 },
  header:            { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  headerIcon:        { width: 44, height: 44, borderRadius: 13, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  headerTitle:       { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  headerSub:         { color: "rgba(255,255,255,0.40)", fontSize: 11, fontWeight: "700", marginTop: 2 },
  supremeBadge:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  supremeBadgeTxt:   { color: "#000", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  searchWrap:        { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1C1C1C", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  searchInput:       { flex: 1, color: "#FFFFFF", fontSize: 14, fontWeight: "600", padding: 0 },
  errorBox:          { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,59,48,0.10)", borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,59,48,0.25)" },
  errorTxt:          { flex: 1, color: RED, fontWeight: "700", fontSize: 12 },
  loadingWrap:       { paddingVertical: 32, alignItems: "center", gap: 10 },
  loadingTxt:        { color: "rgba(255,255,255,0.40)", fontSize: 12, fontWeight: "600" },
  emptyWrap:         { paddingVertical: 32, alignItems: "center", gap: 8 },
  emptyTxt:          { color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: "600", textAlign: "center" },
  list:              { gap: 4, paddingBottom: 8 },
  userRow:           { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, backgroundColor: "#1A1A1A", marginBottom: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  userRowSelected:   { backgroundColor: GOLD_DIM, borderColor: GOLD_BD, borderWidth: 1.5 },
  // ✅ Checkbox multi-sélection
  checkbox:          { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkboxOn:        { backgroundColor: GOLD, borderColor: GOLD },
  userAvatar:        { width: 44, height: 44, borderRadius: 22, overflow: "hidden", flexShrink: 0 },
  userAvatarImg:     { width: 44, height: 44, borderRadius: 22 },
  userAvatarFallback:{ width: 44, height: 44, borderRadius: 22, backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" },
  userAvatarInitials:{ color: GOLD, fontWeight: "900", fontSize: 15 },
  userName:          { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  userEmail:         { color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: "600", marginTop: 2 },
  titleSection:      { backgroundColor: "#1A1A1A", borderRadius: 14, padding: 12, marginTop: 8, marginBottom: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 8 },
  titleSectionLabel: { color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  titleOptions:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  titleOption:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#252525", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  titleOptionOn:     { backgroundColor: GOLD_DIM, borderColor: GOLD_BD },
  titleOptionTxt:    { color: "rgba(255,255,255,0.45)", fontWeight: "700", fontSize: 12 },
  titleOptionTxtOn:  { color: GOLD, fontWeight: "900" },
  confirmBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: GOLD, borderRadius: 16, paddingVertical: 15, marginTop: 10, shadowColor: GOLD, shadowOpacity: 0.30, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  confirmBtnTxt:     { color: "#000", fontWeight: "900", fontSize: 15 },
  cancelBtn:         { alignItems: "center", paddingVertical: 13, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", marginTop: 8 },
  cancelBtnTxt:      { color: "rgba(255,255,255,0.45)", fontWeight: "700", fontSize: 14 },
});

const tm = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:       { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111111", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 36 : 24, maxHeight: "88%", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)" },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginBottom: 18 },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon:  { width: 46, height: 46, borderRadius: 14, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  headerSub:   { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700", marginTop: 2 },
  addBtn:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GOLD, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, shadowColor: GOLD, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  addBtnTxt:   { color: "#000", fontWeight: "900", fontSize: 13 },
  errorBox:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,59,48,0.10)", borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,59,48,0.25)" },
  errorTxt:    { flex: 1, color: RED, fontWeight: "700", fontSize: 12 },
  loadingWrap: { paddingVertical: 40, alignItems: "center", gap: 8 },
  loadingTxt:  { color: "rgba(255,255,255,0.40)", fontSize: 12 },
  emptyWrap:   { paddingVertical: 44, alignItems: "center", gap: 10 },
  emptyIcon:   { width: 70, height: 70, borderRadius: 22, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  emptySub:    { color: "rgba(255,255,255,0.40)", fontSize: 12, fontWeight: "600", textAlign: "center", maxWidth: 240 },
  membersList: { gap: 12, paddingBottom: 16 },
  closeBtn:    { backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  closeTxt:    { color: "#000", fontWeight: "900", fontSize: 15 },
});