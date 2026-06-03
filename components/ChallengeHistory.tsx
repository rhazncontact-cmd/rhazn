// components/ChallengeHistory.tsx
// ✅ RHAZN — Historique des Challenges + Barre de Progression Exacte
// ✅ Dates dynamiques du challenge ACTIF depuis Supabase
// ✅ Barre progresse jusqu'à end_date réelle du challenge

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#0A0A0A",
  sub: "#6E6E73",
  muted: "#AEAEB2",
  border: "#E5E5EA",
  gold: "#D4AF37",
  goldLight: "rgba(212,175,55,0.13)",
  goldBorder: "rgba(212,175,55,0.32)",
};

type Challenge = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

type Winner = {
  rank: number;
  user_id: string;
  user_name: string;
  user_avatar_url: string;
  user_email: string;
  final_qob: number;
  final_tan: number;
  content_count: number;
};

const fmtN = (n: number) => Number(n || 0).toLocaleString("fr-FR");

const fmtShort = (n: number): string => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(".", ",")} M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(".", ",")} K`;
  return fmtN(n);
};

function Avatar({ uri, size, name }: { uri?: string | null; size: number; name?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = (name || "?")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const Fallback = () => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.goldLight,
        borderWidth: 1.5,
        borderColor: "rgba(212,175,55,0.3)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: C.gold, fontWeight: "800", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );

  if (!uri || imgFailed) return <Fallback />;

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.border }}
      onError={() => setImgFailed(true)}
    />
  );
}

function medalBg(rank: number) {
  return rank === 1
    ? C.gold
    : rank === 2
    ? "#A8A9AD"
    : rank === 3
    ? "#CD7F32"
    : C.card;
}

function medalFg(rank: number) {
  return rank === 1 ? "#000" : rank === 2 ? "#fff" : rank === 3 ? "#fff" : C.text;
}

interface ChallengeHistoryProps {
  onSelectChallenge?: (challenge: Challenge) => void;
}

export default function ChallengeHistory({ onSelectChallenge }: ChallengeHistoryProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallengeOnly, setActiveChallengeOnly] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [progress, setProgress] = useState(0);

  // ── Calcule le pourcentage de progression du challenge ACTIF ──
  const calculateProgress = (challenge: Challenge | null): number => {
    if (!challenge) return 0;

    const startTime = new Date(challenge.start_date).getTime();
    const endTime = new Date(challenge.end_date).getTime();
    const now = new Date().getTime();

    // Si avant le début
    if (now < startTime) return 0;

    // Si après la fin
    if (now > endTime) return 100;

    // Calcul du pourcentage exact
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    const percentage = (elapsed / totalDuration) * 100;

    return Math.min(100, Math.max(0, percentage));
  };

  // ── Load all challenges ──
  const loadChallenges = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("rz_get_challenges");
      if (error) throw error;

      const allChallenges = (data as Challenge[]) || [];
      
      // Trouver le challenge ACTIF
      const active = allChallenges.find((c) => c.status === "active");
      setActiveChallengeOnly(active || null);

      // Filtrer les challenges FERMÉS pour l'historique
      const closed = allChallenges.filter((c) => c.status === "closed");
      setChallenges(closed);

      // Calculer la progression du challenge actif
      if (active) {
        setProgress(calculateProgress(active));
      }
    } catch (e) {
      console.warn("Load challenges error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();

    // Mise à jour de la progression toutes les 30 secondes
    const interval = setInterval(() => {
      setProgress(calculateProgress(activeChallengeOnly));
    }, 30000);

    return () => clearInterval(interval);
  }, [activeChallengeOnly]);

  // ── Load winners for selected challenge ──
  const loadWinners = async (challengeId: string) => {
    setLoadingWinners(true);
    try {
      const { data, error } = await supabase.rpc("rz_get_challenge_winners", {
        p_challenge_id: challengeId,
      });
      if (error) throw error;
      setWinners(data || []);
    } catch (e) {
      console.warn("Load winners error:", e);
    } finally {
      setLoadingWinners(false);
    }
  };

  // ── Handle challenge selection ──
  const handleSelectChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    loadWinners(challenge.id);
    onSelectChallenge?.(challenge);
  };

  const formatMonthYear = (isoDate: string) => {
    const d = new Date(isoDate);
    const months = [
      "JANVIER",
      "FÉVRIER",
      "MARS",
      "AVRIL",
      "MAI",
      "JUIN",
      "JUILLET",
      "AOÛT",
      "SEPTEMBRE",
      "OCTOBRE",
      "NOVEMBRE",
      "DÉCEMBRE",
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatDateShort = (isoDate: string) => {
    const d = new Date(isoDate);
    const months = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "aoû", "sep", "oct", "nov", "déc"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={styles.loadingText}>Chargement de l'historique…</Text>
      </View>
    );
  }

  // ── Show winners if challenge selected ──
  if (selectedChallenge) {
    return (
      <View style={styles.winnersContainer}>
        {/* Header */}
        <View style={styles.winnersHeader}>
          <TouchableOpacity onPress={() => setSelectedChallenge(null)}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.winnersChallengeTitle}>{selectedChallenge.name}</Text>
            <Text style={styles.winnersPeriod}>
              {formatMonthYear(selectedChallenge.start_date)} → {formatMonthYear(selectedChallenge.end_date)}
            </Text>
          </View>
        </View>

        {/* Winners list */}
        {loadingWinners ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={C.gold} size="large" />
          </View>
        ) : winners.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.muted, fontWeight: "600" }}>Aucun gagnant enregistré</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {winners.map((w, i) => {
              const bg = medalBg(w.rank);
              const fg = medalFg(w.rank);
              const medal = w.rank === 1 ? "🥇" : w.rank === 2 ? "🥈" : w.rank === 3 ? "🥉" : "";

              return (
                <View key={w.user_id} style={[styles.winnerCard, i === 0 && styles.winnerCardTop3]}>
                  {/* Rank badge */}
                  <View style={[styles.rankBadge, { backgroundColor: bg }]}>
                    <Text style={[styles.rankText, { color: fg }]}>
                      {medal || `#${w.rank}`}
                    </Text>
                  </View>

                  {/* Avatar */}
                  <Avatar uri={w.user_avatar_url} size={48} name={w.user_name} />

                  {/* Info */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.winnerName} numberOfLines={1}>
                      {w.user_name || "—"}
                    </Text>
                    <Text style={styles.winnerEmail} numberOfLines={1}>
                      {w.user_email || "—"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="glasses-outline" size={10} color={C.gold} />
                        <Text style={styles.winnerStat}>{fmtShort(w.final_qob)}</Text>
                      </View>
                      {w.final_tan > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Ionicons name="flash" size={10} color={C.gold} />
                          <Text style={styles.winnerStat}>{fmtShort(w.final_tan)}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* QOB total */}
                  <View style={styles.qobBox}>
                    <Text style={styles.qobVal}>{fmtShort(w.final_qob)}</Text>
                    <Text style={styles.qobUnit}>QOB</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }

  // ── Show list of challenges ──
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      {/* ── BARRE DE PROGRESSION DU CHALLENGE EN COURS (si actif) ── */}
      {activeChallengeOnly ? (
        <View style={styles.progressCard}>
          <View style={{ gap: 10 }}>
            {/* Titre + statut */}
            <View style={{ gap: 2 }}>
              <Text style={styles.progressTitle}>{activeChallengeOnly.name}</Text>
              <Text style={styles.progressStatus}>🔥 En cours</Text>
            </View>

            {/* Dates exactes + pourcentage */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.progressDate}>{formatDateShort(activeChallengeOnly.start_date)}, 00:00</Text>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
              <Text style={styles.progressDate}>{formatDateShort(activeChallengeOnly.end_date)}, 00:00</Text>
            </View>

            {/* Barre de progression (animée) */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>
      ) : null}

      {/* Titre des challenges passés */}
      {challenges.length > 0 && <Text style={styles.sectionTitle}>Challenges Passés</Text>}

      {/* Liste des challenges fermés */}
      {challenges.length === 0 && !activeChallengeOnly ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={C.border} />
          <Text style={styles.emptyTitle}>Aucun challenge</Text>
          <Text style={styles.emptySub}>Les historiques apparaîtront ici</Text>
        </View>
      ) : (
        challenges.map((ch) => (
          <TouchableOpacity
            key={ch.id}
            style={styles.challengeCard}
            onPress={() => handleSelectChallenge(ch)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.chName}>{ch.name}</Text>
              <Text style={styles.chPeriod}>
                📅 {formatMonthYear(ch.start_date)} → {formatMonthYear(ch.end_date)}
              </Text>
              <Text style={styles.chStatus}>✅ Archivé et terminé</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.border} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: C.muted,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 60,
  },
  emptyTitle: {
    color: C.text,
    fontWeight: "800",
    fontSize: 16,
  },
  emptySub: {
    color: C.muted,
    fontWeight: "600",
    fontSize: 13,
  },

  // ── Barre de progression ──
  progressCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.goldBorder,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  progressTitle: {
    color: C.text,
    fontWeight: "900",
    fontSize: 15,
  },
  progressStatus: {
    color: C.gold,
    fontWeight: "700",
    fontSize: 12,
  },
  progressDate: {
    color: C.muted,
    fontWeight: "600",
    fontSize: 11,
  },
  progressPercent: {
    color: C.gold,
    fontWeight: "900",
    fontSize: 13,
  },
  progressBarContainer: {
    width: "100%",
    height: 6,
    backgroundColor: C.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: C.gold,
    borderRadius: 3,
  },

  sectionTitle: {
    color: C.text,
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 12,
  },

  challengeCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chName: {
    color: C.text,
    fontWeight: "800",
    fontSize: 14,
  },
  chPeriod: {
    color: C.sub,
    fontWeight: "600",
    fontSize: 12,
  },
  chStatus: {
    color: C.gold,
    fontWeight: "700",
    fontSize: 11,
  },

  // Winners
  winnersContainer: {
    flex: 1,
  },
  winnersHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  winnersChallengeTitle: {
    color: C.text,
    fontWeight: "900",
    fontSize: 15,
  },
  winnersPeriod: {
    color: C.muted,
    fontWeight: "600",
    fontSize: 11,
    marginTop: 2,
  },

  winnerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  winnerCardTop3: {
    borderColor: C.goldBorder,
    borderWidth: 1.5,
  },

  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rankText: {
    fontWeight: "900",
    fontSize: 18,
  },

  winnerName: {
    color: C.text,
    fontWeight: "800",
    fontSize: 13,
  },
  winnerEmail: {
    color: C.muted,
    fontWeight: "600",
    fontSize: 11,
  },
  winnerStat: {
    color: C.gold,
    fontWeight: "800",
    fontSize: 10,
  },

  qobBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    flexShrink: 0,
  },
  qobVal: {
    color: C.gold,
    fontWeight: "900",
    fontSize: 13,
  },
  qobUnit: {
    color: C.muted,
    fontWeight: "700",
    fontSize: 8,
  },
});