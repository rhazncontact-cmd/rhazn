// app/banq/index.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* 🍎 RHAZN — Apple-like premium */
const COLORS = {
  bg: "#FFFFFF",
  card: "#F5F6F8",
  cardWhite: "#FFFFFF",
  text: "#0A0A0A",
  gray: "#6B7280",
  muted: "#9CA3AF",
  border: "#E5E7EB",
  gold: "#D4AF37",
  blue: "#e6a501ff",
  dark: "#111827",
};

/* ===========================
   🔒 RÈGLES ÉCO RHAZN (HARD)
=========================== */
type ContentType =
  | "SUSPENTZ"
  | "AUDIO"
  | "VIDEO"
  | "PROFILE"
  | "LYRICS"
  | "IMAGES"
  | "KOZESANS";

const CONSUME_TAN: Record<ContentType, number> = {
  SUSPENTZ: 2,
  AUDIO: 1,
  VIDEO: 3,
  PROFILE: 10,
  LYRICS: 4,
  IMAGES: 5,
  KOZESANS: 7,
};

const CATEGORIES: {
  code: ContentType;
  label: string;
  description: string;
}[] = [
  { code: "SUSPENTZ", label: "SUSPENTZ", description: "Vidéos ≤ 125s • premium • validation CADNA" },
  { code: "AUDIO", label: "Audio", description: "Pistes audio • voix • podcasts • musique" },
  { code: "VIDEO", label: "Vidéo", description: "Vidéos longues • formats immersifs" },
  { code: "PROFILE", label: "Profil", description: "Consulter un profil créateur complet" },
  { code: "LYRICS", label: "Lyrics", description: "Paroles & textes originaux" },
  { code: "IMAGES", label: "Images", description: "Statuts visuels • swipe WhatsApp" },
  { code: "KOZESANS", label: "KozeSans", description: "Messages audio courts • directs" },
];

type Creator = {
  id: string;
  full_name: string;
  sales_count: number;
  avatar_url?: string | null;
};

export default function BanqIndex() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [wallet, setWallet] = useState<{
  tan_balance: number;
  acset_balance?: number;
  paid_contents_count?: number;
} | null>(null);

  const [popularCreators, setPopularCreators] = useState<Creator[]>([]);

  const [notice, setNotice] = useState<{
    title: string;
    message: string;
    actionLabel?: string;
    actionRoute?: string;
  } | null>(null);

  const noticeAnim = useRef(new Animated.Value(0)).current;

  const showNotice = (payload: typeof notice) => {
    setNotice(payload);
    noticeAnim.setValue(0);
    Animated.timing(noticeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const hideNotice = () => {
    Animated.timing(noticeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setNotice(null));
  };

  const loadAll = async () => {
    setLoading(true);

    const { data: creators } = await supabase
  .from("popular_creators")
  .select("id, full_name, sales_count")
  .limit(8);

let creatorsWithAvatar: Creator[] = [];

if (creators?.length) {
  const ids = creators.map((c) => c.id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("uid, avatar_url, full_name")
    .in("uid", ids);

  const map: Record<string, any> = {};
  profiles?.forEach((p) => {
    map[p.uid] = p;
  });

  creatorsWithAvatar = creators.map((c) => ({
    ...c,
    full_name: map[c.id]?.full_name || c.full_name,
    avatar_url: map[c.id]?.avatar_url || null,
  }));
}

    const { data: auth } = await supabase.auth.getUser();

    if (auth?.user) {
      const { data: w } = await supabase
        .from("wallets")
        .select("tan_balance, acset_balance, paid_contents_count")
        .eq("user_id", auth.user.id)
        .single();

      setWallet(w ?? { tan_balance: 0 });
    }

    setPopularCreators(creatorsWithAvatar);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleCategoryPress = (cat: ContentType) => {
    Haptics.selectionAsync().catch(() => {});

    const price = CONSUME_TAN[cat];
    const balance = wallet?.tan_balance ?? 0;

    if (balance < price) {
      showNotice({
        title: "Solde insuffisant",
        message: `Cette section coûte ${price} TAN par consultation.\n\nVotre solde actuel est de ${balance} TAN.\n\nRechargez votre wallet pour continuer à explorer RHAZN.`,
        actionLabel: "Recharger",
        actionRoute: "/user-wallet",
      });
      return;
    }

    switch (cat) {
      case "SUSPENTZ":
        router.push("/banq/suspentz");
        break;
      case "AUDIO":
        router.push("/banq/audio");
        break;
      case "VIDEO":
        router.push("/banq/video");
        break;
      case "PROFILE":
        router.push("/banq/profiles");
        break;
      case "LYRICS":
        router.push("/banq/lyrics");
        break;
      case "IMAGES":
        router.push("/banq/images");
        break;
      case "KOZESANS":
        router.push("/banq/kozesans");
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.boot}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={{ marginTop: 10, color: COLORS.muted, fontWeight: "800" }}>
          Chargement BANQ…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {/* ================= HEADER FLOTTANT ================= */}
      <View style={styles.floatingHeader}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>BANQ</Text>
            <Text style={styles.subtitle}>
              Explorer • soutenir • consommer le mérite
            </Text>
            <View style={styles.walletPill}>
              <Ionicons name="flash-outline" size={14} color={COLORS.gold} />
              <Text style={styles.walletText}>
                Paiement à l’acte • TAN
              </Text>
              <View style={{ marginTop: 6 }}>
  <Text style={{ fontWeight: "900", color: COLORS.blue }}>
    Paiements: {wallet?.paid_contents_count ?? 0}
  </Text>

  <Text style={{ fontWeight: "900", color: COLORS.gold }}>
    ACSET: {Number(wallet?.acset_balance ?? 0).toFixed(2)}
  </Text>
</View>

            </View>

          </View>

          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/rz-logo-trans.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          paddingTop: 170, // 👈 ajusté
          paddingBottom: 110,
        }}
      >
        {/* ================= POPULAR CREATORS ================= */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Créateurs populaires</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {popularCreators.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
  Haptics.selectionAsync().catch(()=>{});

  router.push({
    pathname: "/banq/suspentz-grid",
    params: {
      creatorId: item.id,
      creatorName: item.full_name ?? "Creator"
    }
  });
}}
                style={({ pressed }) => [
                  styles.creatorCard,
                  pressed && { transform: [{ scale: 0.99 }], opacity: 0.98 },
                ]}
              >
                {item.avatar_url ? (
  <Image
    source={{ uri: item.avatar_url }}
    style={{
      width: 48,
      height: 48,
      borderRadius: 999,
      marginBottom: 4,
    }}
  />
) : (
  <Ionicons name="person-circle" size={42} color={COLORS.gold} />
)}
                <Text style={styles.creatorCardName} numberOfLines={1}>
                  {item.full_name}
                </Text>
                <Text style={styles.creatorMeta}>{item.sales_count} ventes</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ================= CATEGORIES ================= */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Univers</Text>

          {CATEGORIES.map((cat) => {
            const price = CONSUME_TAN[cat.code];
            const balance = wallet?.tan_balance ?? 0;
            const blocked = balance < price;

            return (
              <Pressable
                key={cat.code}
                onPress={() => handleCategoryPress(cat.code)}
                style={({ pressed }) => [
                  styles.card,
                  blocked && styles.cardBlocked,
                  pressed && { transform: [{ scale: 0.99 }], opacity: 0.98 },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="layers-outline" size={18} color={COLORS.blue} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{cat.label}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {cat.description}
                    </Text>
                  </View>

                  <View style={styles.pricePill}>
                    <Text style={styles.priceText}>{price} TAN</Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <Text
                    style={[
                      styles.cardAction,
                      { color: blocked ? COLORS.muted : COLORS.blue },
                    ]}
                  >
                    {blocked ? "Solde insuffisant" : "Entrer →"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ================= NOTICE APPLE-LIKE ================= */}
      {notice && (
        <Animated.View
          style={[
            styles.noticeWrap,
            {
              opacity: noticeAnim,
              transform: [
                {
                  translateY: noticeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.noticeCard}>
            <View style={styles.noticeTop}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Pressable onPress={hideNotice} style={styles.noticeClose}>
                <Ionicons name="close" size={18} color={COLORS.gray} />
              </Pressable>
            </View>

            <Text style={styles.noticeMsg}>{notice.message}</Text>

            {!!notice.actionLabel && !!notice.actionRoute && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  hideNotice();
                  setTimeout(() => router.push(notice.actionRoute!), 120);
                }}
                style={({ pressed }) => [
                  styles.noticeBtn,
                  pressed && { transform: [{ scale: 0.99 }], opacity: 0.96 },
                ]}
              >
                <Text style={styles.noticeBtnText}>{notice.actionLabel}</Text>
                <Ionicons name="chevron-forward" size={16} color="#fff" />
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  boot: { flex: 1, justifyContent: "center", alignItems: "center" },

  floatingHeader: {
    position: "absolute",
    top: 40, // 👈 monté de deux espaces
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    zIndex: 100,
    elevation: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 30, fontWeight: "900", color: COLORS.text },
  subtitle: { marginTop: 6, color: COLORS.gray, fontSize: 13 },

  walletPill: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF7E6",
    borderWidth: 1,
    borderColor: "#F5D99D",
    alignSelf: "flex-start",
  },
  walletText: { fontWeight: "900", color: "#9A6B00", fontSize: 13 },

  logoWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.cardWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: 28, height: 28 },

  section: { paddingHorizontal: 20, marginTop: 18 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 12,
  },

  creatorCard: {
    width: 150,
    backgroundColor: COLORS.cardWhite,
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  creatorCardName: {
    marginTop: 6,
    fontWeight: "900",
    fontSize: 13,
    textAlign: "center",
    color: COLORS.text,
  },
  creatorMeta: { color: COLORS.gray, fontSize: 11, marginTop: 4 },

  card: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cardBlocked: {
    opacity: 0.6,
  },

  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  cardTitle: { fontWeight: "900", fontSize: 16, color: COLORS.text },
  cardDesc: { marginTop: 6, color: COLORS.gray, fontSize: 12.5 },
  cardBottom: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardAction: { fontWeight: "900", fontSize: 12 },

  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#D9E6FF",
  },
  priceText: { fontWeight: "900", color: COLORS.blue, fontSize: 12 },

  noticeWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 75,
  },
  noticeCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  noticeTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  noticeDot: { width: 10, height: 10, borderRadius: 99, backgroundColor: COLORS.blue },
  noticeTitle: { flex: 1, fontWeight: "900", color: COLORS.text, fontSize: 14 },
  noticeClose: { padding: 6, borderRadius: 999 },
  noticeMsg: { color: COLORS.gray, fontSize: 13 },

  noticeBtn: {
    marginTop: 12,
    backgroundColor: COLORS.blue,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noticeBtnText: { color: "#fff", fontWeight: "900" },
});
