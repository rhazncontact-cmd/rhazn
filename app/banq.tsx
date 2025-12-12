import { Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const { height, width } = Dimensions.get("window");

const TAN_PER_SECOND = 1 / 50;
const GOLD = "#D4AF37";
const QOB_DELAY = 10; // 🔥 10 secondes réelles

// ================= VIDEO URL =================
function getVideoUrl(v: any): string {
  if (v.mux_playback_id) return `https://stream.mux.com/${v.mux_playback_id}.m3u8`;
  if (v.cloudflare_uid)
    return `https://videodelivery.net/${v.cloudflare_uid}/manifest/video.m3u8`;
  if (v.video_url?.startsWith("http")) return v.video_url;
  if (v.video_path)
    return supabase.storage
      .from("videos")
      .getPublicUrl(v.video_path).data.publicUrl;
  return "";
}

export default function BanqDuMerite() {
  const router = useRouter();

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [userTan, setUserTan] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const userTanRef = useRef(0);

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState<{ [id: string]: boolean }>({});
  const [perVideoSeconds, setPerVideoSeconds] = useState<{ [id: string]: number }>({});
  const videoRefs = useRef<{ [id: string]: any }>({});

  const [qob, setQob] = useState<{ [id: string]: number }>({});
  const grantedRef = useRef<{ [id: string]: boolean }>({});

  // ================= PREMIUM LOW TAN OVERLAY =================
  const [lowTanVisible, setLowTanVisible] = useState(false);
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const showLowTanOverlay = () => {
    setLowTanVisible(true);
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  };

  const hideLowTanOverlay = () => {
    Animated.timing(overlayAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setLowTanVisible(false));
  };

  // ================= ANDROID BAR =================
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    }
  }, []);

  const showSystemBars = () => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    setTimeout(() => {
      NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    }, 2000);
  };

  // ================= LOAD VIDEOS =================
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("suspentz")
        .select("*")
        .order("created_at", { ascending: false });

      const enriched = (data || []).map((v) => ({
        ...v,
        playbackUrl: getVideoUrl(v),
      }));

      setVideos(enriched);

      const initQ: any = {};
      enriched.forEach((v) => (initQ[v.id] = v.qob ?? 0));
      setQob(initQ);

      setLoading(false);
    };
    load();
  }, []);

  // ================= LOAD USER =================
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return router.replace("/auth/login");

      setCurrentUserId(uid);

      const { data: u } = await supabase
        .from("users")
        .select("tan")
        .eq("uid", uid)
        .single();

      const tan = u?.tan ?? 0;
      setUserTan(tan);
      userTanRef.current = tan;
    };
    loadUser();
  }, []);

  // ================= TIMER + TAN + QOB =================
  useEffect(() => {
    const timer = setInterval(() => {
      const id = videos[current]?.id;
      if (!id || paused[id]) return;

      setPerVideoSeconds((s) => {
        const sec = (s[id] ?? 0) + 1;
        maybeBillFor(id, sec);
        maybeGrantQOB(id, sec);
        return { ...s, [id]: sec };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [current, paused, videos, currentUserId]);

  // ================= TAN BILLING =================
  const maybeBillFor = async (videoId: string, sec: number) => {
    if (!currentUserId) return;

    const tanToBill = sec * TAN_PER_SECOND;

    if (userTanRef.current < tanToBill) {
      const r = videoRefs.current[videoId];
      r?.pauseAsync?.();
      showLowTanOverlay();
      return;
    }

    const newTan = +(userTanRef.current - tanToBill).toFixed(4);
    userTanRef.current = newTan;
    setUserTan(newTan);

    await supabase
      .from("users")
      .update({ tan: newTan })
      .eq("uid", currentUserId);
  };

  // ================= QOB + ABONNEMENT AUTO =================
  const maybeGrantQOB = async (videoId: string, sec: number) => {
    if (!currentUserId) return;
    if (sec < QOB_DELAY) return;
    if (grantedRef.current[videoId]) return;

    grantedRef.current[videoId] = true;

    // 🔥 RPC pour QOB + abonnement auto
    const { error } = await supabase.rpc("grant_qob_and_auto_subscribe", {
      p_user_uid: currentUserId,
      p_suspentz_id: videoId,
    });

    if (!error) {
      setQob((m) => ({ ...m, [videoId]: (m[videoId] ?? 0) + 1 }));
    }
  };

  // ================= PAUSE =================
  const togglePause = (id: string) => {
    setPaused((p) => {
      const next = !p[id];
      const r = videoRefs.current[id];
      next ? r?.pauseAsync?.() : r?.playAsync?.();
      return { ...p, [id]: next };
    });
  };

  // ================= VIDEO ITEM =================
  const renderItem = ({ item, index }: any) => {
    const id = item.id;
    const sec = perVideoSeconds[id] ?? 0;

    return (
      <Pressable style={styles.page} onPress={showSystemBars}>
        <Video
          ref={(r) => (videoRefs.current[id] = r)}
          source={{ uri: item.playbackUrl }}
          style={styles.video}
          resizeMode="cover"
          shouldPlay={index === current && !paused[id]}
          isLooping
        />

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.75)"]}
          style={styles.overlay}
        />

        {/* BARRE DE PROGRESSION */}
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${Math.min((sec / QOB_DELAY) * 100, 100)}%` }]}
          />
        </View>

        {/* INFOS BAS */}
        <View style={styles.bottomRow}>
          <Text style={styles.tanTxt}>TAN : {userTan.toFixed(2)}</Text>

          <TouchableOpacity onPress={() => router.push("/profile")}>
            <Image
              source={require("../assets/images/avatar3.png")}
              style={styles.profileIcon}
            />
          </TouchableOpacity>

          <Text style={styles.qobTxt}>QOB {qob[id] ?? 0}</Text>
        </View>
      </Pressable>
    );
  };

  // ================= RENDER =================
  return (
    <SafeAreaView style={styles.wrap}>
      <StatusBar barStyle="light-content" />

      {/* LOGO HAUT DROIT */}
      <Image
        source={require("../assets/images/logo-rhazn.png")}
        style={styles.logoTop}
      />

      <FlatList
        data={videos}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        keyExtractor={(v) => String(v.id)}
        renderItem={renderItem}
        onMomentumScrollEnd={(e) =>
          setCurrent(Math.round(e.nativeEvent.contentOffset.y / height))
        }
      />

      {/* ================= OVERLAY PREMIUM TAN ================= */}
      {lowTanVisible && (
        <Animated.View
          style={[
            styles.lowTanOverlay,
            {
              opacity: overlayAnim,
              transform: [
                {
                  scale: overlayAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.lowTanBox}>
            <Text style={styles.lowTanTitle}>Solde TAN insuffisant</Text>

            <Text style={styles.lowTanText}>
              Votre solde est épuisé.{"\n\n"}
              Rechargez votre compte auprès d’un agent RHAZN officiel pour
              continuer à visionner.
            </Text>

            <TouchableOpacity
              style={styles.lowTanBtn}
              onPress={() => {
                hideLowTanOverlay();
                router.push("/contact-ed");
              }}
            >
              <Text style={styles.lowTanBtnText}>Contacter un Agent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.lowTanCancel}
              onPress={hideLowTanOverlay}
            >
              <Text style={styles.lowTanCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#000" },
  page: { height, width, backgroundColor: "#000" },
  video: { position: "absolute", width: "100%", height: "100%" },

  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "40%",
  },

  logoTop: {
    position: "absolute",
    top: 20,
    right: 16,
    width: 48,
    height: 48,
    zIndex: 20,
  },

  progressBar: {
    position: "absolute",
    bottom: 6,
    left: 0,
    height: 3,
    width: "100%",
    backgroundColor: "#333",
  },
  progressFill: {
    height: 3,
    backgroundColor: GOLD,
  },

  bottomRow: {
    position: "absolute",
    bottom: 26,
    left: 16,
    flexDirection: "column",
    gap: 6,
  },

  tanTxt: { color: GOLD, fontWeight: "700" },
  qobTxt: { color: GOLD, fontWeight: "700", marginTop: 4 },

  profileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: GOLD,
    marginTop: 6,
  },

  lowTanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  lowTanBox: {
    width: "86%",
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GOLD,
    padding: 22,
    alignItems: "center",
    shadowColor: GOLD,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },

  lowTanTitle: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },

  lowTanText: {
    color: "#ddd",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 22,
  },

  lowTanBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 12,
  },

  lowTanBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 15,
  },

  lowTanCancel: {
    paddingVertical: 8,
  },

  lowTanCancelText: {
    color: "#888",
    fontSize: 13,
  },
});
