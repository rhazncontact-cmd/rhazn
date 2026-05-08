import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import PinVerifyModal from "../components/PinVerifyModal";
import { logoutStore } from "../lib/logoutStore";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────────────
import Constants from "expo-constants";
import { updateStore } from "../lib/useAppUpdate";
const APP_VERSION   = (Constants.expoConfig?.version ?? Constants.manifest?.version ?? "1.1.1") as string;
const PLAYSTORE_URL = "https://play.google.com/store/apps/details?id=com.rhzn.dev";
const LATEST_VERSION_URL = "https://mxxlchaygarszkygmylo.supabase.co/rest/v1/app_config?select=latest_version&app=eq.rhazn&apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eGxjaGF5Z2Fyc3preWdteWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1OTc3NjQsImV4cCI6MjA1NjE3Mzc2NH0.Fmn2ul5ESMX-DqrNxpjaRGOqCMgFGJMFPqgNExAbHEk";

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────
const C = {
  bg:          "#060606",
  card:        "#0F0F0F",
  cardBorder:  "#1C1C1C",
  white:       "#FFFFFF",
  muted:       "rgba(255,255,255,0.45)",
  mutedMed:    "rgba(255,255,255,0.65)",
  gold:        "#D4AF37",
  goldDim:     "rgba(212,175,55,0.15)",
  goldBorder:  "rgba(212,175,55,0.30)",
  glass:       "rgba(255,255,255,0.055)",
  glassBorder: "rgba(255,255,255,0.10)",
  danger:      "#FF453A",
  green:       "#30D158",
};

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type VideoQuality = "auto" | "hd" | "ultra";

interface LocalSettings {
  videoQuality:      VideoQuality;
  autoplay:          boolean;
  dataSaver:         boolean;
  silentPlay:        boolean;
  wifiOnly:          boolean;
  notifFollowers:    boolean;
  notifPayments:     boolean;
  notifComments:     boolean;
  notifRhazn:        boolean;
  privateAccount:    boolean;
  showFollowers:     boolean;
  allowMessages:     boolean;
  darkMode:          boolean;
  uiAnimations:      boolean;
  immersionMode:     boolean;
  smartScroll:       boolean;
  videoPreload:      boolean;
  premiumAnimations: boolean;
}

const DEFAULT_SETTINGS: LocalSettings = {
  videoQuality:      "auto",
  autoplay:          true,
  dataSaver:         false,
  silentPlay:        false,
  wifiOnly:          true,
  notifFollowers:    true,
  notifPayments:     true,
  notifComments:     true,
  notifRhazn:        false,
  privateAccount:    false,
  showFollowers:     true,
  allowMessages:     true,
  darkMode:          true,
  uiAnimations:      true,
  immersionMode:     true,
  smartScroll:       true,
  videoPreload:      true,
  premiumAnimations: true,
};

// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function SettingsUser() {
  const router = useRouter();

  const [loading,      setLoading]     = useState(true);
  const [updateAvail,  setUpdateAvail]  = useState(false);  // nouvelle version dispo
  const [latestVer,    setLatestVer]    = useState<string | null>(null);
  // ✅ Paramètres = entrée libre (pas de PIN au montage)
  const [pinVisible,  setPinVisible]  = useState(false);
  const [pinReady,    setPinReady]    = useState(false);  // PIN uniquement pour profil/modifier
  const [pinTarget,     setPinTarget]     = useState<string>("/user-profile");  // route après PIN
  const [pendingLogout, setPendingLogout] = useState(false);  // PIN pour déconnexion
  const [userEmail,   setUserEmail]   = useState<string | null>(null);
  const [cacheSize,   setCacheSize]   = useState("128 MB");
  const [qualityOpen, setQualityOpen] = useState(false);
  const [settings,    setSettings]    = useState<LocalSettings>(DEFAULT_SETTINGS);

  const toggle     = (key: keyof LocalSettings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  const setQuality = (q: VideoQuality) =>
    setSettings((prev) => ({ ...prev, videoQuality: q }));

  const notifAnim = useRef(new Animated.Value(0)).current;
  const [notif, setNotif] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotif(msg);
    Animated.timing(notifAnim, {
      toValue: 1, duration: 250,
      easing: Easing.out(Easing.exp), useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(notifAnim, {
        toValue: 0, duration: 200,
        easing: Easing.in(Easing.ease), useNativeDriver: true,
      }).start(() => setNotif(null));
    }, 2200);
  };

  // ── Vérification mise à jour via updateStore ──
  useEffect(() => {
    const unsub = updateStore.subscribe((info) => {
      setUpdateAvail(info.available);
      setLatestVer(info.latestVersion);
    });
    // Forcer une vérification immédiate
    updateStore.check();
    return unsub;
  }, []);

  // ── Auth guard ──
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return router.replace("/auth/login");
      setUserEmail(auth.user.email ?? null);
      setLoading(false);
    })();
  }, []);

  const clearCache = () => {
    setCacheSize("0 MB");
    showNotification("Cache vidéo vidé ✓");
  };

  const qualityLabel: Record<VideoQuality, string> = {
    auto: "Automatique", hd: "Haute (HD)", ultra: "Ultra (4K)",
  };

  if (loading) {
    return (
      <View style={s.boot}>
        <ActivityIndicator size="large" color={C.gold} />
      </View>
    );
  }

  // ── Si PIN pas encore validé → afficher un écran vide (le modal s'ouvre par-dessus) ──
  return (
    <View style={{flex:1}}>

      {/* ✅ PIN RHAZN — requis à chaque ouverture des paramètres */}
      <PinVerifyModal
        visible={pinVisible}
        onSuccess={async () => {
          setPinVisible(false);
          setPinReady(false);
          if (pendingLogout) {
            setPendingLogout(false);
            logoutStore.trigger(); // ✅ signaler une déconnexion volontaire
            await supabase.auth.signOut();
            router.replace("/auth/login");
          } else {
            router.push(pinTarget as any);
          }
        }}
        onCancel={() => {
          setPendingLogout(false);
          setPinVisible(false);
        }}
        showManageLink={false}
      />

      {/* Contenu toujours visible — PIN requis uniquement pour Profil/Modifier */}
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ HEADER TITRE ══ */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Paramètres</Text>
        </View>

        {/* ══ BANNIÈRE MISE À JOUR — Apple Premium ══ */}
        {/* ✅ MODIFIÉ : déplacée sous le titre Paramètres */}
        {updateAvail && latestVer && (
          <TouchableOpacity
            style={s.updateBanner}
            onPress={() => Linking.openURL(PLAYSTORE_URL)}
            activeOpacity={0.88}
          >
            {/* Point rouge animé */}
            <View style={s.updateBadgeDot} />
            <View style={s.updateBannerLeft}>
              <View style={s.updateIcon}>
                <Ionicons name="arrow-up-circle" size={28} color="#000" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={s.updateBannerTitle}>Mise à jour disponible</Text>
                  <View style={s.updateNewPill}>
                    <Text style={s.updateNewTxt}>NOUVEAU</Text>
                  </View>
                </View>
                <Text style={s.updateBannerSub}>
                  RHAZN v{latestVer} est disponible — Tapez pour mettre à jour
                </Text>
                <View style={s.updateProgressBar}>
                  <View style={s.updateProgressFill} />
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#000" />
          </TouchableOpacity>
        )}

        {/* ═══════════════════ SECTION : MON PROFIL ═══════════════════ */}
        <SectionHeader title="MON PROFIL" icon="person-circle-outline" />
        <View style={s.card}>
          <NavRow label="Mon profil"        onPress={() => { setPinTarget("/user-profile");    setPinVisible(true); setPinReady(false); }} />
          <Divider />
          <NavRow label="Modifier le profil" onPress={() => { setPinTarget("/identity-warning"); setPinVisible(true); setPinReady(false); }} />
          <Divider />

        </View>

        {/* ═══════════════════ SECTION : LECTURE & VIDÉO ═══════════════════ */}
        <SectionHeader title="LECTURE & VIDÉO" icon="play-circle-outline" />
        <View style={s.card}>
          <NavRow
            label="Qualité vidéo"
            value={qualityLabel[settings.videoQuality]}
            onPress={() => setQualityOpen(true)}
          />
          <Divider />
          <ToggleRow label="Autoplay" value={settings.autoplay} onToggle={() => toggle("autoplay")} />
          <Divider />
          <ToggleRow label="Mode économie de données" value={settings.dataSaver} onToggle={() => toggle("dataSaver")} />
          <Divider />
          <ToggleRow label="Lecture silencieuse par défaut" value={settings.silentPlay} onToggle={() => toggle("silentPlay")} />
          <Divider />
          <ToggleRow label="Télécharger uniquement en Wi-Fi" value={settings.wifiOnly} onToggle={() => toggle("wifiOnly")} />
        </View>

        {/* ═══════════════════ SECTION : EXPÉRIENCE RHAZN ═══════════════════ */}
        <SectionHeader title="EXPÉRIENCE RHAZN" icon="diamond-outline" gold />
        <View style={[s.card, s.goldCard]}>
          <ToggleRow label="Mode Immersion SUSPENTZ" value={settings.immersionMode} onToggle={() => toggle("immersionMode")} gold />
          <Divider gold />
          <ToggleRow label="Scroll intelligent" value={settings.smartScroll} onToggle={() => toggle("smartScroll")} gold />
          <Divider gold />
          <ToggleRow label="Préchargement vidéos" value={settings.videoPreload} onToggle={() => toggle("videoPreload")} gold />
          <Divider gold />
          <ToggleRow label="Animations premium" value={settings.premiumAnimations} onToggle={() => toggle("premiumAnimations")} gold />
        </View>

        {/* ═══════════════════ SECTION : NOTIFICATIONS ═══════════════════ */}
        <SectionHeader title="NOTIFICATIONS" icon="notifications-outline" />
        <View style={s.card}>
          <ToggleRow label="Nouveaux abonnés" value={settings.notifFollowers} onToggle={() => toggle("notifFollowers")} />
          <Divider />
          <ToggleRow label="Paiements reçus" value={settings.notifPayments} onToggle={() => toggle("notifPayments")} />
          <Divider />
          <ToggleRow label="Nouveaux commentaires" value={settings.notifComments} onToggle={() => toggle("notifComments")} />
          <Divider />
          <ToggleRow label="Actualités RHAZN" value={settings.notifRhazn} onToggle={() => toggle("notifRhazn")} />
        </View>

        {/* ═══════════════════ SECTION : SÉCURITÉ ═══════════════════ */}
        <SectionHeader title="SÉCURITÉ" icon="shield-checkmark-outline" gold />
        <View style={[s.card, s.goldCard]}>
          <NavRow
            label="PIN RHAZN"
            value="Gérer mon code PIN"
            onPress={() => router.push("/user-security-pin" as any)}
            gold
          />
        </View>

        {/* ═══════════════════ SECTION : CONFIDENTIALITÉ ═══════════════════ */}
        <SectionHeader title="CONFIDENTIALITÉ" icon="lock-closed-outline" />
        <View style={s.card}>
          <ToggleRow label="Compte privé" value={settings.privateAccount} onToggle={() => toggle("privateAccount")} />
          <Divider />
          <ToggleRow label="Afficher mes abonnés" value={settings.showFollowers} onToggle={() => toggle("showFollowers")} />
          <Divider />
          <ToggleRow label="Autoriser les messages" value={settings.allowMessages} onToggle={() => toggle("allowMessages")} />
        </View>

        {/* ═══════════════════ SECTION : APPARENCE ═══════════════════ */}
        <SectionHeader title="APPARENCE" icon="color-palette-outline" />
        <View style={s.card}>
          <ToggleRow label="Mode sombre" value={settings.darkMode} onToggle={() => toggle("darkMode")} />
          <Divider />
          <View style={s.plainRow}>
            <Text style={s.rowLabel}>Couleur accent</Text>
            <View style={s.accentDot} />
          </View>
          <Divider />
          <ToggleRow label="Animations UI" value={settings.uiAnimations} onToggle={() => toggle("uiAnimations")} />
        </View>

        {/* ═══════════════════ SECTION : STOCKAGE ═══════════════════ */}
        <SectionHeader title="STOCKAGE" icon="archive-outline" />
        <View style={s.card}>
          <View style={s.plainRow}>
            <Text style={s.rowLabel}>Cache vidéo utilisé</Text>
            <Text style={s.storageValue}>{cacheSize}</Text>
          </View>
          <Divider />
          <TouchableOpacity style={s.plainRow} onPress={clearCache}>
            <Text style={s.dangerText}>Vider le cache</Text>
            <Feather name="trash-2" size={16} color={C.danger} />
          </TouchableOpacity>
        </View>

        {/* ═══════════════════ SECTION : RHAZN ═══════════════════ */}
        <SectionHeader title="RHAZN" icon="information-circle-outline" />
        <View style={s.card}>
          <View style={s.plainRow}>
            <Text style={s.rowLabel}>Version app</Text>
            <Text style={s.mutedValue}>{APP_VERSION}</Text>
          </View>
          <Divider />
          {updateAvail && latestVer && (
            <>
              <Divider />
              <TouchableOpacity
                style={s.updateRow}
                onPress={() => Linking.openURL(PLAYSTORE_URL)}
                activeOpacity={0.85}
              >
                <View style={s.updateRowIcon}>
                  <Ionicons name="arrow-up-circle" size={20} color="#000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.updateLabel}>Mettre à jour RHAZN</Text>
                  <Text style={s.updateSublabel}>Version {latestVer} disponible sur le Play Store</Text>
                </View>
                <View style={s.updateBadge}>
                  <Text style={s.updateBadgeTxt}>NOUVEAU</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={C.gold} />
              </TouchableOpacity>
            </>
          )}
          <Divider />
          <NavRow label="Conditions d'utilisation" onPress={() => router.push("/legal/conditions" as any)} />
          <Divider />
          <NavRow label="Politique de confidentialité" onPress={() => router.push("/legal/confidentialite" as any)} />
          <Divider />
          <NavRow label="À propos de RHAZN" onPress={() => router.push("/legal/a-propos" as any)} />
        </View>

        {/* ══ DÉCONNEXION ══ */}
        <TouchableOpacity
          style={s.logoutBtn}
          activeOpacity={0.85}
          onPress={() => {
            setPendingLogout(true);
            setPinVisible(true);
            setPinReady(false);
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={C.danger} />
          <View style={{ flex: 1 }}>
            <Text style={s.logoutTxt}>Se déconnecter</Text>
            {userEmail && <Text style={s.logoutEmail}>{userEmail}</Text>}
          </View>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ═══════════════════ QUALITY MODAL ═══════════════════ */}
      <Modal transparent visible={qualityOpen} animationType="fade">
        <BlurView intensity={50} tint="dark" style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Qualité vidéo</Text>
            {(["auto", "hd", "ultra"] as VideoQuality[]).map((q) => (
              <TouchableOpacity
                key={q}
                style={[s.qualityOption, settings.videoQuality === q && s.qualityOptionActive]}
                onPress={() => { setQuality(q); setQualityOpen(false); }}
              >
                <Text style={[s.qualityOptionText, settings.videoQuality === q && { color: C.gold }]}>
                  {qualityLabel[q]}
                </Text>
                {settings.videoQuality === q && (
                  <Ionicons name="checkmark" size={18} color={C.gold} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.sheetCancel} onPress={() => setQualityOpen(false)}>
              <Text style={s.sheetCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      {/* ═══════════════════ NOTIFICATION TOAST ═══════════════════ */}
      {notif && (
        <Animated.View style={[s.toast, { opacity: notifAnim }]}>
          <BlurView intensity={45} tint="dark" style={s.toastBlur}>
            <Ionicons name="checkmark-circle" size={15} color={C.gold} />
            <Text style={s.toastText}>{notif}</Text>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

function SectionHeader({ title, icon, gold }: { title: string; icon: string; gold?: boolean }) {
  return (
    <View style={sh.row}>
      <Ionicons name={icon as any} size={13} color={gold ? C.gold : C.muted} />
      <Text style={[sh.text, gold && { color: C.gold }]}>{title}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 28, marginBottom: 8, paddingHorizontal: 4,
  },
  text: { color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
});

function Divider({ gold }: { gold?: boolean }) {
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: gold ? C.goldBorder : C.cardBorder }} />
  );
}

function ToggleRow({ label, value, onToggle, gold }: {
  label: string; value: boolean; onToggle: () => void; gold?: boolean;
}) {
  return (
    <View style={s.toggleRow}>
      <Text style={[s.rowLabel, gold && { color: C.white }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "rgba(255,255,255,0.1)", true: gold ? C.gold : C.green }}
        thumbColor={C.white}
        ios_backgroundColor="rgba(255,255,255,0.1)"
      />
    </View>
  );
}

function NavRow({ label, value, onPress, gold }: {
  label: string; value?: string; onPress: () => void; gold?: boolean;
}) {
  return (
    <TouchableOpacity style={s.navRow} onPress={onPress}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
        {gold && (
          <View style={s.pinIconWrap}>
            <Ionicons name="keypad-outline" size={16} color={C.gold} />
          </View>
        )}
        <Text style={[s.rowLabel, gold && { color: C.white, fontWeight: "700" }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {value && <Text style={[s.mutedValue, gold && { color: C.gold, fontWeight: "700" }]}>{value}</Text>}
        <Feather name="chevron-right" size={16} color={gold ? C.gold : C.muted} />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  boot:   { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 18, paddingBottom: 40 },

  // ── Bannière mise à jour Apple Premium ──
  updateBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.gold, borderRadius: 20,
    padding: 16, marginBottom: 16, overflow: "hidden",
    shadowColor: C.gold, shadowOpacity: 0.35, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  updateBadgeDot:    { position: "absolute", top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF3B30", borderWidth: 2, borderColor: C.gold },
  updateBannerLeft:  { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  updateIcon:        { width: 50, height: 50, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.18)", alignItems: "center", justifyContent: "center" },
  updateBannerTitle: { color: "#000", fontWeight: "900", fontSize: 15 },
  updateBannerSub:   { color: "rgba(0,0,0,0.65)", fontSize: 11, fontWeight: "600", marginTop: 3, lineHeight: 16 },
  updateNewPill:     { backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  updateNewTxt:      { color: "#000", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  updateProgressBar: { height: 3, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 99, marginTop: 8, overflow: "hidden" },
  updateProgressFill:{ height: 3, width: "75%", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 99 },

  // ── Ligne update dans carte RHAZN ──
  updateRow:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  updateRowIcon:  { width: 34, height: 34, borderRadius: 10, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" },
  updateLabel:    { color: C.gold, fontWeight: "900", fontSize: 13 },
  updateSublabel: { color: C.muted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  updateBadge:    { backgroundColor: "rgba(212,175,55,0.15)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(212,175,55,0.30)" },
  updateBadgeTxt: { color: C.gold, fontWeight: "900", fontSize: 9, letterSpacing: 0.5 },

  // ── Page header ──
  pageHeader: {
    paddingTop: 56,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  pageTitle: {
    color: C.white,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,69,58,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,69,58,0.28)",
  },
  logoutEmail: {
    fontSize: 11,
    color: "rgba(220,38,38,0.65)",
    fontWeight: "600",
    marginTop: 2,
  },
  logoutTxt: {
    color: C.danger,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  // ── Cards ──
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.cardBorder,
    overflow: "hidden",
  },
  goldCard: {
    borderColor: C.goldBorder,
    backgroundColor: "rgba(212,175,55,0.05)",
  },

  // ── Rows ──
  toggleRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
  },
  navRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  plainRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },

  // ── Text ──
  rowLabel:     { color: C.mutedMed, fontSize: 14, fontWeight: "600", flex: 1, marginRight: 10 },
  mutedValue:   { color: C.muted, fontSize: 13, fontWeight: "600" },
  storageValue: { color: C.gold, fontSize: 13, fontWeight: "800" },
  dangerText:   { color: C.danger, fontSize: 14, fontWeight: "700", flex: 1 },

  // ── PIN icon wrap ──
  pinIconWrap: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: C.goldDim,
    borderWidth: 1, borderColor: C.goldBorder,
    alignItems: "center", justifyContent: "center",
  },

  // ── Accent dot ──
  accentDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.gold,
    shadowColor: C.gold, shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
  },

  // ── Modal / Sheet ──
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0E0E0E",
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 38,
    alignItems: "center", gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 8,
  },
  sheetTitle: { color: C.white, fontSize: 18, fontWeight: "900", textAlign: "center" },
  sheetCancel: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 14, borderRadius: 14, alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder,
    marginTop: 4,
  },
  sheetCancelText: { color: C.mutedMed, fontSize: 14, fontWeight: "700" },
  qualityOption: {
    width: "100%", flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 15,
    backgroundColor: C.glass, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder,
  },
  qualityOptionActive: { backgroundColor: C.goldDim, borderColor: C.goldBorder },
  qualityOptionText: { color: C.mutedMed, fontSize: 15, fontWeight: "700" },

  // ── Toast ──
  toast: { position: "absolute", top: 54, alignSelf: "center", zIndex: 999 },
  toastBlur: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 22,
  },
  toastText: { color: C.white, fontSize: 13, fontWeight: "700" },
});