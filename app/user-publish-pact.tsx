// app/user-publish-pact.tsx
// ✅ FINAL PRO — Aligné 100 % avec la table publication_tariffs (nouvelle logique RHAZN)
// - aucune donnée hardcodée
// - toutes les catégories serveur affichées
// - coût = acset_cost uniquement (ACSET = monnaie de publication)
// - SUPREME = publication gratuite
// - UI premium Apple-like

import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* ================= RHAZN CONST ================= */
const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";

const COLORS = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  text: "#0A0A0A",
  gray: "#6B7280",
  muted: "#9CA3AF",
  border: "#E5E7EB",
  blue: "#007AFF",
  gold: "#D4AF37",
  danger: "#B00020",
};

/* ================= TYPES ================= */
type Category = {
  code: string;        // clé réelle serveur
  acset_cost: number; // coût publication
  active: boolean;
};

/* ================= ICONS ================= */
function iconFor(code: string) {
  switch (code.toUpperCase()) {
    case "SUSPENTZ":
      return { Icon: Ionicons, name: "flash-outline", color: COLORS.blue };
    case "AUDIO":
      return { Icon: Ionicons, name: "mic-outline", color: COLORS.blue };
    case "PACT":
      return { Icon: Ionicons, name: "document-text-outline", color: COLORS.blue };
    case "KOZESANS":
      return { Icon: Ionicons, name: "chatbubble-ellipses-outline", color: COLORS.blue };
    case "IMAGES_PUB":
      return { Icon: Ionicons, name: "image-outline", color: COLORS.blue };
    default:
      return { Icon: MaterialIcons, name: "category", color: COLORS.gray };
  }
}

/* ================= SCREEN ================= */
export default function UserPublishPACT() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [acsetBalance, setAcsetBalance] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [isSupreme, setIsSupreme] = useState(false);

  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  /* ================= LOAD CATEGORIES ================= */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("publication_tariffs")
          .select("code, acset_cost, active")
          .eq("active", true)
          .order("acset_cost", { ascending: true });

        if (error) throw error;

        if (mounted) {
          setCategories((data as Category[]) || []);
          setLoading(false);
        }
      } catch (e) {
        console.error("Publication tariffs load error:", e);
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  /* ================= FETCH BALANCES ================= */
const fetchBalances = async () => {
  try {
    setCreditsLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    const email = (user.email || "").toLowerCase();
    const supreme = email === SUPREME_EMAIL;
    setIsSupreme(supreme);

    // 👑 SUPREME
    if (supreme) {
      setAcsetBalance(Number.MAX_SAFE_INTEGER);
      return;
    }

    // 🔥 SOURCE UNIQUE = TABLE WALLETS
    const { data: w, error } = await supabase
      .from("wallets")
      .select("acset_balance")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.log("wallet error:", error.message);
      setAcsetBalance(0);
    } else {
      setAcsetBalance(Number(w?.acset_balance || 0));
    }

  } finally {
    setCreditsLoading(false);
  }
};

  useEffect(() => {
    fetchBalances();
  }, []);

  /* ================= HANDLER ================= */
  const handlePress = async (item: Category) => {
  // seule SUSPENTZ est active pour le moment
  if (item.code !== "SUSPENTZ") {
    router.push("/user-info-consom");
    return;
  }

  // flow normal SUSPENTZ
  Animated.parallel([
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }),
    Animated.timing(scale, { toValue: 0.985, duration: 160, useNativeDriver: true }),
  ]).start(() => {
    router.push({
      pathname: "/publish/suspentz",
      params: { category: item.code },
    });
    fade.setValue(1);
    scale.setValue(1);
  });
};

  /* ================= UI ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  const displayAcset = isSupreme ? "∞" : String(acsetBalance ?? 0);

  return (
    <Animated.View style={[styles.screen, { opacity: fade, transform: [{ scale }] }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Publier un contenu</Text>

        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <Image
            source={require("../assets/images/rz-logo-trans.png")}
            style={{ width: 36, height: 36 }}
          />

          <View style={styles.creditsBadge}>
            {creditsLoading ? (
              <ActivityIndicator size="small" color={COLORS.gold} />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={14} color={COLORS.gold} />
                <Text style={styles.creditsText}>{displayAcset} ACSET</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(i) => i.code}
        contentContainerStyle={{ padding: 18 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const ic = iconFor(item.code);
          return (
            <Pressable style={styles.card} onPress={() => handlePress(item)}>
              <View style={styles.row}>
                <ic.Icon name={ic.name as any} size={22} color={ic.color} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{item.code}</Text>
                  <Text style={styles.desc}>
                    Coût de publication : {item.acset_cost} ACSET
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </View>
            </Pressable>
          );
        }}
      />
    </Animated.View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: COLORS.muted },

  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.text },

  creditsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  creditsText: { color: COLORS.gold, fontWeight: "900", fontSize: 13 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  label: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  desc: { fontSize: 12.5, color: COLORS.gray, marginTop: 4 },
});
