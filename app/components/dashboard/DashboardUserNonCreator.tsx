import { Ionicons } from "@expo/vector-icons";
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

type Props = {
  fullName: string;
  qob: number;
  tan: number;
  cadnaStatus: "approved" | "pending" | "rejected";
};

export default function DashboardUserNonCreator({
  fullName,
  qob,
  tan,
  cadnaStatus,
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

          {/* BADGES */}
          <View style={styles.badgeRow}>
            <View style={styles.userBadge}>
              <Text style={styles.userBadgeText}>Utilisateur</Text>
            </View>

            <View style={[styles.cadnaBadge, { borderColor: cadnaColor }]}>
              <Text style={[styles.cadnaText, { color: cadnaColor }]}>
                {cadnaLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* QOB / TAN */}
        <View style={styles.balanceBox}>
          <Text style={styles.balanceValue}>{qob}</Text>
          <Text style={styles.balanceLabel}>QOB</Text>

          <View style={styles.sep} />

          <Text style={styles.balanceValue}>{tan}</Text>
          <Text style={styles.balanceLabel}>TAN</Text>
        </View>
      </View>

      {/* ================= BLOC PRINCIPAL ================= */}
      <View style={styles.mainCard}>
        <Ionicons
          name="sparkles-outline"
          size={28}
          color={COLORS.blue}
          style={{ marginBottom: 10 }}
        />

        <Text style={styles.mainTitle}>
          Vous n’êtes pas encore créateur
        </Text>

        <Text style={styles.mainText}>
          Publiez votre première œuvre pour activer automatiquement
          l’espace créateur et commencer à générer des revenus sur RHAZN.
        </Text>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push("/user-store/publish-pact/")}
        >
          <Text style={styles.ctaText}>Publier une œuvre</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Aucun formulaire • Activation immédiate • Validation CADNA si requise
        </Text>
      </View>
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

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 26,
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

  userBadge: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  userBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.gray,
    letterSpacing: 0.5,
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
    textAlign: "right",
  },

  balanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gray,
    marginBottom: 4,
  },

  sep: {
    height: 1,
    width: 40,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },

  /* MAIN CARD */
  mainCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: "center",
  },

  mainTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 6,
    textAlign: "center",
  },

  mainText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },

  cta: {
    backgroundColor: COLORS.blue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },

  ctaText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 15,
  },

  hint: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.gray,
    textAlign: "center",
  },
});
