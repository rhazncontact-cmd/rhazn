// components/AcsetRewardAlert.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────
const ACSET_PER_REWARD = 25;
const TAN_PER_REWARD   = 20;
const SNOOZE_DELAY     = 25_000;
const FOOTER_H         = 95;
const PILL_W           = 214;
const PILL_H           = 62;
const STORAGE_KEY      = "rhazn_acset_pill_pos_v2";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const C = {
  gold:    "#D4AF37",
  goldDim: "rgba(212,175,55,0.12)",
  goldBd:  "rgba(212,175,55,0.30)",
  green:   "#30D158",
};

// ─────────────────────────────────────────────────────────────
// RING
// ─────────────────────────────────────────────────────────────
function AcsetRing({ pct }: { pct: number }) {
  const SIZE = 38, SWR = 3, r = (SIZE - SWR) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={SIZE/2} cy={SIZE/2} r={r} stroke="rgba(212,175,55,0.18)" strokeWidth={SWR} fill="none"/>
      <Circle cx={SIZE/2} cy={SIZE/2} r={r} stroke={C.gold} strokeWidth={SWR} fill="none"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.min(pct, 1))}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────
// PILL DRAGGABLE
// ─────────────────────────────────────────────────────────────
function AcsetProgressPill({
  tanProgress,
  visible,
  onRefresh,
}: {
  tanProgress: number;
  visible: boolean;
  onRefresh: () => void;
}) {
  const DEFAULT_X = SCREEN_W - PILL_W - 14;
  const DEFAULT_Y = SCREEN_H - FOOTER_H - PILL_H - 14;

  const [pos,       setPos]       = useState({ x: DEFAULT_X, y: DEFAULT_Y });
  const [collapsed, setCollapsed] = useState(false);
  const [hidden,    setHidden]    = useState(false);
  const [ready,     setReady]     = useState(false);

  const posRef     = useRef({ x: DEFAULT_X, y: DEFAULT_Y });
  const dragOrigin = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastTapRef = useRef(0);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // Clamp dans les limites de l'écran
  const clamp = (x: number, y: number) => ({
  // ✅ On autorise jusqu'à SCREEN_W (bord droit) pour déclencher le hide
  x: Math.max(0, Math.min(SCREEN_W, x)),
  y: Math.max(60, Math.min(SCREEN_H - FOOTER_H - PILL_H - 4, y)),
});

  // Charger position sauvegardée
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          const c = clamp(saved.x, saved.y);
          posRef.current = c;
          setPos(c);
        } catch {}
      }
      setReady(true);
    });
  }, []);

  // Animation d'apparition
  useEffect(() => {
    if (!ready) return;
    if (visible && tanProgress > 0) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [visible, tanProgress, ready]);

  // PanResponder
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,

    onPanResponderGrant: () => {
      isDragging.current = false;
      dragOrigin.current = { x: posRef.current.x, y: posRef.current.y };
    },

    onPanResponderMove: (_, g) => {
      if (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3) isDragging.current = true;
      const c = clamp(dragOrigin.current.x + g.dx, dragOrigin.current.y + g.dy);
      posRef.current = c;
      setPos(c);
    },

    onPanResponderRelease: (_, g) => {
      isDragging.current = false;

      const finalX = posRef.current.x;
      const finalY = posRef.current.y;

      // ✅ Glissé trop à droite → masquer dans le coin
      if (finalX > SCREEN_W - PILL_W + 20) {
        setHidden(true);
        const hiddenX = SCREEN_W - 30;
        posRef.current = { x: hiddenX, y: finalY };
        setPos({ x: hiddenX, y: finalY });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x: hiddenX, y: finalY }));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        return;
      }

      // Tap court → refresh + double tap collapse
      if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
        const now = Date.now();
        onRefresh();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        if (now - lastTapRef.current < 350) {
          setCollapsed(v => !v);
        }
        lastTapRef.current = now;
      }

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
    },
  })).current;

  if (!ready || !visible || tanProgress <= 0) return null;

  const pct       = tanProgress / TAN_PER_REWARD;
  const remaining = TAN_PER_REWARD - tanProgress;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        pp.pill,
        collapsed && pp.pillCollapsed,
        hidden && pp.pillHidden,
        {
          position:  "absolute",
          left:      pos.x,
          top:       pos.y,
          opacity:   fadeAnim,
          transform: [{ scale: scaleAnim }],
          zIndex:    9996,
        },
      ]}
    >
      {hidden ? (
        // ✅ Petit onglet visible sur le bord droit
        <TouchableOpacity
          style={pp.hiddenTab}
          onPress={() => {
            setHidden(false);
            const newX = SCREEN_W - PILL_W - 14;
            posRef.current = { x: newX, y: pos.y };
            setPos({ x: newX, y: pos.y });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18 }}>💰</Text>
        </TouchableOpacity>
      ) : (
        <>
          {/* Ring */}
          <View style={pp.ringWrap}>
            <AcsetRing pct={pct}/>
            <View style={pp.ringInner}>
              <Text style={pp.ringText}>{Math.round(pct * 100)}%</Text>
            </View>
          </View>

          {/* Texte — masqué si collapsed */}
          {!collapsed && (
            <TouchableOpacity
              style={pp.textArea}
              onPress={() => onRefresh()}
              activeOpacity={0.7}
            >
              <View style={pp.topRow}>
                <Text style={pp.label}>⚡ ACSET</Text>
                <View style={pp.badge}>
                  <Text style={pp.badgeTxt}>+{ACSET_PER_REWARD}</Text>
                </View>
              </View>
              <Text style={pp.tanLine}>
                <Text style={pp.tanNum}>{tanProgress}</Text>
                <Text style={pp.tanOf}>/{TAN_PER_REWARD} TAN</Text>
              </Text>
              <Text style={pp.hint}>encore {remaining} TAN</Text>
            </TouchableOpacity>
          )}

          {/* Handle drag — 3 points verticaux */}
          {!collapsed && (
            <View style={pp.handle}>
              {[0,1,2].map(i => <View key={i} style={pp.handleDot}/>)}
            </View>
          )}
        </>
      )}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES PILL
// ─────────────────────────────────────────────────────────────
const pp = StyleSheet.create({
  pill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               10,
    backgroundColor:   "#0D0D0D",
    borderRadius:      22,
    paddingVertical:   11,
    paddingHorizontal: 13,
    borderWidth:       1.5,
    borderColor:       "rgba(212,175,55,0.35)",
    shadowColor:       "#D4AF37",
    shadowOpacity:     0.25,
    shadowRadius:      12,
    shadowOffset:      { width: 0, height: 4 },
    elevation:         8,
    maxWidth:          PILL_W,
  },
  pillCollapsed: {
    maxWidth:          58,
    paddingHorizontal: 9,
    borderRadius:      29,
  },
  pillHidden: {
    width:             30,
    height:            52,
    borderRadius:      12,
    overflow:          "hidden",
    paddingHorizontal: 0,
    paddingVertical:   0,
  },
  hiddenTab: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "rgba(212,175,55,0.20)",
    borderWidth:     1,
    borderColor:     "rgba(212,175,55,0.40)",
    borderRadius:    12,
  },
  ringWrap:  { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  ringInner: { position: "absolute", alignItems: "center", justifyContent: "center" },
  ringText:  { color: C.gold, fontSize: 8, fontWeight: "900" },
  textArea:  { flex: 1, gap: 1 },
  topRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  label:     { color: "#FFF", fontWeight: "900", fontSize: 12 },
  badge:     { backgroundColor: C.goldDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.goldBd },
  badgeTxt:  { color: C.gold, fontWeight: "900", fontSize: 9 },
  tanLine:   { marginTop: 1 },
  tanNum:    { color: C.gold, fontWeight: "900", fontSize: 13 },
  tanOf:     { color: "rgba(255,255,255,0.40)", fontWeight: "700", fontSize: 11 },
  hint:      { color: "rgba(255,255,255,0.30)", fontSize: 10, fontWeight: "600" },
  handle:    { flexDirection: "column", gap: 3.5, paddingLeft: 2 },
  handleDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.22)" },
});

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export default function AcsetRewardAlert({ hasSession }: { hasSession: boolean }) {
  const [alertVisible, setAlertVisible] = useState(false);
  const [claiming,     setClaiming]     = useState(false);
  const [claimed,      setClaimed]      = useState(false);
  const [pending,      setPending]      = useState(0);
  const [tanProgress,  setTanProgress]  = useState(0);
  const [pillVisible,  setPillVisible]  = useState(false);

  const snoozeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertAnim = useRef(new Animated.Value(0)).current;

  const loadWallet = async () => {
    if (!hasSession) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("wallets")
      .select("tan_spent_for_acset, acset_pending_rewards")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (!data) return;
    const spent    = data.tan_spent_for_acset ?? 0;
    const rewards  = data.acset_pending_rewards ?? 0;
    const progress = spent % TAN_PER_REWARD;
    setTanProgress(progress);
    setPillVisible(progress > 0 || rewards > 0);
    if (rewards > 0) { setPending(rewards); showAlert(); }
  };

  const showAlert = () => {
    setAlertVisible(true);
    setClaimed(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.spring(alertAnim, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }).start();
  };

  const hideAlert = () => {
    Animated.timing(alertAnim, { toValue: 0, duration: 220, useNativeDriver: true })
      .start(() => setAlertVisible(false));
  };

  useEffect(() => {
    if (!hasSession) return;

    loadWallet();

    let ch: ReturnType<typeof supabase.channel> | null = null;
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? "";
      if (!uid || !alive) return;

      ch = supabase
        .channel(`acset-reward-${uid}`)
        .on(
          "postgres_changes",
          {
            event:  "UPDATE",
            schema: "public",
            table:  "wallets",
            filter: `user_id=eq.${uid}`,
          },
          (payload: any) => {
            const spent    = payload.new?.tan_spent_for_acset ?? 0;
            const rewards  = payload.new?.acset_pending_rewards ?? 0;
            const progress = spent % TAN_PER_REWARD;
            setTanProgress(progress);
            setPillVisible(progress > 0 || rewards > 0);
            if (rewards > 0) { setPending(rewards); showAlert(); }
          }
        )
        .subscribe();
    });

    return () => {
      alive = false;
      if (ch) {
        supabase.removeChannel(ch).catch(() => {});
        ch = null;
      }
    };
  }, [hasSession]);

  const handleClaim = async () => {
    if (claiming || claimed) return;
    setClaiming(true);
    try {
      const { error } = await supabase.rpc("claim_acset_reward");
      if (!error) {
        setClaimed(true);
        setTanProgress(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setTimeout(() => { hideAlert(); setPillVisible(false); }, 1800);
      }
    } catch {}
    setClaiming(false);
  };

  const handleLater = () => {
    hideAlert();
    if (snoozeRef.current) clearTimeout(snoozeRef.current);
    snoozeRef.current = setTimeout(() => loadWallet(), SNOOZE_DELAY);
  };

  return (
    <>
      <AcsetProgressPill
        tanProgress={tanProgress}
        visible={pillVisible && !alertVisible}
        onRefresh={loadWallet}
      />

      {alertVisible && (
        <Animated.View style={[s.overlay, {
          opacity: alertAnim,
          transform: [{ scale: alertAnim.interpolate({ inputRange: [0,1], outputRange: [0.85,1] }) }],
        }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleLater}/>
          <View style={s.card}>
            <View style={s.iconRing}>
              <Text style={{ fontSize: 34 }}>⚡</Text>
            </View>
            <Text style={s.title}>Récompense disponible !</Text>
            <Text style={s.subtitle}>
              Vous avez dépensé {TAN_PER_REWARD} TAN.{"\n"}
              Réclamez vos <Text style={s.highlight}>{ACSET_PER_REWARD * pending} ACSET</Text> offerts.
            </Text>
            <View style={s.progressWrap}>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: "100%" }]}/>
              </View>
              <View style={s.progressRow}>
                <Text style={s.progressLabel}>Palier atteint ✓</Text>
                <Text style={s.progressValue}>{TAN_PER_REWARD}/{TAN_PER_REWARD} TAN</Text>
              </View>
            </View>
            <View style={s.infoBadge}>
              <Ionicons name="flash" size={13} color={C.gold}/>
              <Text style={s.infoBadgeTxt}>{pending} récompense{pending > 1 ? "s" : ""} × {ACSET_PER_REWARD} ACSET</Text>
            </View>
            {claimed ? (
              <View style={s.successRow}>
                <Ionicons name="checkmark-circle" size={22} color={C.green}/>
                <Text style={s.successTxt}>{ACSET_PER_REWARD * pending} ACSET ajoutés ! ✅</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={s.claimBtn}
                onPress={handleClaim}
                disabled={claiming}
                activeOpacity={0.85}
              >
                {claiming
                  ? <ActivityIndicator color="#000" size="small"/>
                  : <>
                      <Ionicons name="flash" size={18} color="#000"/>
                      <Text style={s.claimTxt}>Obtenir {ACSET_PER_REWARD * pending} ACSET</Text>
                    </>
                }
              </TouchableOpacity>
            )}
            {!claimed && (
              <TouchableOpacity style={s.laterBtn} onPress={handleLater} activeOpacity={0.75}>
                <Text style={s.laterTxt}>Plus tard</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES MAIN
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay:       { position:"absolute", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(0,0,0,0.65)", justifyContent:"center", alignItems:"center", zIndex:9997, padding:24 },
  card:          { backgroundColor:"#0E0E0E", borderRadius:28, padding:28, width:"100%", alignItems:"center", gap:14, borderWidth:1.5, borderColor:"rgba(212,175,55,0.25)", shadowColor:C.gold, shadowOpacity:0.20, shadowRadius:30, elevation:20 },
  iconRing:      { width:80, height:80, borderRadius:40, backgroundColor:C.goldDim, borderWidth:1.5, borderColor:C.goldBd, alignItems:"center", justifyContent:"center", marginBottom:4 },
  title:         { color:"#FFF", fontSize:22, fontWeight:"900", textAlign:"center" },
  subtitle:      { color:"rgba(255,255,255,0.60)", fontSize:14, fontWeight:"600", textAlign:"center", lineHeight:22 },
  highlight:     { color:C.gold, fontWeight:"900" },
  progressWrap:  { width:"100%", gap:6 },
  progressBg:    { height:6, borderRadius:3, backgroundColor:"rgba(255,255,255,0.08)", overflow:"hidden" },
  progressFill:  { height:"100%", borderRadius:3, backgroundColor:C.gold },
  progressRow:   { flexDirection:"row", justifyContent:"space-between" },
  progressLabel: { color:C.green, fontSize:11, fontWeight:"800" },
  progressValue: { color:C.gold, fontSize:11, fontWeight:"900" },
  infoBadge:     { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:C.goldDim, borderRadius:10, paddingHorizontal:14, paddingVertical:7, borderWidth:1, borderColor:C.goldBd },
  infoBadgeTxt:  { color:C.gold, fontWeight:"800", fontSize:13 },
  claimBtn:      { width:"100%", backgroundColor:C.gold, borderRadius:18, paddingVertical:16, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, marginTop:4, shadowColor:C.gold, shadowOpacity:0.40, shadowRadius:12, elevation:6 },
  claimTxt:      { color:"#000", fontSize:16, fontWeight:"900" },
  laterBtn:      { paddingVertical:6 },
  laterTxt:      { color:"rgba(255,255,255,0.40)", fontSize:13, fontWeight:"700" },
  successRow:    { flexDirection:"row", alignItems:"center", gap:8, paddingVertical:8 },
  successTxt:    { color:C.green, fontWeight:"800", fontSize:15 },
});