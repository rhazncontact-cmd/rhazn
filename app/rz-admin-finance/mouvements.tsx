import { useEffect, useState } from "react";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AdminGuard from "../../components/admin/AdminGuard";
import { financeApi } from "../../lib/finance/mockApi";
import { AcsetMovement } from "../../lib/finance/types";

export default function RZAdminFluxACSET() {
  const [items, setItems] = useState<AcsetMovement[]>([]);
  const [flt, setFlt] = useState<"ALL" | "TAN" | "ACSET">("ALL");

  useEffect(() => {
    (async () => {
      setItems(await financeApi.listMovements());
    })();
  }, []);

  // ✔ Correction : filtrage basé sur "currency" (unit n’existe pas)
  const filtered = items.filter((i) =>
    flt === "ALL" ? true : i.currency === flt
  );

  return (
    <AdminGuard>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <View style={styles.container}>
        <Text style={styles.title}>Flux Internes · TAN & ACSET</Text>
        <Text style={styles.subtitle}>
          Cycle du Mérite · Mouvements internes du Système RHAZN
        </Text>

        {/* Filtres unités */}
        <View style={styles.filters}>
          <Chip label="Tous" active={flt === "ALL"} onPress={() => setFlt("ALL")} />
          <Chip label="TAN" active={flt === "TAN"} onPress={() => setFlt("TAN")} />
          <Chip
            label="ACSET"
            active={flt === "ACSET"}
            onPress={() => setFlt("ACSET")}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 18, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>

              {/* TAG + TYPE */}
              <Text style={styles.row}>
                <Text style={styles.tag}>{item.currency}</Text> • {item.type}
              </Text>

              {/* MONTANT */}
              <Text style={styles.row}>
                Montant :{" "}
                <Text style={styles.val}>
                  {item.amount} {item.currency}
                </Text>
              </Text>

              {/* ORIGINE */}
              <Text style={styles.row}>
                Origine : <Text style={styles.val}>{item.from ?? "—"}</Text>
              </Text>

              {/* DESTINATION */}
              <Text style={styles.row}>
                Destination : <Text style={styles.val}>{item.to ?? "—"}</Text>
              </Text>

              {/* STATUT */}
              <Text style={styles.status(item.status)}>
                Statut : {item.status}
              </Text>

              {/* NOTE */}
              {item.note ? (
                <Text style={[styles.row, { color: "#8b8b8b", marginTop: 4 }]}>
                  {item.note}
                </Text>
              ) : null}
            </View>
          )}
        />
      </View>
    </AdminGuard>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? "#FFD700" : "#333",
          backgroundColor: active ? "#1a1a1a" : "#0B0B0B",
        },
      ]}
    >
      <Text style={{ color: active ? "#FFD700" : "#aaa", fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 70 },

  title: {
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 18,
  },

  subtitle: {
    color: "#8f8f8f",
    fontSize: 13,
    marginLeft: 18,
    marginBottom: 14,
  },

  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 6,
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },

  card: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222",
  },

  row: { color: "#D6D6D6", fontSize: 13 },

  val: { color: "#FFD700", fontWeight: "800" },

  tag: { color: "#A1A1A1", fontWeight: "700" },

  status: (s: "ok" | "flagged" | "blocked") => ({
    color: s === "ok" ? "#22c55e" : s === "flagged" ? "#f59e0b" : "#ef4444",
    fontWeight: "800",
    marginTop: 6,
  }),
});
