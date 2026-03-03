import { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COMM_HEIGHT = SCREEN_HEIGHT;

type Audience = "agents" | "users";

type RZComm = {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "alert";
  deep_link_route: string | null;
  target_audience: "all" | "agents" | "users";
  created_at: string;
  is_published?: boolean;
};

export default function RZBottomSheet() {
  const [audience, setAudience] = useState<Audience>("users");
  const [messages, setMessages] = useState<RZComm[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // ✅ translateY : fermé = hors écran, ouvert = 0
  const translateY = useSharedValue(COMM_HEIGHT);

  // ---------- Helpers ----------
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ---------- Resolve audience ----------
  useEffect(() => {
    const resolveAudience = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;

      const { data: agentRow } = await supabase
        .from("agent_applications")
        .select("id")
        .eq("user_uid", uid)
        .eq("status", "APPROVED")
        .maybeSingle();

      setAudience(agentRow ? "agents" : "users");
    };

    resolveAudience();
  }, []);

  // ---------- Load + realtime ----------
  useEffect(() => {
    let commChannel: any = null;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("rz_communication")
        .select("*")
        .eq("is_published", true)
        .in("target_audience", ["all", audience])
        .order("created_at", { ascending: false })
        .limit(20);

      if (!cancelled && data) setMessages(data as RZComm[]);
    };

    load();

    commChannel = supabase
      .channel("rz-communication-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rz_communication" },
        (payload) => {
          const msg = payload.new as RZComm;
          if (
            msg.is_published &&
            (msg.target_audience === "all" || msg.target_audience === audience)
          ) {
            setMessages((prev) => [msg, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (commChannel) supabase.removeChannel(commChannel);
    };
  }, [audience]);

  // ---------- Open/Close (SAFE ANDROID) ----------
  const open = () => {
    if (isOpen) return;
    setIsOpen(true);
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
  };

  const close = () => {
    if (!isOpen) return;
    translateY.value = withSpring(COMM_HEIGHT, { damping: 18, stiffness: 200 });
    // ✅ IMPORTANT : on désactive les gestes après la fermeture (anti crash)
    setTimeout(() => setIsOpen(false), 320);
  };

  // ---------- Gestures ----------
  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          runOnJS(open)();
        }),
    [isOpen]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isOpen) // ✅ CRUCIAL : gestes OFF quand fermé
        .onUpdate((e) => {
          if (e.translationY > 0) translateY.value = e.translationY;
        })
        .onEnd((e) => {
          if (e.translationY > 120) runOnJS(close)();
          else translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        }),
    [isOpen]
  );

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <>
      {/* ✅ Bouton flottant (même position partout) */}
      <GestureDetector gesture={doubleTap}>
        <TouchableOpacity activeOpacity={0.85} style={styles.floatingBtn} onPress={open}>
          <View style={styles.floatingHandle} />
          <Text style={styles.floatingLabel}>RZ-Communication</Text>
        </TouchableOpacity>
      </GestureDetector>

      {/* ✅ Panneau (full screen) */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity onPress={close} activeOpacity={0.85} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>RZ-Communication</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <Text style={styles.empty}>Aucune communication pour le moment.</Text>
            ) : (
              messages.map((m) => (
                <View key={m.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{m.title}</Text>
                  <Text style={styles.cardBody}>{m.body}</Text>
                  <Text style={styles.cardMeta}>{formatDate(m.created_at)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  // ✅ même position / même hauteur / même UI partout
  floatingBtn: {
    position: "absolute",
    bottom: 24, // ✅ référence
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    paddingBottom: 8,
  },
  floatingHandle: {
    width: 160,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    marginBottom: 6,
  },
  floatingLabel: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.7,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowRadius: 6,
  },

  overlay: {
    position: "absolute",
    bottom: 0,
    height: COMM_HEIGHT,
    width: "100%",
    backgroundColor: "#000",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingTop: 14,
    zIndex: 9998,
    elevation: 14,
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },

  handleRow: {
    height: 30,
    justifyContent: "center",
  },
  handle: {
    width: 70,
    height: 5,
    backgroundColor: "#444",
    borderRadius: 10,
    alignSelf: "center",
  },
  closeBtn: {
    position: "absolute",
    right: 6,
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },
  closeText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "900",
  },

  title: {
    color: GOLD,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  empty: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },
  cardTitle: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardBody: { color: "#ddd", fontSize: 13, lineHeight: 20 },
  cardMeta: { color: "#777", fontSize: 11, marginTop: 8, textAlign: "right" },
});
