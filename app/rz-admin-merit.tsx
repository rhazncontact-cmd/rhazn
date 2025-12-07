// app/rz-admin-merit.tsx (ou /screens/RZAdminMerit.tsx)
import React from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useMeritDashboard } from "../lib/useMeritRewards";
import type { Top10Entry } from "../types/rewards";

export default function RZAdminMeritScreen() {
  const { current, history, loading, error } = useMeritDashboard();

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Chargement du Classement du Mérite…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>Erreur : {error}</Text>
      </SafeAreaView>
    );
  }

  if (!current) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>
          Aucun cycle de récompense n’a encore été calculé.
        </Text>
      </SafeAreaView>
    );
  }

  const top10 = (current.top10 ?? []) as Top10Entry[];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* En-tête période */}
        <Text style={styles.title}>Classement du Mérite</Text>
        <Text style={styles.subtitle}>
          Période : {current.period_start} → {current.period_end}
        </Text>

        {/* CIR */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🥇 CIR — Créateur du cycle</Text>
          {current.cir_uid ? (
            <>
              <Text style={styles.label}>UID :</Text>
              <Text style={styles.valueMono}>{current.cir_uid}</Text>
              <Text style={styles.label}>Total QOB :</Text>
              <Text style={styles.value}>{current.cir_q ?? 0}</Text>
              <Text style={styles.label}>CM (plafonné) :</Text>
              <Text style={styles.value}>{current.cir_cm ?? 0} TAN</Text>
            </>
          ) : (
            <Text style={styles.muted}>
              Aucun créateur éligible pour ce cycle.
            </Text>
          )}
        </View>

        {/* PRIX D’HOR */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🥈 Prix d’HOR — Meilleur SUSPENTZ</Text>
          {current.prix_dor_uid ? (
            <>
              <Text style={styles.label}>UID créateur :</Text>
              <Text style={styles.valueMono}>{current.prix_dor_uid}</Text>
              <Text style={styles.label}>QOB du SUSPENTZ gagnant :</Text>
              <Text style={styles.value}>{current.prix_dor_q ?? 0}</Text>
              <Text style={styles.label}>Prime TAN :</Text>
              <Text style={styles.value}>{current.prix_dor_value ?? 0} TAN</Text>
            </>
          ) : (
            <Text style={styles.muted}>
              Aucun SUSPENTZ éligible pour ce cycle.
            </Text>
          )}
        </View>

        {/* TOP 10 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏆 TOP 10 SUSPENTZ</Text>
          {top10 && top10.length > 0 ? (
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeader, { flex: 0.8 }]}>Rang</Text>
              <Text style={[styles.tableHeader, { flex: 2 }]}>SUSPENTZ</Text>
              <Text style={[styles.tableHeader, { flex: 1.2 }]}>QOB</Text>
              <Text style={[styles.tableHeader, { flex: 1.4 }]}>Prime</Text>
            </View>
          ) : (
            <Text style={styles.muted}>
              Aucun TOP 10 pour cette période.
            </Text>
          )}

          {top10?.map((item) => (
            <View key={item.rank} style={styles.tableRow}>
              <Text style={[styles.cellRank, { flex: 0.8 }]}>
                #{item.rank}
              </Text>
              <Text
                style={[styles.cellMono, { flex: 2 }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {item.suspentz_id}
              </Text>
              <Text style={[styles.cell, { flex: 1.2 }]}>{item.q}</Text>
              <Text style={[styles.cell, { flex: 1.4 }]}>{item.prize}</Text>
            </View>
          ))}
        </View>

        {/* Historique */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📜 Historique des cycles</Text>
          {history.length === 0 ? (
            <Text style={styles.muted}>Aucun historique disponible.</Text>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.historyRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.historyPeriod}>
                      {item.period_start} → {item.period_end}
                    </Text>
                    <Text style={styles.historyMeta}>
                      Total TAN distribué : {item.tan_reward}
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.historyMeta}>
                      CIR QOB : {item.cir_q ?? 0}
                    </Text>
                    <Text style={styles.historyMeta}>
                      PRIX D’HOR QOB : {item.prix_dor_q ?? 0}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050509" },
  scroll: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050509",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#aaaaaa",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#11121A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#262739",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: "#8f90a6",
    marginTop: 6,
  },
  value: {
    fontSize: 16,
    color: "#ffffff",
  },
  valueMono: {
    fontSize: 12,
    color: "#e0e0ff",
    fontFamily: "Menlo",
  },
  muted: {
    fontSize: 13,
    color: "#77788a",
  },
  error: {
    fontSize: 14,
    color: "#ff6b6b",
  },
  tableHeaderRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#262739",
  },
  tableHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#13141e",
  },
  cellRank: {
    fontSize: 13,
    color: "#fbbf24",
    fontWeight: "600",
  },
  cell: {
    fontSize: 13,
    color: "#e5e7eb",
  },
  cellMono: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: "Menlo",
  },
  historyRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#181926",
  },
  historyPeriod: {
    fontSize: 13,
    color: "#ffffff",
  },
  historyMeta: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
