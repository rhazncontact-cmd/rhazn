// app/rz-user-dashboard.tsx
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
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
};

export default function RZUserDashboard() {
  const router = useRouter();
  const [notifCount, setNotifCount] = useState(0);
  const [userUid, setUserUid] = useState<string | null>(null);

  const [audience, setAudience] = useState<Audience | null>(null);
  const [commMessages, setCommMessages] = useState<RZComm[]>([]);

  const badgeScale = useSharedValue(1);
  const prevCountRef = useRef(0);

  const commTranslateY = useSharedValue(COMM_HEIGHT);

  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible");
    NavigationBar.setBehaviorAsync("inset-swipe");
  }, []);

  useEffect(() => {
    const resolveAudience = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;

      const { data: agentRow } = await supabase
        .from("agent_applications")
        .select("id, status")
        .eq("user_uid", uid)
        .eq("status", "APPROVED")
        .maybeSingle();

      setAudience(agentRow ? "agents" : "users");
    };

    resolveAudience();
  }, []);

  const loadNotifCount = async (uid: string) => {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_uid", uid)
      .eq("is_read", false);

    setNotifCount(count || 0);
  };

  useEffect(() => {
    if (!audience) return;

    let notifChannel: ReturnType<typeof supabase.channel> | null = null;
    let commChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;

      setUserUid(uid);
      await loadNotifCount(uid);

      notifChannel = supabase
        .channel(`notif-badge-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          (payload) => {
            const n = payload.new as any;
            if (n?.user_uid === uid) loadNotifCount(uid);
          }
        )
        .subscribe();

      const { data: commData } = await supabase
        .from("rz_communication")
        .select("*")
        .eq("is_published", true)
        .in("target_audience", ["all", audience])
        .order("created_at", { ascending: false })
        .limit(20);

      if (commData) setCommMessages(commData as RZComm[]);

      commChannel = supabase
        .channel("rz-communication-feed")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "rz_communication" },
          (payload) => {
            const msg = payload.new as RZComm;
            if (
              msg.is_published &&
              (msg.target_audience === "all" ||
                msg.target_audience === audience)
            ) {
              setCommMessages((prev) => [msg, ...prev.slice(0, 19)]);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (commChannel) supabase.removeChannel(commChannel);
    };
  }, [audience]);

  useEffect(() => {
    if (notifCount > prevCountRef.current && notifCount > 0) {
      badgeScale.value = 1.25;
      badgeScale.value = withSpring(1, { damping: 7, stiffness: 220 });
    }
    prevCountRef.current = notifCount;
  }, [notifCount]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      commTranslateY.value = withSpring(0, { damping: 18 });
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) commTranslateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 120) {
        commTranslateY.value = withSpring(COMM_HEIGHT);
      } else {
        commTranslateY.value = withSpring(0);
      }
    });

  const commStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: commTranslateY.value }],
  }));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />

      {/* CONTENU MENU IDENTIQUE ICI */}

      {/* ✅ BOUTON RZ-COMMUNICATION FLOTTANT (AU-DESSUS BARRE ANDROID) */}
      <GestureDetector gesture={doubleTap}>
        <View style={styles.rzComBottom}>
          <View style={styles.grayBar} />
          <Text style={styles.rzComText}>RZ-Communication</Text>
        </View>
      </GestureDetector>

      {/* ✅ OVERLAY RZ-COMMUNICATION AVEC ESPACEMENT + FLOTTANT */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.commOverlay, commStyle]}>
          <View style={styles.commHandle} />
          <Text style={styles.commTitle}>RZ-Communication</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {commMessages.length === 0 ? (
              <Text style={styles.commEmpty}>
                Aucune communication pour le moment.
              </Text>
            ) : (
              commMessages.map((m) => (
                <View key={m.id} style={styles.commCard}>
                  <Text style={styles.commCardTitle}>{m.title}</Text>
                  <Text style={styles.commCardBody}>{m.body}</Text>
                  <Text style={styles.commCardMeta}>
                    {formatDate(m.created_at)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**************** STYLES ****************/

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // ✅ BOUTON FLOTTANT RZ-COMMUNICATION
  rzComBottom: {
    position: "absolute",
    bottom: 44, // ✅ plus haut que la barre Android
    width: "100%",
    alignItems: "center",
    paddingBottom: 6,
    zIndex: 50,
  },

  grayBar: {
    width: 180,
    height: 4,
    backgroundColor: "#444",
    borderRadius: 10,
    marginBottom: 10, // ✅ 2 espaces vers le bas
  },

  rzComText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  // ✅ PAGE RZ-COMMUNICATION FLOTTANTE
  commOverlay: {
    position: "absolute",
    bottom: 0,
    height: COMM_HEIGHT,
    width: "100%",
    backgroundColor: "#000",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingTop: 34, // ✅ TITRE DESCENDU DE 2 ESPACES
    zIndex: 999,
  },

  commHandle: {
    width: 70,
    height: 5,
    backgroundColor: "#444",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 12, // ✅ ESPACEMENT AUGMENTÉ
  },

  commTitle: {
    color: GOLD,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 18, // ✅ 2 espaces vers le bas
  },

  commEmpty: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },

  commCard: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },

  commCardTitle: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },

  commCardBody: { color: "#ddd", fontSize: 13, lineHeight: 20 },

  commCardMeta: {
    color: "#777",
    fontSize: 11,
    marginTop: 8,
    textAlign: "right",
  },
});
