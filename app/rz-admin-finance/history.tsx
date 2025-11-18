import { useEffect, useState } from "react";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AdminGuard from "../../components/admin/AdminGuard";
import { financeApi } from "../../lib/finance/mockApi";
import { Txn } from "../../lib/finance/types";

export default function RZAdminHistory() {
  const [items, setItems] = useState<Txn[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const data = await financeApi.listTransactions();
      setItems(data);
    })();
  }, []);

  // ✔ Correction : recherche sur edeId (nom correct)
  const filtered = items.filter((t) => {
    const search = q.toLowerCase();
    return (
      t.id.toLowerCase().includes(search) ||
      (t.userId?.toLowerCase().includes(search) ?? false) ||
      (t.edeId?.toLowerCase().includes(search) ?? false) ||
      t.type.toLowerCase().includes(search)
    );
  });

  return (
    <AdminGuard>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <View style={styles.container}>
        <Text style={styles.title}>Historique des Flux Internes RHAZN</Text>
        <Text style={styles.subtitle}>
          TAN · ACSET · Ajustements internes (Système fermé)
        </Text>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher : id, user, ED, type…"
          placeholderTextColor="#777"
          style={styles.search}
        />

        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 18, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>

              {/* TYPE + MONTANT */}
              <Text style={styles.row}>
                {item.type} •{" "}
                <Text style={styles.amount}>
                  {item.amount} {item.currency}
                </Text>
              </Text>

              {/* UTILISATEUR (si concerné) */}
              <Text style={styles.row}>
                Utilisateur :{" "}
                <Text style={styles.val}>{item.userId ?? "—"}</Text>
              </Text>

              {/* ED (si concerné) */}
              <Text style={styles.row}>
                ED : <Text style={styles.val}>{item.edeId ?? "—"}</Text>
              </Text>

              {/* STATUT */}
              <Text
                style={[
                  styles.row,
                  {
                    color:
                      item.status === "ok"
                        ? "#22c55e"
                        : item.status === "pending"
                        ? "#f59e0b"
                        : "#ef4444",
                  },
                ]}
              >
                Statut : {item.status}
              </Text>

              {/* DATE */}
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          )}
        />
      </View>
    </AdminGuard>
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
    marginBottom: 10,
  },

  search: {
    marginHorizontal: 18,
    marginBottom: 10,
    backgroundColor: "#0B0B0B",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
    padding: 12,
    color: "#fff",
  },

  card: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222",
  },

  row: {
    color: "#D6D6D6",
    fontSize: 13,
    marginBottom: 2,
  },

  amount: {
    color: "#FFD700",
    fontWeight: "800",
  },

  val: {
    color: "#FFD700",
    fontWeight: "700",
  },

  date: {
    color: "#8b8b8b",
    fontSize: 12,
    marginTop: 4,
  },
});
