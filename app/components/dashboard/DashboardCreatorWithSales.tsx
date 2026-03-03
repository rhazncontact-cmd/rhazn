import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/* 🎨 Apple-like RHAZN */
const COLORS = {
  bg: "#FFFFFF",
  card: "#F6F7F9",
  border: "#E5E7EB",
  text: "#0A0A0A",
  gray: "#6B7280",
  gold: "#D4AF37",
  blue: "#007AFF",
  success: "#00C853",
};

type Totals = {
  revenue_total: number;
  revenue_audio: number;
  revenue_video: number;
  revenue_suspentz: number;
};

type TopProduct = {
  product_id: string;
  title: string;
  type: "AUDIO" | "VIDEO" | "SUSPENTZ";
  sales: number;
  revenue_tan: number;
};

type Props = {
  fullName: string;
  qob: number;
  tan: number;
  cadnaStatus: "approved" | "pending" | "rejected";
  totals: Totals;
  topProducts: TopProduct[];
};

export default function DashboardCreatorWithSales({
  fullName,
  qob,
  tan,
  cadnaStatus,
  totals,
  topProducts,
}: Props) {
  const router = useRouter();

  const cadnaLabel =
    cadnaStatus === "approved"
      ? "Profil validé CADNA"
      : cadnaStatus === "rejected"
      ? "Profil rejeté CADNA"
      : "Validation CADNA en cours";

  const cadnaColor =
    cadnaStatus === "approved"
      ? COLORS.success
      : cadnaStatus === "rejected"
      ? "#DC2626"
      : "#F9A825";

  return (
    <View style={styles.container}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{fullName}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorBadgeText}>Créateur</Text>
            </View>

            <View style={[styles.cadnaBadge, { borderColor: cadnaColor }]}>
              <Text style={[styles.cadnaText, { color: cadnaColor }]}>
                {cadnaLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.balanceBox}>
          <Text style={styles.balanceValue}>{qob}</Text>
          <Text style={styles.balanceLabel}>QOB</Text>

          <View style={styles.sep} />

          <Text style={styles.balanceValue}>{tan}</Text>
          <Text style={styles.balanceLabel}>TAN</Text>
        </View>
      </View>

      {/* ================= KPI ================= */}
      <View style={styles.kpiRow}>
        <Kpi label="Revenus totaux" value={`${totals.revenue_total} TAN`} />
        <Kpi label="Suspentz" value={`${totals.revenue_suspentz} TAN`} />
      </View>

      <View style={styles.kpiRow}>
        <Kpi label="Audio" value={`${totals.revenue_audio} TAN`} />
        <Kpi label="Vidéo" value={`${totals.revenue_video} TAN`} />
      </View>

      {/* ================= TOP PRODUITS ================= */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Œuvres les plus rentables</Text>

        {topProducts.length ? (
          topProducts.map((p, idx) => (
            <View key={p.product_id} style={styles.topRow}>
              <Text style={styles.rank}>{idx + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.topTitle} numberOfLines={1}>
                  {p.title}
                </Text>
                <Text style={styles.topMeta}>
                  {p.type} • {p.sales} ventes
                </Text>
              </View>
              <Text style={styles.topValue}>{p.revenue_tan} TAN</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>Aucune donnée disponible.</Text>
        )}
      </View>

      {/* ================= ACTIONS ================= */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/user-store/publish-pact/")}
        >
          <Text style={styles.primaryText}>Publier une œuvre</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/user-creations/")}
        >
          <Text style={styles.secondaryText}>Mes créations</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ================= COMPONENTS ================= */
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 28,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  name: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },

  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },

  creatorBadge: {
    backgroundColor: "#EAF7EF",
    borderWidth: 1,
    borderColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  creatorBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.success,
  },

  cadnaBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  cadnaText: {
    fontSize: 11,
    fontWeight: "800",
  },

  balanceBox: {
    alignItems: "flex-end",
  },

  balanceValue: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },

  balanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gray,
  },

  sep: {
    height: 1,
    width: 40,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },

  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  kpi: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },

  kpiLabel: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  kpiValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 14,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 8,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },

  rank: {
    color: COLORS.blue,
    fontWeight: "900",
    width: 18,
    textAlign: "center",
  },

  topTitle: {
    color: COLORS.text,
    fontWeight: "800",
  },

  topMeta: {
    color: COLORS.gray,
    fontSize: 12,
  },

  topValue: {
    color: COLORS.blue,
    fontWeight: "900",
  },

  muted: {
    color: COLORS.gray,
    marginTop: 10,
  },

  actions: {
    marginTop: 18,
    gap: 10,
  },

  primaryBtn: {
    backgroundColor: COLORS.blue,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 15,
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  secondaryText: {
    color: COLORS.text,
    fontWeight: "800",
  },
});
