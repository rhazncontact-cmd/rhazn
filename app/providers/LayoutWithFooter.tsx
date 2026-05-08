/* ================================================================
📱 RHAZN — LAYOUT WITH FOOTER + PUBLISH MENU PREMIUM
✅ RIEN de changé dans la logique existante
✅ Ajout : menu déroulant vers le haut au tap icône "publier"
✅ Apple-like bottom-sheet animé spring
✅ 3 options : Suspentz / Produits / KozeSans (coming soon)
================================================================ */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RhaznFooter from "../../components/RhaznFooter";

// ─────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────
const C = {
  bg:         "#000000",
  card:       "#111111",
  surface:    "#1A1A1A",
  white:      "#FFFFFF",
  muted:      "rgba(255,255,255,0.55)",
  border:     "rgba(255,255,255,0.10)",
  hairline:   "rgba(255,255,255,0.07)",
  gold:       "#D4AF37",
  goldDim:    "rgba(212,175,55,0.12)",
  goldBorder: "rgba(212,175,55,0.28)",
  blue:       "#0A84FF",
  blueDim:    "rgba(10,132,255,0.10)",
  blueBorder: "rgba(10,132,255,0.28)",
  orange:     "#FF9F0A",
  orangeDim:  "rgba(255,159,10,0.10)",
  orangeBorder:"rgba(255,159,10,0.28)",
  purple:     "#BF5AF2",
  purpleDim:  "rgba(191,90,242,0.10)",
  purpleBorder:"rgba(191,90,242,0.28)",
};

// ─────────────────────────────────────────────────────────────
// PUBLISH MENU OPTIONS
// ─────────────────────────────────────────────────────────────
type PublishOption = {
  id:       string;
  label:    string;
  sublabel: string;
  icon:     keyof typeof Ionicons.glyphMap;
  accentColor: string;
  accentDim:   string;
  accentBorder:string;
  route?:  string;
  comingSoon?: boolean;
};

const PUBLISH_OPTIONS: PublishOption[] = [
  {
    id:          "suspentz",
    label:       "Suspentz",
    sublabel:    "Vidéo courte • max 125s • 1 ACSET",
    icon:        "play-circle",
    accentColor: C.gold,
    accentDim:   C.goldDim,
    accentBorder:C.goldBorder,
    route:       "/publish/suspentz",
  },
  {
    id:          "produits",
    label:       "Produits",
    sublabel:    "Boutique RHAZN • max 50 images • 10 ACSET",
    icon:        "bag",
    accentColor: C.blue,
    accentDim:   C.blueDim,
    accentBorder:C.blueBorder,
    route:       "/publish/products",
  },
  {
    id:          "kozesans",
    label:       "KozeSans",
    sublabel:    "Bientôt disponible • Reseau Social",
    icon:        "chatbubble-ellipses",
    accentColor: C.purple,
    accentDim:   C.purpleDim,
    accentBorder:C.purpleBorder,
    comingSoon:  true,
  },
];

// ─────────────────────────────────────────────────────────────
// PUBLISH MENU
// ─────────────────────────────────────────────────────────────
function PublishMenu({
  visible,
  onClose,
  onOptionPress,
}: {
  visible:       boolean;
  onClose:       () => void;
  onOptionPress: (opt: PublishOption) => void;
}) {
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0, damping: 24, stiffness: 240, useNativeDriver: true,
        }),
        Animated.timing(backdropOp, {
          toValue: 1, duration: 200, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 400, duration: 220, useNativeDriver: true,
        }),
        Animated.timing(backdropOp, {
          toValue: 0, duration: 220, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && !backdropOp) return null;

  return (
    <Animated.View
      style={[mn.overlay, { opacity: backdropOp }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Backdrop tap → ferme */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <Animated.View style={[mn.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={mn.handle} />

        {/* Title */}
        <View style={mn.titleRow}>
          <View style={mn.titleIconWrap}>
            <Ionicons name="add-circle" size={20} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mn.title}>Nouvelle publication</Text>
            <Text style={mn.subtitle}>Choisissez le type de contenu</Text>
          </View>
          <Pressable onPress={onClose} style={mn.closeBtn}>
            <Ionicons name="close" size={16} color={C.muted} />
          </Pressable>
        </View>

        <View style={mn.divider} />

        {/* Options */}
        {PUBLISH_OPTIONS.map((opt, idx) => (
          <TouchableOpacity
            key={opt.id}
            style={[
              mn.option,
              opt.comingSoon && mn.optionDimmed,
              idx < PUBLISH_OPTIONS.length - 1 && mn.optionBorder,
            ]}
            onPress={() => onOptionPress(opt)}
            activeOpacity={0.80}
          >
            {/* Icône */}
            <View style={[mn.iconWrap, {
              backgroundColor: opt.accentDim,
              borderColor:     opt.accentBorder,
            }]}>
              <Ionicons name={opt.icon} size={22} color={opt.accentColor} />
            </View>

            {/* Texte */}
            <View style={mn.optionText}>
              <View style={mn.optionLabelRow}>
                <Text style={mn.optionLabel}>{opt.label}</Text>
                {opt.comingSoon && (
                  <View style={mn.comingSoonBadge}>
                    <Text style={mn.comingSoonTxt}>BIENTÔT</Text>
                  </View>
                )}
              </View>
              <Text style={mn.optionSub}>{opt.sublabel}</Text>
            </View>

            {/* Arrow */}
            <Ionicons
              name="chevron-forward"
              size={16}
              color={opt.comingSoon ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.35)"}
            />
          </TouchableOpacity>
        ))}

        {/* Note bas */}
        <View style={mn.footer}>
          <Ionicons name="shield-checkmark-outline" size={13} color={C.muted} />
          <Text style={mn.footerTxt}>
            Toute publication est soumise à validation{" "}
            <Text style={{ color: C.gold, fontWeight: "900" }}>CADNA</Text>
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// COMING SOON ALERT — Apple bottom-sheet style
// ─────────────────────────────────────────────────────────────
function ComingSoonAlert({
  visible,
  option,
  onClose,
}: {
  visible: boolean;
  option:  PublishOption | null;
  onClose: () => void;
}) {
  const translateY = useRef(new Animated.Value(400)).current;
  const op         = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(400);
      op.setValue(0);
    }
  }, [visible]);

  if (!visible || !option) return null;

  return (
    <Animated.View style={[al.overlay, { opacity: op }]} pointerEvents="auto">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={[al.sheet, { transform: [{ translateY }] }]}>
        <View style={al.handle} />

        {/* Icône */}
        <View style={[al.iconRing, {
          backgroundColor: option.accentDim,
          borderColor:     option.accentBorder,
        }]}>
          <Ionicons name={option.icon} size={36} color={option.accentColor} />
        </View>

        <Text style={al.title}>{option.label}</Text>
        <Text style={al.msg}>
          Cette option n'est pas encore disponible.{"\n"}
          Elle est actuellement en préparation et vous serez informé(e) dès son lancement.
        </Text>

        <View style={al.divider} />

        {/* Badge en préparation */}
        <View style={al.prepBadge}>
          <Ionicons name="construct-outline" size={14} color={C.orange} />
          <Text style={al.prepTxt}>En cours de préparation</Text>
        </View>

        <TouchableOpacity style={al.closeBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={al.closeBtnTxt}>Compris</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN LAYOUT — INCHANGÉ sauf ajout du menu et de l'alert
// ─────────────────────────────────────────────────────────────
export default function LayoutWithFooter({
  children,
  enabled,
}: {
  children:  React.ReactNode;
  enabled:   boolean;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [publishMenuOpen,   setPublishMenuOpen]   = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [comingSoonOption,  setComingSoonOption]  = useState<PublishOption | null>(null);

  const handlePublishPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPublishMenuOpen(true);
  };

  const handleOptionPress = (opt: PublishOption) => {
    Haptics.selectionAsync().catch(() => {});

    if (opt.comingSoon) {
      setPublishMenuOpen(false);
      // Petit délai pour que le menu se ferme avant d'ouvrir l'alert
      setTimeout(() => {
        setComingSoonOption(opt);
        setComingSoonVisible(true);
      }, 260);
      return;
    }

    setPublishMenuOpen(false);
    if (opt.route) {
      setTimeout(() => router.push(opt.route as any), 200);
    }
  };

  return (
    <View style={styles.container}>

      {/* =========================
          PAGE CONTENT — INCHANGÉ
      ========================== */}
      <View style={styles.content}>
        {children}
      </View>

      {/* =========================
          GLOBAL FOOTER — INCHANGÉ
          + prop onPublishPress injectée
      ========================== */}
      {enabled && (
        <View
          style={[
            styles.footerWrapper,
            { bottom: 0 },
          ]}
        >
          <RhaznFooter onPublishPress={handlePublishPress} />
        </View>
      )}

      {/* =========================
          PUBLISH MENU (overlay)
      ========================== */}
      <PublishMenu
        visible={publishMenuOpen}
        onClose={() => setPublishMenuOpen(false)}
        onOptionPress={handleOptionPress}
      />

      {/* =========================
          COMING SOON ALERT
      ========================== */}
      <ComingSoonAlert
        visible={comingSoonVisible}
        option={comingSoonOption}
        onClose={() => setComingSoonVisible(false)}
      />

    </View>
  );
}

/* ==================== STYLES ==================== */

/* Menu */
const mn = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.60)",
    justifyContent:  "flex-end",
    zIndex:          8000,
    elevation:       80,
  },
  sheet: {
    backgroundColor:    "#0E0E0E",
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop:        10,
    paddingBottom:     36,
    borderTopWidth:    1,
    borderTopColor:    "rgba(255,255,255,0.08)",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignSelf: "center", marginBottom: 18,
  },
  titleRow: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14,
  },
  titleIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBorder,
    alignItems: "center", justifyContent: "center",
  },
  title:    { color: C.white,  fontWeight: "900", fontSize: 16 },
  subtitle: { color: C.muted,  fontWeight: "700", fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 4 },

  option: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14,
  },
  optionBorder: {
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  optionDimmed: { opacity: 0.62 },
  iconWrap: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  optionText:     { flex: 1 },
  optionLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  optionLabel:    { color: C.white, fontWeight: "900", fontSize: 15 },
  optionSub:      { color: C.muted, fontWeight: "700", fontSize: 12, marginTop: 3 },
  comingSoonBadge:{
    backgroundColor: C.purpleDim, borderWidth: 1, borderColor: C.purpleBorder,
    borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2,
  },
  comingSoonTxt: { color: C.purple, fontWeight: "900", fontSize: 9, letterSpacing: 0.5 },

  footer: {
    flexDirection: "row", alignItems: "center", gap: 7,
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)",
  },
  footerTxt: { color: C.muted, fontWeight: "700", fontSize: 12 },
});

/* Alert Coming Soon */
const al = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent:  "flex-end",
    zIndex:          9000,
    elevation:       90,
  },
  sheet: {
    backgroundColor:    "#0E0E0E",
    borderTopLeftRadius:  30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 12, paddingBottom: 44,
    alignItems: "center", gap: 10,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)",
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.20)", marginBottom: 14,
  },
  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, marginBottom: 6,
  },
  title: { color: C.white,  fontWeight: "900", fontSize: 20, textAlign: "center" },
  msg:   { color: C.muted,  fontWeight: "600", fontSize: 14, textAlign: "center", lineHeight: 21 },
  divider: { width: "100%", height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 6 },
  prepBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  prepTxt: { color: C.orange, fontWeight: "800", fontSize: 13 },
  closeBtn: {
    width: "100%", backgroundColor: C.gold, borderRadius: 16,
    paddingVertical: 15, alignItems: "center", justifyContent: "center", marginTop: 6,
    shadowColor: C.gold, shadowOpacity: 0.28, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  closeBtnTxt: { color: "#000", fontWeight: "900", fontSize: 15 },
});

/* Layout — INCHANGÉ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
  },
  footerWrapper: {
    position:   "absolute",
    left:       0,
    right:      0,
    paddingTop: 6,
    backgroundColor:   "#000",
    borderTopWidth:    0.5,
    borderTopColor:    "#222",
    elevation:         30,
    shadowColor:       "#000",
    shadowOpacity:     0.3,
    shadowRadius:      10,
    shadowOffset:      { width: 0, height: -4 },
  },
});