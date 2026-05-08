// app/components/AppUpdateAlert.tsx
// ✅ Modal Apple-like — apparaît automatiquement toutes les 45 min si màj dispo
// ✅ À placer dans _layout.tsx pour être visible partout dans l'app

import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { APP_VERSION, updateStore } from "../lib/useAppUpdate";

const GOLD    = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.12)";
const GOLD_BD  = "rgba(212,175,55,0.30)";
const BG      = "#0A0A0A";
const CARD    = "#111111";
const WHITE   = "#FFFFFF";
const MUTED   = "rgba(255,255,255,0.55)";
const BORDER  = "rgba(255,255,255,0.08)";
const GREEN   = "#34C759";

// Délai avant de montrer l'alerte (évite d'afficher au démarrage brutal)
const SHOW_DELAY_MS = 3000;
// Intervalle entre 2 alertes (45 min) — même si update dispo
const ALERT_INTERVAL_MS = 45 * 60 * 1000;

export default function AppUpdateAlert() {
  const [visible,       setVisible]       = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseNotes,  setReleaseNotes]  = useState<string | null>(null);
  const [storeUrl,      setStoreUrl]      = useState<string | null>(null);

  const lastShownRef = useRef<number>(0);
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ── S'abonner au store ──────────────────────────────────────
  useEffect(() => {
    // Démarrer le polling
    updateStore.startPolling();

    const unsub = updateStore.subscribe((info) => {
      if (!info.available) return;

      const now = Date.now();
      const sinceLastShown = now - lastShownRef.current;

      // Première fois → attendre SHOW_DELAY_MS après le démarrage
      // Fois suivantes → attendre ALERT_INTERVAL_MS
      const delay = lastShownRef.current === 0 ? SHOW_DELAY_MS : 0;

      if (lastShownRef.current > 0 && sinceLastShown < ALERT_INTERVAL_MS) return;

      setTimeout(() => {
        setLatestVersion(info.latestVersion);
        setReleaseNotes(info.releaseNotes);
        setStoreUrl(info.storeUrl);
        show();
        lastShownRef.current = Date.now();
      }, delay);
    });

    return () => {
      unsub();
      // Ne pas arrêter le polling ici — il doit continuer en background
    };
  }, []);

  // ── Animations Apple-like ───────────────────────────────────
  const show = () => {
    setVisible(true);
    scaleAnim.setValue(0.88);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1, duration: 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 8, tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim,   { toValue: 0.92, duration: 200, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  const handleUpdate = async () => {
    hide();
    const url = storeUrl ?? (
      Platform.OS === "ios"
        ? "https://apps.apple.com/app/rhazn"
        : "https://play.google.com/store/apps/details?id=com.rhzn.dev"
    );
    try { await Linking.openURL(url); } catch (_e) {}
  };

  const handleLater = () => hide();

  if (!visible) return null;

  return (
    <Animated.View style={[st.backdrop, { opacity: opacityAnim }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleLater} />

      <Animated.View style={[st.card, { transform: [{ scale: scaleAnim }] }]}>

        {/* ── Icône ── */}
        <View style={st.iconWrap}>
          <View style={st.iconRing}>
            <Ionicons name="arrow-up-circle" size={36} color={GOLD} />
          </View>
          <View style={st.newBadge}>
            <Text style={st.newBadgeTxt}>NOUVEAU</Text>
          </View>
        </View>

        {/* ── Titre ── */}
        <Text style={st.title}>Mise à jour disponible</Text>
        <Text style={st.subtitle}>RHAZN {latestVersion ?? "—"}</Text>

        {/* ── Version actuelle → nouvelle ── */}
        <View style={st.versionRow}>
          <View style={st.versionPill}>
            <Text style={st.versionCurrent}>v{APP_VERSION}</Text>
          </View>
          <Ionicons name="arrow-forward" size={14} color={MUTED} />
          <View style={[st.versionPill, st.versionPillNew]}>
            <Text style={st.versionNew}>v{latestVersion}</Text>
          </View>
        </View>

        {/* ── Notes de version ── */}
        {releaseNotes && (
          <View style={st.notesBox}>
            <View style={st.notesHeader}>
              <Ionicons name="list-outline" size={13} color={GOLD} />
              <Text style={st.notesTitle}>Nouveautés</Text>
            </View>
            <Text style={st.notesText}>{releaseNotes}</Text>
          </View>
        )}

        {/* ── Séparateur ── */}
        <View style={st.divider} />

        {/* ── Boutons ── */}
        <Pressable style={st.updateBtn} onPress={handleUpdate}>
          <Ionicons name="cloud-download-outline" size={18} color="#000" />
          <Text style={st.updateBtnTxt}>Mettre à jour maintenant</Text>
        </Pressable>

        <Pressable style={st.laterBtn} onPress={handleLater}>
          <Text style={st.laterBtnTxt}>Plus tard</Text>
        </Pressable>

      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center", alignItems: "center",
    zIndex: 99999, padding: 24,
  },

  card: {
    width: "100%", maxWidth: 360,
    backgroundColor: CARD,
    borderRadius: 28,
    paddingHorizontal: 24, paddingVertical: 28,
    alignItems: "center", gap: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: GOLD,
    shadowOpacity: 0.20,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 24,
  },

  // Icône
  iconWrap: { alignItems: "center", position: "relative", marginBottom: 4 },
  iconRing: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: GOLD_DIM,
    borderWidth: 1.5, borderColor: GOLD_BD,
    alignItems: "center", justifyContent: "center",
  },
  newBadge: {
    position: "absolute", top: -6, right: -12,
    backgroundColor: GREEN, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  newBadgeTxt: { color: "#000", fontWeight: "900", fontSize: 9, letterSpacing: 0.5 },

  // Titre
  title:    { color: WHITE, fontSize: 22, fontWeight: "900", textAlign: "center" },
  subtitle: { color: GOLD, fontSize: 14, fontWeight: "800", textAlign: "center", marginTop: -6 },

  // Version row
  versionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  versionPill: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  versionPillNew: { backgroundColor: GOLD_DIM, borderColor: GOLD_BD },
  versionCurrent: { color: MUTED, fontWeight: "700", fontSize: 12 },
  versionNew:     { color: GOLD,  fontWeight: "900", fontSize: 12 },

  // Notes
  notesBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: BORDER,
    gap: 8,
  },
  notesHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  notesTitle:  { color: GOLD, fontWeight: "800", fontSize: 12 },
  notesText:   { color: MUTED, fontSize: 12, fontWeight: "600", lineHeight: 18 },

  // Séparateur
  divider: { height: 1, backgroundColor: BORDER, width: "100%" },

  // Boutons
  updateBtn: {
    width: "100%", backgroundColor: GOLD,
    borderRadius: 16, paddingVertical: 15,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    shadowColor: GOLD, shadowOpacity: 0.35,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  updateBtnTxt: { color: "#000", fontWeight: "900", fontSize: 15 },

  laterBtn: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16, paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1, borderColor: BORDER,
  },
  laterBtnTxt: { color: MUTED, fontWeight: "700", fontSize: 14 },
});