/* ================================================================
📱 RHAZN — RhaznFooter.tsx
✅ Menu "Publier" premium Apple bottom-sheet au tap sur l'icône +
✅ 3 options : Suspentz → publish/suspentz
               Produits  → publish/products
               KozeSans  → alerte "pas encore disponible"
✅ Badge rouge sur l'icône Paramètres quand une mise à jour est dispo
✅ AJOUT : icône Classement → /user-rang
✅ AJOUT : icône Statistiques → /statistiques
✅ AJOUT : onglet Dialog — user=Dialog or / admin=Répondre rouge + compteur
================================================================ */
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import agentPinStore from "../lib/agentPinStore";
import { badgeStore } from "../lib/badgeStore";
import { espacePinStore } from "../lib/espacePinStore";
import { supabase } from "../lib/supabase";
import { updateStore } from "../lib/useAppUpdate";

// ─────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────
const C = {
  bg:          "#000000",
  card:        "#111111",
  surface:     "#161616",
  white:       "#FFFFFF",
  muted:       "rgba(255,255,255,0.50)",
  sub:         "rgba(255,255,255,0.28)",
  border:      "rgba(255,255,255,0.10)",
  hairline:    "rgba(255,255,255,0.07)",
  gold:        "#D4AF37",
  goldDim:     "rgba(212,175,55,0.12)",
  goldBorder:  "rgba(212,175,55,0.30)",
  blue:        "#007AFF",
  blueDim:     "rgba(0,122,255,0.12)",
  blueBorder:  "rgba(0,122,255,0.30)",
  orange:      "#FF9F0A",
  orangeDim:   "rgba(255,159,10,0.12)",
  orangeBorder:"rgba(255,159,10,0.30)",
  green:       "#34C759",
  red:         "#FF453A",
  redDim:      "rgba(255,69,58,0.15)",
  redBorder:   "rgba(255,69,58,0.45)",
  purple:      "#AF52DE",
  teal:        "#32ADE6",
};

// ─────────────────────────────────────────────────────────────────
// TABS CONFIG
// ─────────────────────────────────────────────────────────────────
type Tab = {
  key:         string;
  label:       string;
  icon:        string;
  iconFocused: string;
  route:       string;
};

const TABS_VISIBLE: Tab[] = [
  { key: "banq", label: "BANQ", icon: "wallet-outline", iconFocused: "wallet", route: "/banq/suspentz" },

  { key: "notifs",   label: "Notifs",     icon: "notifications-outline", iconFocused: "notifications", route: "/user-notifications" },
  { key: "publish",  label: "Publier",    icon: "add-circle-outline",    iconFocused: "add-circle",    route: "__publish__"         },
  { key: "channel",  label: "Store",      icon: "bag-handle-outline",    iconFocused: "bag-handle",    route: "/rz-channel"         },
  { key: "settings", label: "Paramètres", icon: "settings-outline",      iconFocused: "settings",      route: "/user-settings"      },
];

const TABS_HIDDEN: Tab[] = [
  { key: "classement", label: "Classement", icon: "trophy-outline",  iconFocused: "trophy",  route: "/user-rang"             },
  { key: "stats",      label: "Stats",      icon: "pulse-outline",   iconFocused: "pulse",   route: "/rz-stats"              },
  { key: "espace",     label: "Espace",     icon: "grid-outline",    iconFocused: "grid",    route: "/user-space/mon-espace" },
  // ✅ Dialog — user ou admin
  { key: "Support",    label: "Support",     icon: "chatbubble-ellipses-outline", iconFocused: "chatbubble-ellipses", route: "/rz-channel/dialog" },
  // ✅ Agents RHAZN
  { key: "agents",    label: "Agent/contact",     icon: "people-circle-outline", iconFocused: "people-circle", route: "/rz-agents-liste" },
  // ✅ Corbeille — toujours en dernier
  { key: "corbeille",  label: "Corbeille",  icon: "trash-outline",   iconFocused: "trash",   route: "/user-corbeille"        },
];

const TABS = [...TABS_VISIBLE, ...TABS_HIDDEN];

// ─────────────────────────────────────────────────────────────────
// PUBLISH MENU OPTIONS
// ─────────────────────────────────────────────────────────────────
type PublishOption = {
  key:          string;
  label:        string;
  sublabel:     string;
  icon:         string;
  accentColor:  string;
  accentDim:    string;
  accentBorder: string;
  route?:       string;
};

const PUBLISH_OPTIONS: PublishOption[] = [
  { key: "suspentz", label: "Suspentz", sublabel: "Vidéo courte • max 125s • 1 ACSET",    icon: "play-circle", accentColor: C.gold,   accentDim: C.goldDim,   accentBorder: C.goldBorder,   route: "/publish/suspentz"   },
  { key: "products", label: "Produits", sublabel: "Boutique RHAZN • images HD • 10 ACSET", icon: "cube",        accentColor: C.blue,   accentDim: C.blueDim,   accentBorder: C.blueBorder,   route: "/publish/products"   },
  // ✅ SUPREME ONLY — masqué pour les autres via filtre dans le composant
  { key: "music",    label: "Musique",  sublabel: "Catalogue RHAZN • Uploader une piste",  icon: "musical-notes", accentColor: C.purple, accentDim: "rgba(175,82,222,0.12)", accentBorder: "rgba(175,82,222,0.30)", route: "/admin/upload-music" },
];

// ─────────────────────────────────────────────────────────────────
// PUBLISH MENU
// ─────────────────────────────────────────────────────────────────
function PublishMenu({ visible, onClose, onSelect, isSupreme }: {
  visible: boolean; onClose: () => void; onSelect: (opt: PublishOption) => void; isSupreme: boolean;
}) {
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
        Animated.timing(backdropOp, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 400, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOp, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;
  return (
    <Animated.View style={[pm.backdrop, { opacity: backdropOp }]} pointerEvents={visible ? "auto" : "none"}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={[pm.sheet, { transform: [{ translateY }] }]}>
        <View style={pm.handle} />
        <View style={pm.headerRow}>
          <View style={pm.headerIconWrap}><Ionicons name="add-circle" size={22} color={C.gold} /></View>
          <View>
            <Text style={pm.headerTitle}>Publier du contenu</Text>
            <Text style={pm.headerSub}>Choisissez le type de publication</Text>
          </View>
        </View>
        <View style={pm.divider} />
        {PUBLISH_OPTIONS.filter(opt => opt.key !== "music" || isSupreme).map((opt, idx) => (
          <TouchableOpacity key={opt.key} style={[pm.optionRow, idx < PUBLISH_OPTIONS.length - 1 && pm.optionBorder, !opt.route && pm.optionDisabled]} onPress={() => onSelect(opt)} activeOpacity={opt.route ? 0.80 : 0.95}>
            <View style={[pm.optIconWrap, { backgroundColor: opt.accentDim, borderColor: opt.accentBorder }]}>
              <Ionicons name={opt.icon as any} size={22} color={opt.route ? opt.accentColor : C.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={pm.optLabelRow}>
                <Text style={[pm.optLabel, !opt.route && pm.optLabelDisabled]}>{opt.label}</Text>
                {!opt.route && <View style={pm.soonBadge}><Text style={pm.soonTxt}>BIENTÔT</Text></View>}
              </View>
              <Text style={pm.optSublabel}>{opt.sublabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={opt.route ? C.muted : C.sub} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={pm.cancelBtn} onPress={onClose} activeOpacity={0.82}>
          <Text style={pm.cancelTxt}>Annuler</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
// COMING SOON ALERT
// ─────────────────────────────────────────────────────────────────
function ComingSoonAlert({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const op    = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 240, useNativeDriver: true }),
        Animated.timing(op,   { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.88, duration: 160, useNativeDriver: true }),
        Animated.timing(op,   { toValue: 0,    duration: 160, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[ca.overlay, { opacity: op }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[ca.card, { transform: [{ scale }] }]}>
          <View style={ca.iconRing}><Ionicons name="mic" size={32} color={C.orange} /></View>
          <Text style={ca.title}>KozeSans</Text>
          <Text style={ca.msg}>Cette fonctionnalité est actuellement en préparation.{"\n\n"}Notre équipe travaille pour vous offrir la meilleure expérience. Vous serez notifié dès qu'elle sera disponible.</Text>
          <View style={ca.divider} />
          <View style={ca.btnRow}>
            <TouchableOpacity style={ca.btnPrimary} onPress={onClose} activeOpacity={0.85}>
              <Text style={ca.btnPrimaryTxt}>Compris</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// RHAZN FOOTER
// ─────────────────────────────────────────────────────────────────
export default function RhaznFooter() {
  const router   = useRouter();
  const pathname = usePathname();

  const [publishMenuOpen, setPublishMenuOpen] = useState(false);
  const [comingSoonOpen,  setComingSoonOpen]  = useState(false);
  const [userRole,        setUserRole]        = useState<string>("user");
  const [isAgentFromEds,  setIsAgentFromEds]  = useState(false);
  const [switchOpen,      setSwitchOpen]      = useState(false);
  const [notifBadge,      setNotifBadge]      = useState(badgeStore.count);
  const [updateAvail,     setUpdateAvail]     = useState(false);



  // ── Subscribe badgeStore ──
  useEffect(() => {
    setNotifBadge(badgeStore.count);
    const unsub = badgeStore.subscribe((n) => setNotifBadge(n));
    return unsub;
  }, []);

  // ── Subscribe updateStore ──
  useEffect(() => {
    const unsub = updateStore.subscribe((info) => setUpdateAvail(info.available));
    updateStore.check();
    return unsub;
  }, []);

  // ── Badge notifications + realtime ──
  useEffect(() => {
    let channel: any;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_uid", uid).eq("is_read", false);
      setNotifBadge(count ?? 0);
      badgeStore.set(count ?? 0);

      const refreshBadge = async () => {
        const { count: c } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_uid", uid).eq("is_read", false);
        const n = c ?? 0;
        setNotifBadge(n);
        badgeStore.set(n);
      };

      channel = supabase.channel(`footer-notif-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_uid=eq.${uid}` }, () => {
          setNotifBadge(prev => prev + 1);
          badgeStore.set(badgeStore.count + 1);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_uid=eq.${uid}` }, refreshBadge)
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications", filter: `user_uid=eq.${uid}` }, refreshBadge)
        .subscribe();

      const { AppState } = require("react-native");
      const appStateSub = AppState.addEventListener("change", (state: string) => {
        if (state === "active") refreshBadge();
      });
      (channel as any)._appStateSub = appStateSub;
    })();

    return () => {
      if (channel) {
        if ((channel as any)._appStateSub) (channel as any)._appStateSub.remove();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // ── Charger rôle + EDS + statut admin Dialog ──
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).single();
      setUserRole((p?.role ?? "user").toLowerCase());

      const { data: eds } = await supabase
        .from("eds").select("auth_uid").eq("auth_uid", uid).eq("is_active", true).maybeSingle();
      setIsAgentFromEds(!!eds);


    })();
  }, []);



  // ── Android nav bar ──
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
  }, [switchOpen]);

  // ── Switch handler ──
  const handleSwitchPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const role = userRole;
    if (role === "supreme")                                    { setSwitchOpen(true); return; }
    if (role === "agent" || isAgentFromEds)                   { router.push("/agent-key" as any); return; }
    if (["cad","cadna","admin","cada"].includes(role))         { router.push("/admin-key" as any); return; }
    router.push("/not-authorized" as any);
  };

  const plusScale = useRef(new Animated.Value(1)).current;

  // ── Tab press ──
  const handleTabPress = (tab: Tab) => {
    if (tab.key !== "espace") espacePinStore.reset();
    agentPinStore.reset();

    if (tab.key === "publish") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Animated.sequence([
        Animated.spring(plusScale, { toValue: 1.18, damping: 10, stiffness: 300, useNativeDriver: true }),
        Animated.spring(plusScale, { toValue: 1,    damping: 12, stiffness: 300, useNativeDriver: true }),
      ]).start();
      setPublishMenuOpen(true);
      return;
    }

    // ✅ Onglet Dialog — toujours vers le dialog utilisateur
    if (tab.key === "dialog") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      router.push("/rz-channel/dialog" as any);
      return;
    }

    Haptics.selectionAsync().catch(() => {});
    router.push(tab.route as any);
  };

  const handlePublishOption = (opt: PublishOption) => {
    setPublishMenuOpen(false);
    if (!opt.route) {
      setTimeout(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setComingSoonOpen(true); }, 250);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTimeout(() => router.push(opt.route as any), 200);
  };

  const isActive = (tab: Tab): boolean => {
    if (tab.key === "publish") return false;
    return pathname?.startsWith(tab.route) ?? false;
  };

  const tabAccent = (key: string): string => {
    if (key === "classement") return C.gold;
    if (key === "stats")      return C.purple;
    if (key === "dialog")     return C.gold;
    if (key === "agents")     return C.teal;
    return C.gold;
  };

  return (
    <>
      <PublishMenu visible={publishMenuOpen} onClose={() => setPublishMenuOpen(false)} onSelect={handlePublishOption} isSupreme={userRole === "supreme"} />
      <ComingSoonAlert visible={comingSoonOpen} onClose={() => setComingSoonOpen(false)} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ft.bar}
        bounces={false}
        overScrollMode="never"
      >
        {TABS.map((tab) => {
          const active    = isActive(tab);
          const isPublish = tab.key === "publish";
          const isEspace  = tab.key === "espace";
          const isDialog  = tab.key === "dialog";
          const accent    = active ? tabAccent(tab.key) : C.muted;

          if (isPublish) {
            return (
              <Pressable key={tab.key} style={ft.publishWrap} onPress={() => handleTabPress(tab)}>
                <Animated.View style={[ft.publishBtn, { transform: [{ scale: plusScale }] }]}>
                  <Ionicons name="add" size={28} color="#000" />
                </Animated.View>
                <Text style={ft.publishLabel}>Publier</Text>
              </Pressable>
            );
          }

          // ✅ ONGLET DIALOG — or, toujours vers /rz-channel/dialog
          if (isDialog) {
            return (
              <Pressable key={tab.key} style={ft.tabBtn} onPress={() => handleTabPress(tab)}>
                <View style={{ position: "relative" }}>
                  <View style={ft.dialogIconWrap}>
                    <Ionicons name="chatbubble-ellipses" size={19} color={C.gold} />
                  </View>
                  <View style={ft.dialogDotUser} />
                </View>
                <Text style={[ft.tabLabel, { color: C.gold, fontWeight: "900" }]}>
                  Dialog
                </Text>
                {active && <View style={[ft.activeDot, { backgroundColor: C.gold }]} />}
              </Pressable>
            );
          }

          return (
            <React.Fragment key={tab.key}>
              {isEspace && (
                <Pressable style={ft.switchTab} onPress={handleSwitchPress}>
                  <View style={ft.switchIcon}>
                    <Ionicons name="swap-horizontal" size={18} color={C.gold} />
                  </View>
                  <Text style={ft.switchLabel}>Switch</Text>
                </Pressable>
              )}

              <Pressable style={ft.tabBtn} onPress={() => handleTabPress(tab)}>
                <View style={{ position: "relative" }}>
                  {(tab.key === "classement" || tab.key === "stats") && active ? (
                    <View style={[ft.accentIconWrap, { backgroundColor: `${tabAccent(tab.key)}18`, borderColor: `${tabAccent(tab.key)}35` }]}>
                      <Ionicons name={(active ? tab.iconFocused : tab.icon) as any} size={20} color={tabAccent(tab.key)} />
                    </View>
                  ) : (
                    <Ionicons name={(active ? tab.iconFocused : tab.icon) as any} size={24} color={active ? tabAccent(tab.key) : C.muted} />
                  )}

                  {tab.key === "notifs" && notifBadge > 0 && (
                    <View style={ft.notifBadge}>
                      <Text style={ft.notifBadgeTxt}>{notifBadge > 99 ? "99+" : notifBadge}</Text>
                    </View>
                  )}

                  {tab.key === "settings" && updateAvail && (
                    <View style={ft.updateDot} />
                  )}
                </View>

                <Text style={[ft.tabLabel, active && { color: tabAccent(tab.key) }]}>{tab.label}</Text>
                {active && <View style={[ft.activeDot, { backgroundColor: tabAccent(tab.key) }]} />}
              </Pressable>
            </React.Fragment>
          );
        })}
      </ScrollView>

      {/* Modal Switch Supreme */}
      {switchOpen && (
        <View style={sw.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSwitchOpen(false)} />
          <View style={sw.card}>
            <View style={sw.handle} />
            <Text style={sw.title}>Accès Administration</Text>
            <Pressable style={sw.option} onPress={() => { setSwitchOpen(false); router.push("/admin-key" as any); }}>
              <View style={sw.optIcon}><Ionicons name="shield-checkmark" size={22} color={C.gold} /></View>
              <View style={{ flex: 1 }}>
                <Text style={sw.optLabel}>SUPREME Admin</Text>
                <Text style={sw.optSub}>Validation des profils et contenus</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Pressable>
            <View style={sw.divider} />
            <Pressable style={sw.option} onPress={() => { setSwitchOpen(false); router.push("/agent-key" as any); }}>
              <View style={sw.optIcon}><Ionicons name="people" size={22} color={C.gold} /></View>
              <View style={{ flex: 1 }}>
                <Text style={sw.optLabel}>Agent RHAZN</Text>
                <Text style={sw.optSub}>Gestion des dépôts et retraits TAN</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Pressable>
            <Pressable style={sw.cancelBtn} onPress={() => setSwitchOpen(false)}>
              <Text style={sw.cancelTxt}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

/* ==================== STYLES ==================== */

const pm = StyleSheet.create({
  backdrop:        { position: "absolute", bottom: 0, left: 0, right: 0, top: -9999, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end", zIndex: 9999, elevation: 100 },
  sheet:           { backgroundColor: "#0E0E0E", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: -8 }, elevation: 20 },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginBottom: 18 },
  headerRow:       { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  headerIconWrap:  { width: 46, height: 46, borderRadius: 14, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  headerTitle:     { color: "#FFFFFF", fontWeight: "900", fontSize: 17 },
  headerSub:       { color: "rgba(255,255,255,0.50)", fontWeight: "700", fontSize: 12, marginTop: 2 },
  divider:         { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 6 },
  optionRow:       { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
  optionBorder:    { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  optionDisabled:  { opacity: 0.65 },
  optIconWrap:     { width: 50, height: 50, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  optLabelRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  optLabel:        { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  optLabelDisabled:{ color: "rgba(255,255,255,0.50)" },
  optSublabel:     { color: "rgba(255,255,255,0.50)", fontWeight: "700", fontSize: 12 },
  soonBadge:       { backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  soonTxt:         { color: C.orange, fontWeight: "900", fontSize: 9, letterSpacing: 0.5 },
  cancelBtn:       { marginTop: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", paddingVertical: 15, alignItems: "center" },
  cancelTxt:       { color: "rgba(255,255,255,0.50)", fontWeight: "900", fontSize: 15 },
});

const ca = StyleSheet.create({
  overlay:      { position: "absolute", bottom: 0, left: 0, right: 0, top: -9999, backgroundColor: "rgba(0,0,0,0.60)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28, zIndex: 10000, elevation: 110 },
  card:         { backgroundColor: "#0E0E0E", borderRadius: 26, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", padding: 24, alignItems: "center", gap: 10, width: "100%", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 20 },
  iconRing:     { width: 80, height: 80, borderRadius: 40, backgroundColor: C.orangeDim, borderWidth: 1.5, borderColor: C.orangeBorder, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title:        { color: "#FFFFFF", fontWeight: "900", fontSize: 22, letterSpacing: 0.3 },
  msg:          { color: "rgba(255,255,255,0.50)", fontWeight: "600", fontSize: 14, textAlign: "center", lineHeight: 21 },
  divider:      { width: "100%", height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 4 },
  btnRow:       { width: "100%", gap: 10 },
  btnPrimary:   { backgroundColor: C.orange, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnPrimaryTxt:{ color: "#000", fontWeight: "900", fontSize: 15 },
});

const ft = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, minWidth: Dimensions.get("window").width },

  tabBtn: { width: Dimensions.get("window").width / 5, alignItems: "center", justifyContent: "center", paddingVertical: 6, gap: 4, position: "relative" },
  tabLabel:      { color: "rgba(255,255,255,0.50)", fontWeight: "800", fontSize: 10 },
  updateDot:     { position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF3B30", borderWidth: 1.5, borderColor: "#000" },
  notifBadge:    { position: "absolute", top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#FF453A", alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5, borderColor: "#000" },
  notifBadgeTxt: { color: "#FFF", fontWeight: "900", fontSize: 9 },
  activeDot:     { position: "absolute", bottom: 0, width: 4, height: 4, borderRadius: 2 },
  accentIconWrap:{ width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  // ✅ Dialog tab — Apple-like premium
  dialogIconWrap: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  dialogIconUser: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.45)" },
  // Dot vert (user)
  dialogDotUser:  { position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: "#30D158", borderWidth: 1.5, borderColor: "#000" },

  publishWrap:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  publishBtn:   { width: 52, height: 52, borderRadius: 18, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", shadowColor: "#D4AF37", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  publishLabel: { color: "#D4AF37", fontWeight: "900", fontSize: 10 },

  switchTab:   { width: Dimensions.get("window").width / 5, alignItems: "center", justifyContent: "center", paddingVertical: 6, gap: 4 },
  switchIcon:  { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1, borderColor: "rgba(212,175,55,0.35)", alignItems: "center", justifyContent: "center" },
  switchLabel: { color: "#D4AF37", fontWeight: "900", fontSize: 10 },
});

const sw = StyleSheet.create({
  overlay:   { position: "absolute", bottom: 0, left: 0, right: 0, top: -9999, backgroundColor: "rgba(0,0,0,0.60)", justifyContent: "flex-end", zIndex: 10000, elevation: 110 },
  card:      { backgroundColor: "#0E0E0E", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.09)", gap: 10 },
  handle:    { width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginBottom: 10 },
  title:     { color: "#FFF", fontWeight: "900", fontSize: 17, textAlign: "center", marginBottom: 4 },
  option:    { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  optIcon:   { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1, borderColor: "rgba(212,175,55,0.30)", alignItems: "center", justifyContent: "center" },
  optLabel:  { color: "#FFF", fontWeight: "900", fontSize: 15, marginBottom: 2 },
  optSub:    { color: "rgba(255,255,255,0.50)", fontWeight: "600", fontSize: 12 },
  divider:   { height: 1, backgroundColor: "rgba(255,255,255,0.09)" },
  cancelBtn: { marginTop: 4, paddingVertical: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", alignItems: "center" },
  cancelTxt: { color: "rgba(255,255,255,0.55)", fontWeight: "800", fontSize: 15 },
});