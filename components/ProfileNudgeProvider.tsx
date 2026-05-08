// app/components/ProfileNudgeProvider.tsx
// ✅ RHAZN — Nudge profil incomplet
// ✅ SDK 53 compatible — expo-notifications push retiré d'Expo Go
// ✅ Utilise uniquement les notifications locales (pas de push)

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

// ✅ expo-notifications retiré — incompatible Expo Go SDK 53
// Les notifications locales sont gérées par _layout.tsx via notifSound
const Notifications: any = null;

const NUDGE_KEY        = "rhazn_nudge_dismissed_at";
const NUDGE_COOLDOWN   = 24 * 60 * 60 * 1000; // 24h

// ─── Helpers notifications locales ──────────────────────────
async function requestNotifPermission() {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (_e) {
    return false;
  }
}

async function scheduleLocalNotif(title: string, body: string) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // immédiat
    });
  } catch (_e) {
    // Silencieux si non disponible
  }
}

async function setBadgeCount(n: number) {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(n);
  } catch (_e) {
    // Silencieux
  }
}

// ─── Types ──────────────────────────────────────────────────
type NudgeField = {
  key: string;
  label: string;
};

const REQUIRED_FIELDS: NudgeField[] = [
  { key: "full_name",      label: "Nom complet"          },
  { key: "avatar_url",     label: "Photo de profil"      },
  { key: "phone",          label: "Téléphone"            },
  { key: "whatsapp_phone", label: "WhatsApp"             },
  { key: "profession",     label: "Profession"           },
  { key: "birth_date",     label: "Date de naissance"    },
  { key: "sex",            label: "Sexe"                 },
  { key: "birth_city",     label: "Ville de naissance"   },
  { key: "birth_country",  label: "Pays de naissance"    },
];

// ─── Composant ──────────────────────────────────────────────
export default function ProfileNudgeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [visible,  setVisible]  = useState(false);
  const [missing,  setMissing]  = useState<string[]>([]);
  const checkedRef = useRef(false);

  const checkProfile = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      // Vérifier si nudge déjà dismissé récemment
      const dismissed = await AsyncStorage.getItem(NUDGE_KEY);
      if (dismissed) {
        const elapsed = Date.now() - parseInt(dismissed, 10);
        if (elapsed < NUDGE_COOLDOWN) return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(REQUIRED_FIELDS.map(f => f.key).join(", "))
        .eq("id", uid)
        .maybeSingle();

      if (!profile) return;

      const missingFields = REQUIRED_FIELDS
        .filter(f => !profile[f.key] || profile[f.key] === "")
        .map(f => f.label);

      if (missingFields.length > 0) {
        setMissing(missingFields);
        setVisible(true);
        // Notification locale si disponible
        await scheduleLocalNotif(
          "Complétez votre profil RHAZN",
          `${missingFields.length} champ${missingFields.length > 1 ? "s" : ""} manquant${missingFields.length > 1 ? "s" : ""}.`
        );
      }
    } catch (_e) {
      // Silencieux
    }
  };

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    // Initialiser les permissions notifications
    requestNotifPermission();

    // Vérifier le profil après un délai
    const t = setTimeout(() => checkProfile(), 3000);

    // Re-vérifier quand l'app revient au premier plan
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") checkProfile();
    });

    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, []);

  const handleDismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem(NUDGE_KEY, String(Date.now()));
    await setBadgeCount(0);
  };

  const handleComplete = async () => {
    setVisible(false);
    await AsyncStorage.setItem(NUDGE_KEY, String(Date.now()));
    router.push("/user-profile-edit" as any);
  };

  return (
    <>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleDismiss}
      >
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.handle} />

            {/* Icône */}
            <View style={s.iconWrap}>
              <Text style={{ fontSize: 32 }}>👤</Text>
            </View>

            <Text style={s.title}>Profil incomplet</Text>
            <Text style={s.sub}>
              {missing.length} champ{missing.length > 1 ? "s" : ""} manquant{missing.length > 1 ? "s" : ""} pour activer toutes les fonctionnalités RHAZN.
            </Text>

            {/* Champs manquants */}
            <View style={s.fieldsWrap}>
              {missing.slice(0, 4).map((f, i) => (
                <View key={i} style={s.fieldRow}>
                  <View style={s.fieldDot} />
                  <Text style={s.fieldTxt}>{f}</Text>
                </View>
              ))}
              {missing.length > 4 && (
                <Text style={s.moreFields}>+{missing.length - 4} autres champs…</Text>
              )}
            </View>

            {/* Boutons */}
            <TouchableOpacity style={s.completeBtn} onPress={handleComplete} activeOpacity={0.85}>
              <Text style={s.completeTxt}>Compléter mon profil</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.laterBtn} onPress={handleDismiss} activeOpacity={0.8}>
              <Text style={s.laterTxt}>Plus tard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet:       { backgroundColor: "#0D0D0D", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", marginBottom: 20 },
  iconWrap:    { width: 72, height: 72, borderRadius: 22, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.30)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title:       { color: "#FFFFFF", fontSize: 20, fontWeight: "900", marginBottom: 8, textAlign: "center" },
  sub:         { color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  fieldsWrap:  { width: "100%", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  fieldRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  fieldDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D4AF37" },
  fieldTxt:    { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "600" },
  moreFields:  { color: "rgba(255,255,255,0.40)", fontSize: 12, fontWeight: "600", marginTop: 4 },
  completeBtn: { width: "100%", backgroundColor: "#D4AF37", borderRadius: 16, paddingVertical: 15, alignItems: "center", marginBottom: 10, shadowColor: "#D4AF37", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  completeTxt: { color: "#000", fontWeight: "900", fontSize: 15 },
  laterBtn:    { width: "100%", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  laterTxt:    { color: "rgba(255,255,255,0.55)", fontWeight: "700", fontSize: 14 },
});