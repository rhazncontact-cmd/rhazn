// app/rz-admin/cadna-rejection-rules.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import AdminGuard from "../components/AdminGuard";

/* ─────────────────────────────────────────────
🛡️ CADNA — Code moral (Apple-like)
RHAZN : organe souverain de validation morale
───────────────────────────────────────────── */

const COLORS = {
  bg: "#000000",
  card: "#0B0B0B",
  card2: "#0E0E0E",
  border: "rgba(255,255,255,0.12)",
  hairline: "rgba(255,255,255,0.08)",

  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.72)",
  faint: "rgba(255,255,255,0.55)",

  gold: "#D4AF37",
  blue: "#007AFF",
  red: "#FF453A",
  green: "#34C759",
};

type RuleRow = {
  id: string;
  created_at: string;
  content_type: string;
  code: string;
  label: string;
  description: string | null;
  correction_suggestion: string;
  active: boolean;
};

const CONTENT_TYPES = [
  "profile_photo",
  "suspentz",
  "store",
  "video",
  "audio",
  "text",
  "book",
  "art",
  "contest",
  "other",
];

// UI label humanisée (sans casser les values DB)
const TYPE_LABEL: Record<string, string> = {
  profile_photo: "Photo profil",
  suspentz: "Suspentz",
  store: "Store",
  video: "Vidéo",
  audio: "Audio",
  text: "Texte",
  book: "Livre",
  art: "Art",
  contest: "Concours",
  other: "Autre",
};

export default function CadnaRejectionRulesAdmin() {
  return (
    <AdminGuard>
      <Screen />
    </AdminGuard>
  );
}

function Screen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [filterType, setFilterType] = useState<string>("profile_photo");
  const [query, setQuery] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RuleRow | null>(null);

  // form
  const [contentType, setContentType] = useState("profile_photo");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [correction, setCorrection] = useState("");
  const [active, setActive] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules
      .filter((r) => (filterType ? r.content_type === filterType : true))
      .filter((r) => {
        if (!q) return true;
        return (
          r.code.toLowerCase().includes(q) ||
          r.label.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          (r.correction_suggestion || "").toLowerCase().includes(q)
        );
      });
  }, [rules, filterType, query]);

  const countsByType = useMemo(() => {
    const map: Record<string, { all: number; on: number }> = {};
    for (const t of CONTENT_TYPES) map[t] = { all: 0, on: 0 };
    for (const r of rules) {
      if (!map[r.content_type]) map[r.content_type] = { all: 0, on: 0 };
      map[r.content_type].all += 1;
      if (r.active) map[r.content_type].on += 1;
    }
    return map;
  }, [rules]);

  const resetForm = () => {
    setEditing(null);
    setContentType(filterType || "profile_photo");
    setCode("");
    setLabel("");
    setDescription("");
    setCorrection("");
    setActive(true);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (r: RuleRow) => {
    setEditing(r);
    setContentType(r.content_type);
    setCode(r.code);
    setLabel(r.label);
    setDescription(r.description || "");
    setCorrection(r.correction_suggestion || "");
    setActive(!!r.active);
    setOpen(true);
  };

  const load = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cadna_rejection_rules")
        .select(
          "id,created_at,content_type,code,label,description,correction_suggestion,active"
        )
        .order("content_type", { ascending: true })
        .order("label", { ascending: true });

      if (error) throw error;
      setRules((data || []) as RuleRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement du code moral CADNA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveRule = async () => {
    if (!contentType.trim())
      return Alert.alert("Erreur", "content_type requis");
    if (!code.trim())
      return Alert.alert("Erreur", "code requis (ex: NUDITY)");
    if (!label.trim())
      return Alert.alert("Erreur", "label requis (ex: Atteinte à la décence)");
    if (!correction.trim())
      return Alert.alert("Erreur", "Proposition de correction requise");

    setBusy(true);
    try {
      const payload: any = {
        content_type: contentType.trim(),
        code: code.trim().toUpperCase(),
        label: label.trim(),
        description: description.trim() || null,
        correction_suggestion: correction.trim(),
        active: !!active,
      };

      const q = supabase.from("cadna_rejection_rules");
      const res = editing
        ? await q.update(payload).eq("id", editing.id)
        : await q.insert(payload);

      if (res.error) throw res.error;

      setOpen(false);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d’enregistrer.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (r: RuleRow) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("cadna_rejection_rules")
        .update({ active: !r.active })
        .eq("id", r.id);

      if (error) throw error;
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de modifier l’état.");
    } finally {
      setBusy(false);
    }
  };

  const removeRule = async (r: RuleRow) => {
    Alert.alert(
      "Supprimer une règle du code moral ?",
      `${r.label} (${r.code})`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const { error } = await supabase
                .from("cadna_rejection_rules")
                .delete()
                .eq("id", r.id);

              if (error) throw error;
              await load();
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Suppression impossible.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const activeTypeLabel = TYPE_LABEL[filterType] ?? filterType;

  return (
    <View style={styles.container}>
      {/* ───────── HEADER Souverain ───────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.9 }]}
        >
          <Feather name="chevron-left" size={22} color={COLORS.gold} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTop}>CADNA</Text>
          <Text style={styles.headerTitle}>Code moral • Règles de conformité</Text>
        </View>

        <Pressable
          onPress={openCreate}
          disabled={busy}
          style={({ pressed }) => [
            styles.headerBtn,
            pressed && { transform: [{ scale: 0.98 }] },
            busy && { opacity: 0.55 },
          ]}
        >
          <Feather name="plus" size={18} color={COLORS.gold} />
        </Pressable>
      </View>

      {/* Badge institutionnel */}
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <View style={styles.badgeShield}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gold} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Autorité morale centrale</Text>
            <Text style={styles.bannerText}>
              Tout ce qui est publié dans RHAZN passe par CADNA. Ce code définit les conditions
              d’acceptation, de correction, ou de rejet.
            </Text>
          </View>
        </View>

        <View style={styles.bannerMetaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>Type actif</Text>
            <Text style={styles.metaPillStrong}>{activeTypeLabel}</Text>
          </View>

          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>Règles</Text>
            <Text style={styles.metaPillStrong}>
              {countsByType[filterType]?.on ?? 0}/{countsByType[filterType]?.all ?? 0} ON
            </Text>
          </View>
        </View>
      </View>

      {/* ───────── FILTER + SEARCH ───────── */}
      <View style={styles.filterCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CONTENT_TYPES.map((t) => {
            const isActiveTab = t === filterType;
            const total = countsByType[t]?.all ?? 0;
            const on = countsByType[t]?.on ?? 0;

            return (
              <Pressable
                key={t}
                onPress={() => {
                  setFilterType(t);
                  setContentType(t);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  isActiveTab && styles.chipActive,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={[styles.chipText, isActiveTab && styles.chipTextActive]}>
                  {TYPE_LABEL[t] ?? t}
                </Text>
                <View style={[styles.chipCount, isActiveTab && { borderColor: "rgba(212,175,55,0.35)" }]}>
                  <Text style={[styles.chipCountText, isActiveTab && { color: COLORS.gold }]}>
                    {on}/{total}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={COLORS.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher (code, label, correction)…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.search}
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")} style={styles.clearBtn}>
              <Ionicons name="close" size={16} color={COLORS.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      {/* ───────── LIST ───────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} />
          <Text style={styles.muted}>Chargement du code moral…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 80 }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Aucune règle pour ce type</Text>
              <Text style={styles.emptyText}>
                Ajoutez une règle pour définir explicitement ce que CADNA juge acceptable, corrigeable ou refusé.
              </Text>

              <Pressable
                onPress={openCreate}
                style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.99 }] }]}
              >
                <Text style={styles.primaryBtnText}>Créer une règle</Text>
                <Feather name="plus" size={16} color="#000" />
              </Pressable>
            </View>
          ) : (
            filtered.map((r) => (
              <View key={r.id} style={styles.ruleCard}>
                <View style={styles.ruleTopRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.ruleTitle}>
                      {r.label}{" "}
                      <Text style={styles.ruleCode}>
                        ({r.code})
                      </Text>
                    </Text>

                    {!!r.description && (
                      <Text style={styles.ruleDesc}>{r.description}</Text>
                    )}

                    <View style={styles.fixBox}>
                      <Text style={styles.fixLabel}>Correction exigée</Text>
                      <Text style={styles.fixText}>{r.correction_suggestion}</Text>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaTag}>
                        <Ionicons name="layers-outline" size={14} color={COLORS.muted} />
                        <Text style={styles.metaTagText}>
                          {TYPE_LABEL[r.content_type] ?? r.content_type}
                        </Text>
                      </View>

                      <View style={[styles.metaTag, r.active ? styles.metaOn : styles.metaOff]}>
                        <Ionicons
                          name={r.active ? "checkmark-circle-outline" : "close-circle-outline"}
                          size={14}
                          color={r.active ? COLORS.green : COLORS.red}
                        />
                        <Text style={styles.metaTagText}>
                          {r.active ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ gap: 10, alignItems: "flex-end" as any }}>
                    <Pressable
                      onPress={() => toggleActive(r)}
                      disabled={busy}
                      style={({ pressed }) => [
                        styles.stateBtn,
                        r.active ? styles.stateOn : styles.stateOff,
                        pressed && { transform: [{ scale: 0.98 }] },
                        busy && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={styles.stateText}>{r.active ? "ON" : "OFF"}</Text>
                    </Pressable>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Pressable
                        onPress={() => openEdit(r)}
                        disabled={busy}
                        style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
                      >
                        <Feather name="edit-2" size={17} color={COLORS.gold} />
                      </Pressable>

                      <Pressable
                        onPress={() => removeRule(r)}
                        disabled={busy}
                        style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
                      >
                        <Feather name="trash-2" size={17} color={COLORS.red} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ───────── MODAL CREATE/EDIT ───────── */}
      <Modal visible={open} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.badgeShieldMini}>
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editing ? "Modifier une règle" : "Nouvelle règle"}
                </Text>
                <Text style={styles.modalSub}>
                  CADNA écrit ici la norme morale explicite pour RHAZN.
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  resetForm();
                }}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="close" size={18} color={COLORS.muted} />
              </Pressable>
            </View>

            <Text style={styles.formLabel}>Content type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {CONTENT_TYPES.map((t) => {
                const is = t === contentType;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setContentType(t)}
                    style={({ pressed }) => [
                      styles.chip,
                      is && styles.chipActive,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Text style={[styles.chipText, is && styles.chipTextActive]}>
                      {TYPE_LABEL[t] ?? t}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.formLabel}>Code (ex: NUDITY)</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              style={styles.input}
              placeholder="NUDITY"
              placeholderTextColor="rgba(255,255,255,0.35)"
            />

            <Text style={styles.formLabel}>Label (ex: Atteinte à la décence)</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              style={styles.input}
              placeholder="Atteinte à la décence"
              placeholderTextColor="rgba(255,255,255,0.35)"
            />

            <Text style={styles.formLabel}>Description (optionnelle)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              placeholder="Explication courte…"
              placeholderTextColor="rgba(255,255,255,0.35)"
            />

            <Text style={styles.formLabel}>Correction exigée (obligatoire)</Text>
            <TextInput
              value={correction}
              onChangeText={setCorrection}
              style={[styles.input, { minHeight: 90 }]}
              placeholder="Ex: Retirer les éléments interdits, rendre le contenu sobre…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
            />

            <View style={styles.activeRow}>
              <Pressable
                onPress={() => setActive((v) => !v)}
                style={({ pressed }) => [
                  styles.activeToggle,
                  active ? styles.activeTrue : styles.activeFalse,
                  pressed && { transform: [{ scale: 0.99 }] },
                ]}
              >
                <Ionicons
                  name={active ? "checkmark-circle-outline" : "close-circle-outline"}
                  size={16}
                  color={active ? COLORS.green : COLORS.red}
                />
                <Text style={styles.activeToggleText}>
                  {active ? "Règle active" : "Règle inactive"}
                </Text>
              </Pressable>

              <View style={styles.tagMini}>
                <Text style={styles.tagMiniText}>{editing ? "UPDATE" : "INSERT"}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  resetForm();
                }}
                disabled={busy}
                style={({ pressed }) => [
                  styles.modalBtnGhost,
                  pressed && { opacity: 0.9 },
                  busy && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.modalBtnGhostText}>Annuler</Text>
              </Pressable>

              <Pressable
                onPress={saveRule}
                disabled={busy}
                style={({ pressed }) => [
                  styles.modalBtn,
                  pressed && { transform: [{ scale: 0.99 }] },
                  busy && { opacity: 0.7 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.modalBtnText}>Enregistrer</Text>
                    <Ionicons name="chevron-forward" size={18} color="#000" />
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─────────────────────────────────────────────
STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTop: { color: COLORS.gold, fontSize: 12, fontWeight: "900", letterSpacing: 1.2 },
  headerTitle: { color: COLORS.text, fontSize: 16.5, fontWeight: "900", marginTop: 2 },

  banner: {
    marginHorizontal: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 18,
    padding: 14,
  },
  bannerRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  badgeShield: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { color: COLORS.text, fontWeight: "900", fontSize: 14 },
  bannerText: { color: COLORS.muted, fontSize: 12.5, lineHeight: 18, marginTop: 6 },

  bannerMetaRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  metaPill: {
    flex: 1,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 14,
    padding: 12,
  },
  metaPillText: { color: COLORS.faint, fontSize: 11, fontWeight: "800" },
  metaPillStrong: { color: COLORS.text, fontSize: 13, fontWeight: "900", marginTop: 4 },

  filterCard: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: 12,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: COLORS.hairline,
    marginRight: 8,
  },
  chipActive: { borderColor: "rgba(212,175,55,0.6)", backgroundColor: "#141414" },
  chipText: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: COLORS.gold },

  chipCount: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipCountText: { color: COLORS.muted, fontWeight: "900", fontSize: 11 },

  searchWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#000",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  search: { color: COLORS.text, flex: 1, fontSize: 13, fontWeight: "700" },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },

  error: {
    color: COLORS.red,
    textAlign: "center",
    paddingHorizontal: 18,
    marginTop: 10,
    fontWeight: "800",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  muted: { color: COLORS.muted, fontWeight: "700" },

  ruleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: 14,
    marginBottom: 12,
  },
  ruleTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  ruleTitle: { color: COLORS.text, fontWeight: "900", fontSize: 14.5, lineHeight: 20 },
  ruleCode: { color: COLORS.gold, fontWeight: "900" },
  ruleDesc: { color: "rgba(255,255,255,0.72)", fontSize: 12.5, marginTop: 8, lineHeight: 18 },

  fixBox: {
    marginTop: 10,
    backgroundColor: "#090909",
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 14,
    padding: 12,
  },
  fixLabel: { color: COLORS.faint, fontWeight: "900", fontSize: 11, letterSpacing: 0.3 },
  fixText: { color: COLORS.green, fontWeight: "900", fontSize: 12.5, lineHeight: 18, marginTop: 6 },

  metaRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  metaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  metaTagText: { color: COLORS.muted, fontWeight: "900", fontSize: 11 },
  metaOn: { borderColor: "rgba(52,199,89,0.25)" },
  metaOff: { borderColor: "rgba(255,69,58,0.25)" },

  stateBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 64,
    alignItems: "center",
  },
  stateOn: { backgroundColor: "rgba(52,199,89,0.12)", borderColor: "rgba(52,199,89,0.35)" },
  stateOff: { backgroundColor: "rgba(255,69,58,0.10)", borderColor: "rgba(255,69,58,0.32)" },
  stateText: { color: COLORS.text, fontWeight: "900", fontSize: 12 },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: COLORS.hairline,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: 16,
    gap: 10,
  },
  emptyTitle: { color: COLORS.text, fontWeight: "900", fontSize: 14, marginTop: 4 },
  emptyText: { color: COLORS.muted, lineHeight: 18, fontSize: 12.5 },

  primaryBtn: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#000", fontWeight: "900", fontSize: 14 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 18 },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: 16,
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 6 },
  badgeShieldMini: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { color: COLORS.text, fontWeight: "900", fontSize: 15.5 },
  modalSub: { color: COLORS.muted, fontSize: 12.5, marginTop: 6, lineHeight: 18 },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  formLabel: { color: COLORS.faint, fontSize: 12, fontWeight: "900", marginTop: 12, marginBottom: 6 },

  input: {
    backgroundColor: "#000",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: 12,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  activeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10 },
  activeToggle: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  activeTrue: { borderColor: "rgba(52,199,89,0.35)", backgroundColor: "rgba(52,199,89,0.10)" },
  activeFalse: { borderColor: "rgba(255,69,58,0.32)", backgroundColor: "rgba(255,69,58,0.08)" },
  activeToggleText: { color: COLORS.text, fontWeight: "900", fontSize: 12.5 },

  tagMini: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  tagMiniText: { color: COLORS.muted, fontWeight: "900", fontSize: 11 },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtnGhost: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnGhostText: { color: COLORS.muted, fontWeight: "900" },

  modalBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  modalBtnText: { color: "#000", fontWeight: "900", fontSize: 14 },
});
