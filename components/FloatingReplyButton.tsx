// components/FloatingReplyButton.tsx
// ✅ Bouton flottant "Répondre" — couleur RHAZN or
// ✅ Draggable + cliquable (PanResponder séparé du tap)
// ✅ Apple-like premium

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const { width: SW, height: SH } = Dimensions.get("window");
const BTN_SIZE = 58;
const MARGIN   = 16;

export default function FloatingReplyButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState(0);

  // Position initiale — bas droit au-dessus du footer
  const initX = SW - BTN_SIZE - MARGIN;
  const initY = SH - BTN_SIZE - 100 - insets.bottom;

  const posRef = useRef({ x: initX, y: initY });
  const panX   = useRef(new Animated.Value(initX)).current;
  const panY   = useRef(new Animated.Value(initY)).current;

  // ✅ Flag pour distinguer drag vs tap
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // ── Vérifier si admin ──
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("support_admins").select("user_uid")
        .eq("user_uid", uid).maybeSingle();
      if (!data) return;
      setIsAdmin(true);
      const { count } = await supabase
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_role", "USER").eq("is_read", false);
      setPending(count ?? 0);
    })();
  }, []);

  // ── Realtime compteur ──
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("floating-reply-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" },
        (payload: any) => {
          if (payload.new?.sender_role === "USER") {
            setPending(prev => prev + 1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_messages" },
        async () => {
          const { count } = await supabase
            .from("support_messages")
            .select("id", { count: "exact", head: true })
            .eq("sender_role", "USER").eq("is_read", false);
          setPending(count ?? 0);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  // ── PanResponder — drag précis avec détection tap ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,

      onPanResponderGrant: (_, g) => {
        isDragging.current = false;
        dragStartPos.current = { x: g.x0, y: g.y0 };
      },

      onPanResponderMove: (_, g) => {
        // Déclarer drag si mouvement > 8px
        if (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8) {
          isDragging.current = true;
        }
        if (!isDragging.current) return;

        const newX = Math.max(MARGIN, Math.min(posRef.current.x + g.dx, SW - BTN_SIZE - MARGIN));
        const newY = Math.max(insets.top + MARGIN, Math.min(posRef.current.y + g.dy, SH - BTN_SIZE - 90 - insets.bottom));
        panX.setValue(newX);
        panY.setValue(newY);
      },

      onPanResponderRelease: (_, g) => {
        if (!isDragging.current) {
          // ✅ C'est un TAP — naviguer
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          setPending(0);
          router.push("/rz-admin-support" as any);
          return;
        }

        // ✅ C'est un DRAG — snap au bord
        const newX = Math.max(MARGIN, Math.min(posRef.current.x + g.dx, SW - BTN_SIZE - MARGIN));
        const newY = Math.max(insets.top + MARGIN, Math.min(posRef.current.y + g.dy, SH - BTN_SIZE - 90 - insets.bottom));

        // Snap gauche ou droite
        const snapX = newX + BTN_SIZE / 2 < SW / 2 ? MARGIN : SW - BTN_SIZE - MARGIN;

        Animated.spring(panX, { toValue: snapX, damping: 22, stiffness: 220, useNativeDriver: false }).start();
        Animated.spring(panY, { toValue: newY,  damping: 22, stiffness: 220, useNativeDriver: false }).start();

        posRef.current = { x: snapX, y: newY };
        isDragging.current = false;
      },
    })
  ).current;

  if (!isAdmin) return null;

  return (
    <Animated.View
      style={[s.container, { left: panX, top: panY }]}
      {...panResponder.panHandlers}
    >
      {/* Bouton principal */}
      <View style={s.btn}>
        <Ionicons name="chatbubbles" size={22} color="#000" />

        {/* Compteur non-lus */}
        {pending > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{pending > 99 ? "99+" : pending}</Text>
          </View>
        )}
      </View>

      {/* Label */}
      <View style={s.labelWrap}>
        <Text style={s.labelTxt}>Répondre</Text>
      </View>
    </Animated.View>
  );
}

const GOLD = "#D4AF37";

const s = StyleSheet.create({
  container: {
    position:  "absolute",
    zIndex:    9998,
    elevation: 99,
    alignItems: "center",
    gap: 4,
  },
  btn: {
    width:           BTN_SIZE,
    height:          BTN_SIZE,
    borderRadius:    BTN_SIZE / 2,
    backgroundColor: GOLD,
    alignItems:      "center",
    justifyContent:  "center",
    shadowColor:     GOLD,
    shadowOpacity:   0.50,
    shadowRadius:    14,
    shadowOffset:    { width: 0, height: 5 },
    elevation:       10,
    borderWidth:     2,
    borderColor:     "rgba(255,255,255,0.25)",
  },
  badge: {
    position:         "absolute",
    top:              -4,
    right:            -4,
    minWidth:         20,
    height:           20,
    borderRadius:     10,
    backgroundColor:  "#FF3B30",
    alignItems:       "center",
    justifyContent:   "center",
    paddingHorizontal: 4,
    borderWidth:      2,
    borderColor:      "#FFFFFF",
  },
  badgeTxt: {
    color:      "#FFF",
    fontWeight: "900",
    fontSize:   10,
  },
  labelWrap: {
    backgroundColor:   "rgba(0,0,0,0.72)",
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       "rgba(212,175,55,0.35)",
  },
  labelTxt: {
    color:        GOLD,
    fontWeight:   "900",
    fontSize:     10,
    letterSpacing: 0.3,
  },
});