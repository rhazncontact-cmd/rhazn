// app/rz-admin-governance/cadna/cad-supreme-review.tsx

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../components/AdminGuard";

/* ─────────────────────────────
👑 CAD SUPREME — SAFE FINAL
───────────────────────────── */

const COLORS = {
  bg: "#000",
  card: "#0B0B0B",
  border: "rgba(255,255,255,0.14)",
  text: "#FFF",
  muted: "rgba(255,255,255,0.7)",
  gold: "#D4AF37",
  red: "#FF453A",
  green: "#34C759",
};

export default function CadSupremeReview() {
  return (
    <AdminGuard>
      <Screen />
    </AdminGuard>
  );
}

function Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  /* 🔐 SAFE content_id */
  const content_id =
    typeof params?.content_id === "string" ? params.content_id : null;

  const [busy, setBusy] = useState(false);

  /* 🔐 si aucun id */
  useEffect(() => {
    if (!content_id) {
      setTimeout(() => {
        Alert.alert("Erreur", "Aucun contenu transmis.");
        router.back();
      }, 300);
    }
  }, [content_id]);

  if (!content_id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Chargement...</Text>
      </View>
    );
  }

  /* ───────── CONFIRM ───────── */

  const confirm = (title: string, action: () => void) => {
    Alert.alert(
      title,
      "Action irréversible.\n\nCela écrase définitivement CADNA.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Confirmer", style: "destructive", onPress: action },
      ]
    );
  };

  /* ───────── APPROVE ───────── */

  const forceApprove = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const { error } = await supabase
        .from("store_products")
        .update({
          cadna_status: "approved",
          is_public: true,
          approved_at: new Date().toISOString(),
          cadna_reviewed_by: null, // override supreme
        })
        .eq("id", content_id);

      if (error) throw error;

      Alert.alert("Supreme", "Contenu approuvé par autorité suprême.");
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible.");
    } finally {
      setBusy(false);
    }
  };

  /* ───────── REJECT ───────── */

  const forceReject = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const { error } = await supabase
        .from("store_products")
        .update({
          cadna_status: "rejected",
          is_public: false,
          rejected_at: new Date().toISOString(),
          cadna_reviewed_by: null,
        })
        .eq("id", content_id);

      if (error) throw error;

      Alert.alert("Supreme", "Contenu rejeté définitivement.");
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible.");
    } finally {
      setBusy(false);
    }
  };

  /* ───────── REVOKE ───────── */

  const revokePublication = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const { error } = await supabase
        .from("store_products")
        .update({
          cadna_status: "rejected",
          is_public: false,
          rejected_at: new Date().toISOString(),
          cadna_reviewed_by: null,
        })
        .eq("id", content_id);

      if (error) throw error;

      Alert.alert("Supreme", "Publication retirée de Banq.");
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible.");
    } finally {
      setBusy(false);
    }
  };

  /* ───────── UI ───────── */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.gold} />
        </Pressable>

        <View>
          <Text style={styles.headerTop}>CAD SUPREME</Text>
          <Text style={styles.headerTitle}>Autorité absolue</Text>
        </View>
      </View>

      {/* WARNING */}
      <View style={styles.card}>
        <Ionicons name="alert-circle-outline" size={18} color={COLORS.gold} />
        <Text style={styles.cardText}>
          Toute action ici écrase CADNA et modifie définitivement l’état du système.
        </Text>
      </View>

      {/* ACTIONS */}
      <View style={{ gap: 14, paddingHorizontal: 18 }}>
        <ActionBtn
          label="Forcer APPROBATION"
          color={COLORS.green}
          icon="checkmark-circle-outline"
          disabled={busy}
          onPress={() => confirm("Approuver ?", forceApprove)}
        />

        <ActionBtn
          label="Forcer REJET"
          color={COLORS.red}
          icon="close-circle-outline"
          disabled={busy}
          onPress={() => confirm("Rejeter ?", forceReject)}
        />

        <ActionBtn
          label="Révoquer publication"
          color={COLORS.red}
          icon="hand-left-outline"
          disabled={busy}
          onPress={() => confirm("Révoquer ?", revokePublication)}
        />
      </View>

      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator color={COLORS.gold} />
        </View>
      )}
    </View>
  );
}

/* ───────── BTN ───────── */

function ActionBtn({ label, color, icon, onPress, disabled }: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        { borderColor: color },
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/* ───────── STYLES ───────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  hheader: {
  paddingTop: 76,
  paddingHorizontal: 18,
  flexDirection: "row",
  gap: 12,
  alignItems: "center",
},

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTop: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },

  card: {
    margin: 18,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  cardText: { color: COLORS.muted, flex: 1 },

  actionBtn: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: { fontWeight: "900", fontSize: 15 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: COLORS.muted },
});
