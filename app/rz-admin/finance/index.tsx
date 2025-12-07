// app/rz-admin-finance/index.tsx
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AdminGuard from "../../components/AdminGuard";

const GOLD = "#D4AF37";

export default function RZAdminFinanceHome() {
  const router = useRouter();

  return (
    <AdminGuard>
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={26} color={GOLD} />
          </TouchableOpacity>

          <Text style={styles.title}>Centre Financier RHAZN</Text>

          <View style={{ width: 26 }} />
        </View>

        {/* CARDS */}
        <View style={styles.cards}>

          <FinanceCard
            title="Valider ACSET"
            subtitle="Validation des conversions et opérations sensibles"
            icon={<MaterialIcons name="verified" size={26} color={GOLD} />}
            onPress={() => router.push("/rz-admin-finance/acset-validate")}
          />

          <FinanceCard
            title="Historique complet"
            subtitle="Liste de toutes les transactions"
            icon={<Feather name="book-open" size={24} color="#4ade80" />}
            onPress={() => router.push("/rz-admin-finance/history")}
          />

          <FinanceCard
            title="Mouvements ACSET / TAN"
            subtitle="Flux entrants et sortants"
            icon={<Feather name="shuffle" size={24} color="#38bdf8" />}
            onPress={() => router.push("/rz-admin-finance/movements")}
          />

          <FinanceCard
            title="Statistiques & Synthèse"
            subtitle="Vision globale des soldes agents"
            icon={<Feather name="bar-chart-2" size={24} color="#c084fc" />}
            onPress={() => router.push("/rz-admin-finance/stats")}
          />

        </View>
      </View>
    </AdminGuard>
  );
}

function FinanceCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: { color: GOLD, fontSize: 20, fontWeight: "900" },

  cards: { marginTop: 10, gap: 12 },

  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  iconWrap: {
    backgroundColor: "#1a1a1a",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },

  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },

  cardSubtitle: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
});
