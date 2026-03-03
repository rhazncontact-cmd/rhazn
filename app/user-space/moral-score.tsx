// app/user-space/moral-score.tsx
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

/* ─────────────────────────────
🟢 UI E — SCORE MORAL
───────────────────────────── */

const COLORS = {
  bg: "#000",
  card: "#0B0B0B",
  border: "rgba(255,255,255,0.12)",
  text: "#FFF",
  muted: "rgba(255,255,255,0.7)",
  gold: "#D4AF37",
  green: "#34C759",
  red: "#FF453A",
};

type Metrics = {
  approved: number;
  corrected: number;
  rejected: number;
  supreme_rejected: number;
};

export default function MoralScoreScreen() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      const { data } = await supabase.rpc("get_creator_moral_metrics", {
        p_creator_id: uid,
      });

      if (data?.[0]) setMetrics(data[0]);
    } finally {
      setLoading(false);
    }
  };

  const score = useMemo(() => {
    if (!metrics) return 0;
    const raw =
      metrics.approved * 2 +
      metrics.corrected * 1 -
      metrics.rejected * 3 -
      metrics.supreme_rejected * 8;
    return Math.max(0, raw);
  }, [metrics]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gold} />
        <Text style={styles.headerText}>Score moral</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} />
        </View>
      ) : (
        <>
          {/* SCORE */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>Indice de conformité</Text>
          </View>

          {/* METRICS */}
          <View style={styles.metrics}>
            <Metric icon="checkmark-circle-outline" label="Approuvés" value={metrics?.approved ?? 0} color={COLORS.green} />
            <Metric icon="construct-outline" label="Corrigés" value={metrics?.corrected ?? 0} color={COLORS.gold} />
            <Metric icon="close-circle-outline" label="Rejetés" value={metrics?.rejected ?? 0} color={COLORS.red} />
            <Metric icon="skull-outline" label="Rejet suprême" value={metrics?.supreme_rejected ?? 0} color={COLORS.red} />
          </View>

          {/* DISCLAIMER */}
          <Text style={styles.disclaimer}>
            Cet indice reflète uniquement l’historique de conformité aux règles CADNA.
            Il n’exprime aucun jugement personnel.
          </Text>
        </>
      )}
    </View>
  );
}

/* ───────── COMPONENTS ───────── */

function Metric({
  icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

/* ───────── STYLES ───────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 18 },

  header: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 18,
  },
  headerText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  scoreCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 26,
    alignItems: "center",
  },
  scoreValue: {
    color: COLORS.text,
    fontSize: 48,
    fontWeight: "900",
  },
  scoreLabel: {
    color: COLORS.muted,
    marginTop: 6,
    fontWeight: "700",
  },

  metrics: {
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metricLabel: { color: COLORS.muted, flex: 1, fontWeight: "700" },
  metricValue: { color: COLORS.text, fontWeight: "900" },

  disclaimer: {
    marginTop: 14,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
