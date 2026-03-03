import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import RHAZN_LOGO from "../../assets/images/rhazn-logo.png";
import { supabase } from "../../lib/supabase";

const COLORS = {
  bg: "#000000",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.65)",
  gold: "#D4AF37",
  danger: "#FF453A",
};

const SUSPENTZ_PRICE_TAN = 2;
const ACSET_PER_PAID_CONTENT = 0.08;
const MONTH_UI_GOAL = 100;

type Row = {
  id: string;
  title: string | null;
  media_path: string;
  author_id: string;
  qob_count?: number | null;
};

const makeSessionId = () => `frontend-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// 🔗 Supabase Storage → Public URL base (Android needs absolute https URL)
const SUPABASE_PROJECT_URL = "https://mxxlchaygarszkygmylo.supabase.co";
const SUPABASE_PUBLIC_BUCKET = "suspentz";

/** ✅ Build a SAFE absolute https URL for Android ExoPlayer */
const safeVideoUri = (raw: any): string | null => {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  // Already absolute
  if (
    s.startsWith("https://") ||
    s.startsWith("http://") ||
    s.startsWith("file://")
  ) {
    const fixed = s.startsWith("http://") ? `https://${s.slice(7)}` : s;
    try {
      return encodeURI(fixed);
    } catch {
      return fixed;
    }
  }

  // 🟡 CASE: Supabase Storage relative path → convert to public URL
  // Example stored in DB: "suspentz/abc123.mp4"
  const publicUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${SUPABASE_PUBLIC_BUCKET}/${s}`;

  try {
    return encodeURI(publicUrl);
  } catch {
    return publicUrl;
  }
};

/**
 * ✅ Cycle monthly reset: every 25th (local midnight)
 */
const getCycleStartISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  let cy = y;
  let cm = m;

  if (d < 25) {
    cm = m - 1;
    if (cm < 0) {
      cm = 11;
      cy = y - 1;
    }
  }

  const localStart = new Date(cy, cm, 25, 0, 0, 0);
  return localStart.toISOString();
};

/** ─────────────────────────────────────────────────────────────
 * ACTIVE VIDEO COMPONENT (ONLY MOUNTED FOR ACTIVE ITEM)
 * ANDROID: stable when FlatList clipping is OFF + safe uri
 * ───────────────────────────────────────────────────────────── */
function ActiveSuspentzVideo({
  item,
  height,
  walletTan,
  walletAcset,
  isPaid,
  paidCountMonth,
  acsetEarnedThisMonth,
  monthProgressPct,
  onPaidNow,
}: {
  item: Row;
  height: number;
  walletTan: number;
  walletAcset: number;
  isPaid: boolean;
  paidCountMonth: number;
  acsetEarnedThisMonth: number;
  monthProgressPct: number;
  onPaidNow: (contentId: string) => Promise<void>;
}) {

  const [creatorName, setCreatorName] = useState<string | null>(null);

// Use useEffect to fetch creator's name from Supabase
useEffect(() => {
  const fetchCreatorName = async () => {
    if (!item.author_id) return;
    
    const { data, error } = await supabase
      .from('profiles') // Assuming you store creator's info in the 'profiles' table
      .select('full_name')
      .eq('id', item.author_id)
      .single(); // Fetch a single profile by 'author_id'

    if (error) {
      console.error("Error fetching creator's name:", error.message);
      return;
    }

    setCreatorName(data?.full_name || 'Nom non disponible');
  };

  fetchCreatorName();
}, [item.author_id]);

  const aliveRef = useRef(true);
  const sessionIdRef = useRef<string>(makeSessionId());
  const paidRef = useRef<boolean>(Boolean(isPaid));
  const lastStatusRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [errorSoft, setErrorSoft] = useState<string | null>(null);

  // 👤 FOLLOW STATE
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // 🎬 Progress circle (UI only)
  const [durationSec, setDurationSec] = useState<number>(1);
  const [watchedSec, setWatchedSec] = useState<number>(0);

  // 💎 PREMIUM CONFIRM
  const [showPremiumConfirm, setShowPremiumConfirm] = useState(false);

  const [uiMsg, setUiMsg] = useState<string>("");

  const uri = useMemo(() => safeVideoUri(item.media_path), [item.media_path]);

  // IMPORTANT: player must only be created with a valid uri
  const player = useVideoPlayer(uri ?? "file://invalid", (p) => {
  p.loop = true;
  // ❌ NE JAMAIS assigner p.playing sur Android
});

  const log = (m: string) => {
    console.log("🟡 SUSPENTZ:", m);
    if (aliveRef.current) setUiMsg(m);
  };

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      try {
        player.pause?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    sessionIdRef.current = makeSessionId();
    paidRef.current = Boolean(isPaid);

    setIsPlaying(false);
    setBuffering(false);
    setErrorSoft(null);
    setDurationSec(1);
    setWatchedSec(0);
    setUiMsg("");
    setShowPremiumConfirm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  // ✅ Autoplay if already paid
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      paidRef.current = Boolean(isPaid);

      if (!uri) {
        log("❌ URL vidéo invalide (Android). Vérifie media_path.");
        if (aliveRef.current) setErrorSoft("Vidéo invalide");
        return;
      }

      if (aliveRef.current) {
        setIsPlaying(false);
        setWatchedSec(0);
      }

      if (isPaid) {
        log("✅ Déjà payé → autoplay");

        setTimeout(async () => {
          try {
            await player.play?.();
            if (!cancelled && aliveRef.current) setIsPlaying(true);
          } catch {
            if (!cancelled) log("❌ Autoplay impossible (Android)");
          }
        }, Platform.OS === "android" ? 250 : 0);

        return;
      }

      try {
        await player.pause?.();
      } catch {}
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, isPaid, uri]);

  // 🔁 FOLLOWERS REALTIME + ÉTAT FOLLOW
  useEffect(() => {
    let channel: any;
    let alive = true;

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user?.id) return;

        const { data: f1 } = await supabase.rpc("is_following_creator", {
          p_creator_id: item.author_id,
        });

        if (!alive) return;
        setIsFollowing(Boolean(f1));

        const { data: f2 } = await supabase.rpc("creator_followers_count", {
          p_creator_id: item.author_id,
        });
        if (!alive) return;
        setFollowersCount(Number(f2 ?? 0));

        channel = supabase
          .channel(`creator-follow-${item.author_id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "creator_follows",
              filter: `creator_id=eq.${item.author_id}`,
            },
            async () => {
              const { data } = await supabase.rpc("creator_followers_count", {
                p_creator_id: item.author_id,
              });
              if (!alive) return;
              setFollowersCount(Number(data ?? 0));
            }
          )
          .subscribe();
      } catch (e: any) {
        console.warn("follow realtime error:", e?.message ?? e);
      }
    })();

    return () => {
      alive = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [item.author_id]);

  const payOnceIfNeeded = async (): Promise<boolean> => {
    if (paidRef.current) return true;

    if ((walletTan ?? 0) < SUSPENTZ_PRICE_TAN) {
      log(`❌ TAN insuffisant — TAN=${walletTan}`);
      return false;
    }

    log("💳 Paiement premium…");

    const { data, error } = await supabase.rpc("consume_content_once", {
  p_content_id: item.id,
  p_session_id: sessionIdRef.current,
});

console.log("RPC RESULT =", data);
console.log("RPC ERROR =", error);

if (error) {
  alert(error.message);
  return false;
}

    if (error) {
      log(`❌ Paiement échoué: ${error.message}`);
      return false;
    }

    paidRef.current = true;

    if (aliveRef.current) {
      setShowPremiumConfirm(true);
      setTimeout(() => {
        if (aliveRef.current) setShowPremiumConfirm(false);
      }, 2200);
    }

    log("✅ Paiement validé → autoplay activé");

    await onPaidNow(item.id);

    return true;
  };

  const handleShare = () => {
    const url = `https://rhazn.app/suspentz/${item.id}`;
    const msg = encodeURIComponent(
      `🎬 Découvre ce SUSPENTZ sur RHAZN:\n${item.title ?? "SUSPENTZ"}\n${url}`
    );

    Linking.canOpenURL("whatsapp://send")
      .then((supported) => {
        if (!supported) {
          alert("WhatsApp non installé");
          return;
        }
        Linking.openURL(`whatsapp://send?text=${msg}`);
      })
      .catch(() => {
        alert("Partage impossible");
      });
  };

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setWatchedSec((prev) => {
        const d = Math.max(1, durationSec);
        return Math.min(prev + 1, d);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, durationSec]);

  const progressPct = useMemo(() => {
    const d = Math.max(1, durationSec);
    const pct = Math.floor((watchedSec / d) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [watchedSec, durationSec]);

  const renderProgressCircle = () => {
    const size = 46;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = progressPct / 100;
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <View style={styles.progressWrap}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.gold}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <Text style={styles.progressLabel}>{progressPct}%</Text>
      </View>
    );
  };

  // If uri invalid => never mount VideoView (prevents Android native crash)
  if (!uri) {
    return (
      <View style={[styles.item, { height, backgroundColor: COLORS.bg }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />
        <View style={styles.centerControl} pointerEvents="none">
          <Ionicons name="alert-circle" size={58} color="rgba(255,255,255,0.65)" />
        </View>
        <SafeAreaView style={styles.topBar} pointerEvents="none">
          <Image source={RHAZN_LOGO} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.debugText}>Vidéo invalide</Text>
          <Text style={styles.debugText}>Vérifie media_path (https://...)</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.item, { height }]}>
      <VideoView
  player={player}
  nativeControls={false}   // 🔥 IMPORTANT → enlève play natif
  contentFit="cover"
  style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}
  onPlaybackStatusUpdate={(s: any) => {

          const now = Date.now();
          if (now - lastStatusRef.current < 600) return;
          lastStatusRef.current = now;

          if (!s || !aliveRef.current) return;
          if (typeof s.isLoaded === "boolean" && !s.isLoaded) return;

          if (typeof s.isPlaying === "boolean") setIsPlaying(s.isPlaying);
          if (typeof s.isBuffering === "boolean") setBuffering(s.isBuffering);

          const dms = s.durationMillis ?? s.duration ?? null;
          if (dms && Number.isFinite(dms)) {
            const sec = Math.max(1, Math.floor(Number(dms) / 1000));
            setDurationSec(sec);
          }
        }}
      />

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={async () => {
          if (paidRef.current) {
            if (isPlaying) {
              try {
                await player.pause?.();
              } catch {}
              setIsPlaying(false);
              log("⏸️ Pause");
              return;
            }
            try {
              await player.play?.();
              setIsPlaying(true);
              log("▶️ Lecture");
            } catch {
              log("❌ Impossible de démarrer la lecture");
            }
            return;
          }

          const ok = await payOnceIfNeeded();
          if (!ok) return;

          setTimeout(async () => {
            try {
              await player.play?.();
              setIsPlaying(true);
              log("▶️ Lecture");
            } catch {
              log("❌ Impossible de démarrer la lecture (Android)");
            }
          }, Platform.OS === "android" ? 250 : 0);
        }}
      />

      {!isPlaying && (
  <View style={styles.centerControl} pointerEvents="none">
    <Ionicons
      name={paidRef.current ? "play" : "lock-closed"}
      size={paidRef.current ? 58 : 58}
      color="rgba(255,255,255,0.9)"
    />
  </View>
)}

      <SafeAreaView style={styles.topBar} pointerEvents="none">
        <Image source={RHAZN_LOGO} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.debugText}>TAN: {walletTan}</Text>
        <Text style={styles.debugText}>ACSET: {walletAcset}</Text>
        <Text style={styles.debugText}>
          +{ACSET_PER_PAID_CONTENT} / payé · Cycle: {acsetEarnedThisMonth}
        </Text>
        <Text style={styles.debugText}>
          {paidCountMonth} paiements · {monthProgressPct}%
        </Text>
        {Platform.OS === "ios" && renderProgressCircle()}
        {/* 🔕 UI debug disabled for production */}
      </SafeAreaView>

      <SafeAreaView style={styles.bottom} pointerEvents="box-none">
  {/* 👤 Creator row */}
  <View style={styles.creatorRowCompact}>
    <Ionicons name="person-circle" size={42} color="#fff" />

    <View style={styles.creatorTextBlock}>
      <Text style={styles.creatorName}>
        {creatorName || "Créateur RHAZN"} · {followersCount} abonnés {/* Affichage du nom du créateur ou "Créateur RHAZN" */}
      </Text>

      <Text style={styles.titleCompact}>
        {item.title ?? "SUSPENTZ"}
      </Text>

      <Text style={styles.qobLabel}>
        {item.qob_count ?? 0} QOB
      </Text>
    </View>

    <View style={styles.creatorActions}>
      <Pressable
        onPress={async () => {
          const { data } = await supabase.rpc("toggle_follow_creator", {
            p_creator_id: item.author_id,
          });
          setIsFollowing(Boolean(data));
        }}
        style={[
          styles.followMini,
          isFollowing && {
            backgroundColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            borderColor: COLORS.gold,
          },
        ]}
      >
        <Text style={{ fontWeight: "900", color: isFollowing ? COLORS.gold : "#000" }}>
          {isFollowing ? "Suivi" : "Suivre"}
        </Text>
      </Pressable>

      <Pressable onPress={handleShare} style={styles.shareButtonCompact}>
        <Ionicons name="share-social" size={22} color={COLORS.gold} />
      </Pressable>
    </View>
  </View>
</SafeAreaView>

      {showPremiumConfirm && (
        <View style={styles.premiumOverlay} pointerEvents="none">
          <View style={styles.premiumCard}>
            <Ionicons name="checkmark-circle" size={52} color={COLORS.gold} />
            <Text style={styles.premiumTitle}>Premium activé</Text>
            <Text style={styles.premiumSubtitle}>Ce contenu est maintenant gratuit pour vous</Text>
          </View>
        </View>
      )}

      {buffering && (
        <View style={styles.bufferOverlay} pointerEvents="none">
          <View style={styles.bufferCard}>
            <ActivityIndicator color={COLORS.gold} />
            <Text style={styles.bufferText}>{errorSoft ?? "Chargement…"}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function InactiveSuspentzItem({
  height,
  walletTan,
  isPaid,
}: {
  height: number;
  walletTan: number;
  isPaid: boolean;
}) {
  return (
    <View style={[styles.item, { height, backgroundColor: COLORS.bg }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />
      <View style={styles.centerControl} pointerEvents="none">
        <Ionicons
          name={isPaid ? "play-circle" : "lock-closed"}
          size={isPaid ? 72 : 58}
          color="rgba(255,255,255,0.35)"
        />
      </View>
      <SafeAreaView style={styles.topBar} pointerEvents="none">
        <Image source={RHAZN_LOGO} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.debugText}>TAN: {walletTan}</Text>
      </SafeAreaView>
    </View>
  );
}

export default function BanqSuspentz() {
  const { height } = useWindowDimensions();
  const { focusId } = useLocalSearchParams<{ focusId?: string }>();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  const [showNoTanAlert, setShowNoTanAlert] = useState(false);
  const [noTanMode, setNoTanMode] = useState<"ENTRY" | "INSIDE" | null>(null);

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    return () => {
      NavigationBar.setVisibilityAsync("visible").catch(() => {});
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setAuthReady(Boolean(data?.session?.user?.id));
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setAuthReady(Boolean(session?.user?.id));
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const [walletTan, setWalletTan] = useState<number>(0);
  const [walletAcset, setWalletAcset] = useState<number>(0);
  const [walletReady, setWalletReady] = useState(false);

  const [paidSet, setPaidSet] = useState<Set<string>>(new Set());
  const [paidCountMonth, setPaidCountMonth] = useState<number>(0);

  const cycleStartISO = useMemo(() => getCycleStartISO(), []);

  const refreshWallet = useCallback(async () => {
    if (!authReady) return;

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return;

    const { data: w } = await supabase
      .from("wallets")
      .select("tan_balance, acset_balance")
      .eq("user_id", auth.user.id)
      .single();

    setWalletTan(Number(w?.tan_balance ?? 0));
    setWalletAcset(Number((w as any)?.acset_balance ?? 0));
    setWalletReady(true);
  }, [authReady]);

  const loadPaidSet = useCallback(async () => {
  if (!authReady) return;

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return;

  const { data, error } = await supabase
    .from("user_paid_contents")
    .select("content_id")
    .eq("user_id", uid);

  if (error) {
    console.warn("loadPaidSet error:", error.message);
    return;
  }

  const s = new Set<string>();
  (data ?? []).forEach((r: any) => {
    if (r?.content_id) s.add(String(r.content_id));
  });

  setPaidSet(s);
}, [authReady]);



const loadMonthPaidCount = useCallback(async () => {
  if (!authReady) return;

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return;

  const { data, error } = await supabase
    .from("user_paid_contents")
    .select("id")
    .eq("user_id", uid)
    .gte("created_at", cycleStartISO);

  if (error) {
    console.warn("loadMonthPaidCount error:", error.message);
    return;
  }

  setPaidCountMonth(Array.isArray(data) ? data.length : 0);
}, [authReady, cycleStartISO]);

const acsetEarnedThisMonth = useMemo(() => {
  const v = Number(paidCountMonth ?? 0) * ACSET_PER_PAID_CONTENT;
  return Math.round(v * 100) / 100;
}, [paidCountMonth]);


  const monthProgressPct = useMemo(() => {
    const pct = (Number(paidCountMonth ?? 0) / MONTH_UI_GOAL) * 100;
    return Math.max(0, Math.min(100, Math.floor(pct)));
  }, [paidCountMonth]);

  const onPaidNow = useCallback(
  async (contentId: string) => {
    // ✅ update UI instant (pas attendre reload)
    setPaidSet((prev) => {
      const next = new Set(prev);
      next.add(String(contentId));
      return next;
    });

    // si paiement dans ce cycle, on incrémente direct
    setPaidCountMonth((prev) => prev + 1);

    // ✅ sync DB ensuite
    await Promise.all([refreshWallet(), loadPaidSet(), loadMonthPaidCount()]);
  },
  [refreshWallet, loadPaidSet, loadMonthPaidCount]
);


  useEffect(() => {
    if (loading) return;
    if (!walletReady) return;

    if (walletTan < SUSPENTZ_PRICE_TAN) {
      setNoTanMode("ENTRY");
      setShowNoTanAlert(true);
    } else {
      setShowNoTanAlert(false);
      setNoTanMode(null);
    }
  }, [walletTan, loading, walletReady]);

  useEffect(() => {
    if (!walletReady) return;
    if (walletTan >= SUSPENTZ_PRICE_TAN) return;

    if (rows.length > 0 && !loading) {
      setNoTanMode("INSIDE");
      setShowNoTanAlert(true);
    }
  }, [walletTan, rows.length, loading, walletReady]);

  useEffect(() => {
    if (!authReady) return;

    let channel: any;
    let alive = true;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid || !alive) return;

      await refreshWallet();

      channel = supabase
        .channel("wallet-live-suspentz")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${uid}` },
          (payload) => {
            setWalletTan(Number(payload.new.tan_balance || 0));
            setWalletAcset(Number((payload.new as any).acset_balance || 0));
          }
        )
        .subscribe();
    })();

    return () => {
      alive = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [authReady, refreshWallet]);

  useEffect(() => {
    if (!authReady) return;

    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadPaidSet();
      await loadMonthPaidCount();
    })();
    return () => { mounted = false; };
  }, [authReady, loadPaidSet, loadMonthPaidCount]);

  useEffect(() => {
    if (!authReady) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);

       const { data, error } = await supabase
  .from("store_products")
  .select("id, title, media_path, qob_count, author_id, created_at, category_code")
  .eq("category_code", "SUSPENTZ")
  .eq("is_public", true)   // 🔴 FILTRE CADNA
  .not("media_path", "eq", "")
  .not("media_path", "is", null)
  .order("created_at", { ascending: false })
  .limit(125);

        if (!mounted) return;

        if (error) {
          console.warn("LOAD SUSPENTZ ERROR:", error.message);
          setRows([]);
          return;
        }

        const list = (data as Row[]) ?? [];
        setRows(list);

        if (focusId) {
          const idx = list.findIndex((r) => r.id === focusId);
          if (idx >= 0) setActiveIndex(idx);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [authReady, focusId]);

  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 80 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  if (!authReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={COLORS.gold} />
        <Text style={{ color: COLORS.muted, marginTop: 10, fontWeight: "800" }}>
          Initialisation sécurisée…
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: COLORS.muted }}>Aucun contenu publié pour le moment</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Pressable onPress={() => router.push("/banq/suspentz-grid")} style={styles.searchButton}>
        <Ionicons name="search" size={24} color={COLORS.gold} />
      </Pressable>

      {showNoTanAlert && (
        <View style={styles.noTanOverlay}>
          <View style={styles.noTanCard}>
            <Ionicons name="diamond" size={46} color={COLORS.gold} />
            <Text style={styles.noTanTitle}>
              {noTanMode === "ENTRY" ? "Accès Premium requis" : "Solde TAN insuffisant"}
            </Text>

            <Text style={styles.noTanMsg}>
              {noTanMode === "ENTRY"
                ? "Votre solde TAN est insuffisant pour accéder aux contenus premium RHAZN."
                : "Votre solde TAN ne vous permet plus de continuer la consommation de contenus premium."}
            </Text>

            <View style={styles.noTanBtns}>
              <Pressable
                style={[styles.noTanBtn, styles.noTanPrimary]}
                onPress={() => {
                  setShowNoTanAlert(false);
                  router.push("/user-agent-access");
                }}
              >
                <Text style={styles.noTanPrimaryText}>
                  {noTanMode === "ENTRY" ? "Recharger maintenant" : "Trouver un Agent"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.noTanBtn, styles.noTanSecondary]}
                onPress={() => {
                  setShowNoTanAlert(false);
                  router.push("/banq");
                }}
              >
                <Text style={styles.noTanSecondaryText}>Plus tard</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        decelerationRate="fast"
        snapToAlignment="start"

        // ✅ ANDROID FIX: never clip native video surfaces
        removeClippedSubviews={false}

        // keep these moderate
        windowSize={5}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={80}

        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        renderItem={({ item, index }) => {
          const isActive = index === activeIndex;
          const isPaid = paidSet.has(item.id);

          const canMountPlayer = isPaid || walletTan >= SUSPENTZ_PRICE_TAN;

          if (!authReady || !walletReady || !isActive || !canMountPlayer) {
            return <InactiveSuspentzItem height={height} walletTan={walletTan} isPaid={isPaid} />;
          }

          return (
            <ActiveSuspentzVideo
              item={item}
              height={height}
              walletTan={walletTan}
              isPaid={isPaid}
              onPaidNow={onPaidNow}
              walletAcset={walletAcset}
              paidCountMonth={paidCountMonth}
              acsetEarnedThisMonth={acsetEarnedThisMonth}
              monthProgressPct={monthProgressPct}
            />
          );
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },

  item: { width: "100%", backgroundColor: COLORS.bg },
  centerControl: { position: "absolute", top: "45%", alignSelf: "center" },

  topBar: {
    position: "absolute",
    top: 28,
    right: 16,
    alignItems: "flex-end",
    gap: 6,
  },

  logoImage: { width: 72, height: 18, opacity: 0.95 },

  debugText: {
    color: COLORS.gold,
    fontSize: 11,
    maxWidth: 260,
    textAlign: "right",
    fontWeight: "900",
  },

  progressWrap: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  progressLabel: {
    position: "absolute",
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "900",
  },

  // 🔽 plus compact (avant: 115)
  bottom: { position: "absolute", bottom: 70, left: 16, right: 16 },

  /* ─────────────────────────────
     🎬 CREATOR BLOCK — COMPACT
  ───────────────────────────── */

  creatorRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  creatorTextBlock: {
    flex: 1,
    gap: 2,
  },

  creatorName: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  titleCompact: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },

  qobLabel: {
    marginTop: 2,
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "700",
  },

  creatorActions: {
    alignItems: "center",
    gap: 10,
  },

  followMini: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },

  shareButtonCompact: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  /* ─────────────────────────────
     ⏳ BUFFER / PREMIUM OVERLAYS
  ───────────────────────────── */

  bufferOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  bufferCard: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    gap: 10,
  },
  bufferText: { color: COLORS.white, fontWeight: "800" },

  premiumOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  premiumCard: {
    backgroundColor: "#111",
    borderRadius: 22,
    paddingHorizontal: 26,
    paddingVertical: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  premiumTitle: { color: COLORS.white, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  premiumSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  /* ─────────────────────────────
     🔍 SEARCH BUTTON
  ───────────────────────────── */

  searchButton: {
    position: "absolute",
    top: 46,
    left: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },

  /* ─────────────────────────────
     💎 NO TAN OVERLAY
  ───────────────────────────── */

  noTanOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  noTanCard: {
    backgroundColor: "#111",
    borderRadius: 22,
    paddingHorizontal: 26,
    paddingVertical: 24,
    width: "85%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  noTanTitle: {
    marginTop: 12,
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  noTanMsg: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },
  noTanBtns: {
    marginTop: 18,
    width: "100%",
    gap: 12,
  },
  noTanBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  noTanPrimary: {
    backgroundColor: COLORS.gold,
  },
  noTanPrimaryText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
  },
  noTanSecondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  noTanSecondaryText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
