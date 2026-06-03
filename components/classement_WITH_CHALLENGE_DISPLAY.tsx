// app/classement.tsx — VERSION AVEC LOGS DÉTAILLÉS

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChallengeHistory from "../components/ChallengeHistory";
import HeroTop25 from "../components/HeroTop25";
import TimeSearchBar from "../components/TimeSearchBar";
import { supabase } from "../lib/supabase";

const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#0A0A0A",
  sub: "#6E6E73",
  muted: "#AEAEB2",
  border: "#E5E5EA",
  gold: "#D4AF37",
  blue: "#007AFF",
  green: "#34C759",
  red: "#FF3B30",
};

type Challenge = {
  id: string;
  name: string;
  status: "draft" | "active" | "closed";
  category_filter: string;
  rank_mode: string;
  start_date: string;
  end_date: string;
};

export default function ClassementScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [snapshotRanking, setSnapshotRanking] = useState<any[]>([]);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [minDate, setMinDate] = useState(new Date());
  const [maxDate, setMaxDate] = useState(new Date());
  const [showChallengeHistory, setShowChallengeHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ CHALLENGE EN COURS
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // ── Load active challenge ──
  const loadActiveChallenge = useCallback(async () => {
    console.log("════════════════════════════════════════");
    console.log("🎬 START: loadActiveChallenge()");
    console.log("════════════════════════════════════════");
    
    setLoadingChallenge(true);
    setDebugInfo("Chargement des challenges...");
    
    try {
      // LOG 1
      console.log("📡 STEP 1: Appel RPC rz_get_challenges");
      const { data, error } = await supabase.rpc("rz_get_challenges");
      
      // LOG 2
      console.log("📡 STEP 2: Réponse reçue");
      console.log("   error:", error);
      console.log("   data:", data);
      console.log("   data length:", data?.length);
      
      if (error) {
        console.error("❌ RPC ERROR DETAILS:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        setDebugInfo(`❌ RPC Error: ${error.message}`);
        setActiveChallenge(null);
        return;
      }

      if (!data) {
        console.warn("⚠️ data est null ou undefined");
        setDebugInfo("⚠️ Pas de données retournées");
        setActiveChallenge(null);
        return;
      }

      // LOG 3
      console.log("✅ DATA REÇUE:");
      console.log("   Type:", typeof data);
      console.log("   Length:", data.length);
      console.log("   Contenu complet:", JSON.stringify(data, null, 2));

      if (!Array.isArray(data)) {
        console.warn("⚠️ data n'est pas un array!");
        setDebugInfo("⚠️ data n'est pas un array");
        setActiveChallenge(null);
        return;
      }

      // LOG 4
      console.log("🔍 STEP 3: Recherche challenge avec status='active'");
      data.forEach((ch, idx) => {
        console.log(`   [${idx}] name="${ch.name}" | status="${ch.status}" | category="${ch.category_filter}"`);
      });

      const active = data.find((ch: Challenge) => ch.status === "active");
      
      // LOG 5
      if (active) {
        console.log("✅ CHALLENGE ACTIF TROUVÉ:");
        console.log("   id:", active.id);
        console.log("   name:", active.name);
        console.log("   status:", active.status);
        console.log("   category_filter:", active.category_filter);
        console.log("   start_date:", active.start_date);
        console.log("   end_date:", active.end_date);
        setDebugInfo(`✅ Challenge trouvé: ${active.name}`);
      } else {
        console.warn("⚠️ Aucun challenge avec status='active' trouvé");
        console.log("   Total challenges reçus:", data.length);
        data.forEach((ch) => console.log(`     - ${ch.name}: ${ch.status}`));
        setDebugInfo("⚠️ Aucun challenge actif");
      }

      setActiveChallenge(active || null);
      
    } catch (e) {
      console.error("❌ EXCEPTION LANCÉE:");
      console.error("   Type:", typeof e);
      console.error("   Message:", (e as any)?.message);
      console.error("   Stack:", (e as any)?.stack);
      setDebugInfo(`❌ Exception: ${(e as any)?.message}`);
      setActiveChallenge(null);
    } finally {
      setLoadingChallenge(false);
      console.log("════════════════════════════════════════");
      console.log("✅ END: loadActiveChallenge()");
      console.log("════════════════════════════════════════");
    }
  }, []);

  useEffect(() => {
    console.log("🔄 useEffect: Montage du composant");
    loadActiveChallenge();
    
    const interval = setInterval(() => {
      console.log("🔄 Refresh auto (30s)");
      loadActiveChallenge();
    }, 30000);
    
    return () => {
      console.log("🔄 useEffect cleanup: Démontage");
      clearInterval(interval);
    };
  }, [loadActiveChallenge]);

  // ── Handle Archive button with HAPTIC + ALERTE INTELLIGENTE ──
  const handleArchivePress = useCallback(async () => {
    console.log("📌 Archive button pressed");
    console.log("   activeChallenge:", activeChallenge);
    
    try {
      if (Platform.OS === "ios") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
      } else {
        Vibration.vibrate([0, 10, 5, 10]);
      }
    } catch (e) {
      console.warn("Haptic error:", e);
    }

    if (!activeChallenge) {
      Alert.alert(
        "Aucun Challenge Actif",
        "Il n'y a actuellement aucun challenge en cours. Les challenges terminés apparaîtront dans l'historique.",
        [{ text: "OK", style: "default" }],
        { cancelable: true }
      );
    } else {
      Alert.alert(
        "Challenge en Cours",
        `🏆 "${activeChallenge.name}"\n\n📂 Catégorie: ${activeChallenge.category_filter}\n\nLe challenge se termine bientôt.`,
        [
          { text: "Voir l'historique", style: "default", onPress: () => setShowChallengeHistory(true) },
          { text: "OK", style: "cancel" }
        ],
        { cancelable: true }
      );
    }
  }, [activeChallenge]);

  // ── Render Challenge Info ──
  const renderChallengeInfo = () => {
    console.log("🎨 renderChallengeInfo() called");
    console.log("   activeChallenge:", activeChallenge);
    
    if (!activeChallenge) {
      console.log("   → Returning null (no challenge)");
      return null;
    }

    console.log("   → Rendering challenge card");

    const getCategoryColor = (cat: string) => {
      const categoryMap: Record<string, string> = {
        SUSPENTZ: C.blue,
        PRODUCTS: "#FF9500",
        AUDIO: "#AF52DE",
        VIDEO: C.red,
        KOZESANS: "#32ADE6",
        TEXT: C.green,
        IMAGES: C.gold,
      };
      return categoryMap[cat] || C.gold;
    };

    const getCategoryIcon = (cat: string) => {
      const categoryMap: Record<string, string> = {
        SUSPENTZ: "play-circle-outline",
        PRODUCTS: "cube-outline",
        AUDIO: "musical-notes-outline",
        VIDEO: "videocam-outline",
        KOZESANS: "mic-outline",
        TEXT: "document-text-outline",
        IMAGES: "images-outline",
      };
      return categoryMap[cat] || "pricetag-outline";
    };

    const catColor = getCategoryColor(activeChallenge.category_filter);
    const catIcon = getCategoryIcon(activeChallenge.category_filter);

    return (
      <View style={styles.challengeContainer}>
        <View style={styles.challengeHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="flame" size={16} color={C.red} />
            <Text style={styles.challengeTitle}>Challenge en cours</Text>
            <Ionicons name="play-circle" size={12} color={C.green} />
          </View>
        </View>

        <Text style={styles.challengeName}>{activeChallenge.name}</Text>

        {/* Catégorie pilule */}
        <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
          <View style={[styles.categoryTag, { backgroundColor: catColor + "15", borderColor: catColor }]}>
            <Ionicons name={catIcon as any} size={12} color={catColor} />
            <Text style={[styles.categoryTagText, { color: catColor }]}>
              {activeChallenge.category_filter}
            </Text>
          </View>
        </View>

        {/* Dates */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
            <Ionicons name="calendar-outline" size={12} color={C.gold} />
            <Text style={{ color: C.sub, fontWeight: "600", fontSize: 11 }}>
              {new Date(activeChallenge.start_date).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={12} color={C.border} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
            <Ionicons name="calendar-outline" size={12} color={C.gold} />
            <Text style={{ color: C.sub, fontWeight: "600", fontSize: 11 }}>
              {new Date(activeChallenge.end_date).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Classement</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* DEBUG INFO */}
      {debugInfo && (
        <View style={{ backgroundColor: "#f0f0f0", padding: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 8 }}>
          <Text style={{ color: "#333", fontSize: 12, fontWeight: "600" }}>🐛 DEBUG:</Text>
          <Text style={{ color: "#666", fontSize: 11, marginTop: 4 }}>{debugInfo}</Text>
        </View>
      )}

      {/* ✅ CHALLENGE INFO */}
      {loadingChallenge ? (
        <View style={{ paddingVertical: 12, alignItems: "center" }}>
          <ActivityIndicator size={16} color={C.gold} />
          <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Chargement...</Text>
        </View>
      ) : (
        renderChallengeInfo()
      )}

      {/* TimeSearchBar */}
      <TimeSearchBar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

      {/* Main ranking list */}
      <FlatList
        data={snapshotRanking}
        keyExtractor={(item, idx) => `${item.user_id}-${idx}`}
        renderItem={({ item, index }) => (
          <View style={styles.rankingRow}>
            <Text style={styles.rankText}>{index + 26}</Text>
            <Text style={styles.creatorName}>{item.creator_pseudo || "Anonyme"}</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{item.total_qob || 0}</Text>
                <Text style={styles.statLabel}>QOB</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{item.total_tan || 0}</Text>
                <Text style={styles.statLabel}>TAN</Text>
              </View>
            </View>
          </View>
        )}
        ListHeaderComponent={() => (
          <>
            {isLoadingSnapshot ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <ActivityIndicator color={C.gold} />
              </View>
            ) : (
              <>
                {snapshotRanking && snapshotRanking.length > 0 && (
                  <View style={styles.heroSection}>
                    <HeroTop25 data={snapshotRanking.slice(0, 25)} />
                  </View>
                )}
              </>
            )}
          </>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        scrollIndicatorInsets={{ right: 1 }}
      />

      {/* ✅ ARCHIVE BUTTON */}
      <TouchableOpacity
        style={styles.archiveBtn}
        onPress={handleArchivePress}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar" size={18} color={C.text} />
        <Text style={styles.archiveBtnText}>Historique</Text>
      </TouchableOpacity>

      {/* Challenge History Modal */}
      {showChallengeHistory && (
        <ChallengeHistory
          visible={showChallengeHistory}
          onClose={() => setShowChallengeHistory(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { color: C.text, fontWeight: "900", fontSize: 18 },
  backBtn: { width: 24, height: 24, justifyContent: "center" },

  challengeContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gold,
    borderLeftWidth: 4,
    borderLeftColor: C.gold,
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeTitle: {
    color: C.gold,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  challengeName: {
    color: C.text,
    fontWeight: "900",
    fontSize: 16,
    marginTop: 8,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  categoryTagText: {
    fontWeight: "700",
    fontSize: 11,
  },

  heroSection: { paddingVertical: 8 },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  rankText: { color: C.muted, fontWeight: "700", fontSize: 13, width: 30 },
  creatorName: { color: C.text, fontWeight: "700", fontSize: 14, flex: 1 },
  statBox: { alignItems: "center" },
  statValue: { color: C.text, fontWeight: "900", fontSize: 13 },
  statLabel: { color: C.muted, fontWeight: "600", fontSize: 10 },

  archiveBtn: {
    position: "absolute",
    bottom: 20,
    right: 16,
    backgroundColor: C.gold,
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    shadowColor: C.gold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  archiveBtnText: { color: C.text, fontWeight: "900", fontSize: 12 },
});