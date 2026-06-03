// components/ChallengeManager.tsx — VERSION OPTIMISÉE
// ✅ Catégories simples (pas "TOUS")
// ✅ Dates affichées
// ✅ Pas de sélecteur rank_mode
// ✅ Alertes Apple-like
// ✅ Haptic feedback

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#0A0A0A",
  sub: "#6E6E73",
  muted: "#AEAEB2",
  border: "#E5E5EA",
  gold: "#D4AF37",
  goldLight: "rgba(212,175,55,0.13)",
  goldBorder: "rgba(212,175,55,0.32)",
  blue: "#007AFF",
  green: "#34C759",
  red: "#FF3B30",
};

// ✅ CATÉGORIES (SANS "TOUS")
const CATEGORIES = [
  { label: "Suspentz", key: "SUSPENTZ", icon: "play-circle-outline", color: C.blue },
  { label: "Produits", key: "PRODUCTS", icon: "cube-outline", color: "#FF9500" },
  { label: "Audio", key: "AUDIO", icon: "musical-notes-outline", color: "#AF52DE" },
  { label: "Vidéo", key: "VIDEO", icon: "videocam-outline", color: C.red },
  { label: "KozeSans", key: "KOZESANS", icon: "mic-outline", color: "#32ADE6" },
  { label: "Texte", key: "TEXT", icon: "document-text-outline", color: C.green },
  { label: "Images", key: "IMAGES", icon: "images-outline", color: C.gold },
];

type Challenge = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "closed";
  category_filter: string;
  rank_mode: string;
  created_at: string;
};

interface ChallengeManagerProps {
  visible: boolean;
  onClose: () => void;
  onChallengeUpdated?: () => void;
}

export default function ChallengeManager({ visible, onClose, onChallengeUpdated }: ChallengeManagerProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState<"draft" | "active" | "closed">("draft");
  const [formCategory, setFormCategory] = useState("SUSPENTZ"); // ✅ SINGLE CATEGORY
  const [saving, setSaving] = useState(false);

  // ── Load challenges ──
  const loadChallenges = async () => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        showErrorAlert("Erreur d'authentification", authError.message);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("rz_get_challenges");
      if (rpcError) {
        showErrorAlert("Erreur RPC", rpcError.message);
        return;
      }

      setChallenges(data || []);
    } catch (e: any) {
      showErrorAlert("Erreur", e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadChallenges();
    }
  }, [visible]);

  // ── Haptic + Alert Helpers ──
  const hapticSuccess = async () => {
    try {
      if (Platform.OS === "ios") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Vibration.vibrate([0, 10, 5, 10]);
      }
    } catch (e) {}
  };

  const hapticWarning = async () => {
    try {
      if (Platform.OS === "ios") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Vibration.vibrate([0, 20, 10, 20]);
      }
    } catch (e) {}
  };

  const showErrorAlert = (title: string, message: string) => {
    hapticWarning();
    Alert.alert(title, message, [{ text: "OK", style: "default" }]);
  };

  const showSuccessAlert = (title: string, message: string, onOk?: () => void) => {
    hapticSuccess();
    Alert.alert(title, message, [
      { text: "OK", style: "default", onPress: onOk }
    ]);
  };

  // ── Format/Parse dates ──
  const formatDateForInput = (isoDate: string) => {
    const d = new Date(isoDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:${min}`;
  };

  const formatDateForDisplay = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseInputDate = (text: string): Date | null => {
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/);
    if (!match) return null;
    const [, y, m, d, h, min] = match;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min));
    return Number.isNaN(date.getTime()) ? null : date;
  };

  // ── Open form ──
  const openEditForm = (challenge: Challenge) => {
    setEditingId(challenge.id);
    setFormName(challenge.name);
    setFormStartDate(formatDateForInput(challenge.start_date));
    setFormEndDate(formatDateForInput(challenge.end_date));
    setFormStatus(challenge.status);
    setFormCategory(challenge.category_filter); // ✅ SINGLE CATEGORY
    setShowForm(true);
  };

  const openNewForm = () => {
    setEditingId(null);
    setFormName("");
    setFormStartDate("");
    setFormEndDate("");
    setFormStatus("draft");
    setFormCategory("SUSPENTZ");
    setShowForm(true);
  };

  // ── Save challenge ──
  const saveChallenge = async () => {
    if (!formName.trim() || !formStartDate || !formEndDate) {
      showErrorAlert("Champs manquants", "Veuillez remplir tous les champs obligatoires");
      return;
    }

    const startDate = parseInputDate(formStartDate);
    const endDate = parseInputDate(formEndDate);

    if (!startDate || !endDate) {
      showErrorAlert("Format invalide", "Utilisez le format: YYYY-MM-DD HH:MM");
      return;
    }

    if (startDate >= endDate) {
      showErrorAlert("Dates invalides", "La date de fin doit être après la date de début");
      return;
    }

    setSaving(true);
    Keyboard.dismiss();

    try {
      const { error: err } = await supabase.rpc("rz_manage_challenge", {
        p_challenge_id: editingId || null,
        p_name: formName,
        p_description: null,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_status: formStatus,
        p_category_filter: formCategory, // ✅ SINGLE CATEGORY
        p_rank_mode: "par_createur", // ✅ FIXED (pas besoin de sélecteur)
      });

      if (err) {
        showErrorAlert("Erreur", err.message);
        return;
      }

      showSuccessAlert(
        "✅ Succès",
        `Challenge ${editingId ? "modifié" : "créé"} avec succès`,
        async () => {
          await loadChallenges();
          setShowForm(false);
          onChallengeUpdated?.();
        }
      );
    } catch (e) {
      showErrorAlert("Erreur", "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (status: string) => {
    return status === "active" ? "🔴 EN COURS" : status === "closed" ? "✅ FERMÉ" : "⏳ BROUILLON";
  };

  const statusColor = (status: string) => {
    return status === "active" ? C.green : status === "closed" ? C.red : C.muted;
  };

  const getCategoryInfo = (key: string) => {
    return CATEGORIES.find(c => c.key === key) || CATEGORIES[0];
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Gérer les Challenges</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* LISTE OU FORMULAIRE */}
          {!showForm ? (
            // ── LISTE DES CHALLENGES ──
            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.centerContent}>
                  <ActivityIndicator color={C.gold} size="large" />
                  <Text style={{ color: C.muted, fontWeight: "600", marginTop: 12 }}>
                    Chargement…
                  </Text>
                </View>
              ) : challenges.length === 0 ? (
                <View style={styles.centerContent}>
                  <Ionicons name="calendar-outline" size={48} color={C.border} />
                  <Text style={{ color: C.muted, fontWeight: "600", marginTop: 12 }}>
                    Aucun challenge
                  </Text>
                </View>
              ) : (
                challenges.map((ch) => {
                  const catInfo = getCategoryInfo(ch.category_filter);
                  return (
                    <TouchableOpacity
                      key={ch.id}
                      style={styles.challengeCard}
                      onPress={() => openEditForm(ch)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, gap: 8 }}>
                        <Text style={styles.chName}>{ch.name}</Text>
                        
                        {/* Status + dates */}
                        <View style={{ gap: 6 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ color: statusColor(ch.status), fontWeight: "800", fontSize: 11 }}>
                              {statusLabel(ch.status)}
                            </Text>
                            <Text style={{ color: C.muted, fontSize: 11 }}>
                              {new Date(ch.start_date).toLocaleDateString("fr-FR")} →{" "}
                              {new Date(ch.end_date).toLocaleDateString("fr-FR")}
                            </Text>
                          </View>

                          {/* Catégorie seulement */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <Ionicons name={catInfo.icon as any} size={12} color={catInfo.color} />
                              <Text style={{ color: catInfo.color, fontWeight: "700", fontSize: 11 }}>
                                {catInfo.label}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.border} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          ) : (
            // ── FORMULAIRE ──
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <ScrollView
                style={styles.formScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Nom */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nom du challenge *</Text>
                  <TextInput
                    style={styles.input}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Challenge Janvier 2026"
                    placeholderTextColor={C.muted}
                  />
                </View>

                {/* Date début */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Date de début *</Text>
                  <Text style={styles.hint}>Format: YYYY-MM-DD HH:MM</Text>
                  <TextInput
                    style={styles.input}
                    value={formStartDate}
                    onChangeText={setFormStartDate}
                    placeholder="2026-01-01 00:00"
                    placeholderTextColor={C.muted}
                  />
                </View>

                {/* Date fin */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Date de fin *</Text>
                  <Text style={styles.hint}>Format: YYYY-MM-DD HH:MM</Text>
                  <TextInput
                    style={styles.input}
                    value={formEndDate}
                    onChangeText={setFormEndDate}
                    placeholder="2026-02-01 00:00"
                    placeholderTextColor={C.muted}
                  />
                </View>

                {/* Status */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Status</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(["draft", "active", "closed"] as const).map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.statusBtn,
                          formStatus === s && { backgroundColor: statusColor(s) },
                        ]}
                        onPress={() => setFormStatus(s)}
                      >
                        <Text
                          style={[
                            styles.statusBtnText,
                            formStatus === s && { color: "#fff" },
                          ]}
                        >
                          {statusLabel(s)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* ✅ CATÉGORIES (SINGLE SELECT) */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Catégorie</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesRow}
                  >
                    {CATEGORIES.map((cat) => {
                      const isSelected = formCategory === cat.key;
                      return (
                        <TouchableOpacity
                          key={cat.key}
                          style={[
                            styles.categoryPill,
                            isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                          ]}
                          onPress={() => setFormCategory(cat.key)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={cat.icon as any}
                            size={12}
                            color={isSelected ? "#FFF" : C.sub}
                          />
                          <Text
                            style={[
                              styles.categoryPillText,
                              isSelected && { color: "#FFF", fontWeight: "900" },
                            ]}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Boutons */}
                <View style={{ gap: 10, marginTop: 20 }}>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={saveChallenge}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="save" size={18} color="#fff" />
                        <Text style={styles.saveBtnText}>
                          {editingId ? "Mettre à jour" : "Créer"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowForm(false)}
                  >
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {!showForm && (
            <TouchableOpacity style={styles.newBtn} onPress={openNewForm}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.newBtnText}>Nouveau challenge</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, maxHeight: "88%", gap: 12, flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { color: C.text, fontWeight: "900", fontSize: 18 },
  listContainer: { flex: 1 },
  centerContent: { alignItems: "center", paddingVertical: 60, justifyContent: "center" },
  challengeCard: { backgroundColor: C.bg, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.border },
  chName: { color: C.text, fontWeight: "800", fontSize: 14 },
  formScroll: { flex: 1, paddingVertical: 16 },
  formGroup: { gap: 6, marginBottom: 16, paddingHorizontal: 16 },
  label: { color: C.text, fontWeight: "800", fontSize: 13 },
  hint: { color: C.muted, fontSize: 11, fontWeight: "600" },
  input: { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: C.text, borderWidth: 1, borderColor: C.border, fontSize: 14 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  statusBtnText: { color: C.text, fontWeight: "700", fontSize: 11 },
  categoriesRow: { gap: 8, paddingVertical: 4 },
  categoryPill: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: C.border, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: C.card },
  categoryPillText: { fontWeight: "700", color: C.sub, fontSize: 12 },
  saveBtn: { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16 },
  saveBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },
  cancelBtn: { backgroundColor: C.bg, borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border, marginHorizontal: 16 },
  cancelBtnText: { color: C.muted, fontWeight: "700", fontSize: 14 },
  newBtn: { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  newBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },
});