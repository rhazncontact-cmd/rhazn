import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AdminGuard from "../../components/admin/AdminGuard";
import { financeApi } from "../../lib/finance/mockApi";
import { WithdrawRequest } from "../../lib/finance/types";

/**
 * RZAdminWithdrawValidate
 * Validation des retraits TAN internes des ED
 * Conforme à la doctrine RHAZN :
 * - Système fermé (TAN uniquement)
 * - Aucun argent réel, aucune méthode externe (NatCash, MonCash, Banque, Cash)
 * - Retraits TAN : internes, mathématiques, contrôlés
 */

export default function RZAdminWithdrawValidate() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WithdrawRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "auto" | "review" | "rejected">(
    "all"
  );

  async function load() {
    setLoading(true);
    const data = await financeApi.listWithdraws(); // logique interne TAN, pas d'argent réel
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((w) => {
    if (filter === "all") return true;
    if (filter === "auto")
      return w.status === "auto_approved" || w.status === "auto_rejected";
    if (filter === "review")
      return w.status === "needs_review" || w.status === "pending";
    if (filter === "rejected")
      return w.status === "rejected" || w.status === "auto_rejected";
    return true;
  });

  async function approve(id: string) {
    // Validation d'un retrait TAN interne par le COO (aucune sortie d'argent réel)
    await financeApi.approveWithdraw(id, "COO");
    await load();
  }

  async function reject(id: string) {
    await financeApi.rejectWithdraw(id, "Non conforme (admin)");
    await load();
  }

  function badgeColor(status: WithdrawRequest["status"]) {
    switch (status) {
      case "auto_approved":
        return "#22c55e";
      case "approved":
        return "#22c55e";
      case "needs_review":
        return "#f59e0b";
      case "pending":
        return "#a3a3a3";
      case "auto_rejected":
      case "rejected":
        return "#ef4444";
      case "processing":
        return "#3b82f6";
      default:
        return "#a3a3a3";
    }
  }

  return (
    <AdminGuard>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <View style={styles.container}>
        {/* TITRE DOCTRINAL */}
        <Text style={styles.title}>Retraits TAN internes (ED)</Text>
        <Text style={styles.subtitle}>
          IA interne + validation des cas sensibles (COO/CFO) — aucun argent
          réel
        </Text>

        {/* Filtres rapides */}
        <View style={styles.filters}>
          <Chip
            label="Tous"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Chip
            label="Auto (IA)"
            active={filter === "auto"}
            onPress={() => setFilter("auto")}
          />
          <Chip
            label="À valider"
            active={filter === "review"}
            onPress={() => setFilter("review")}
          />
          <Chip
            label="Rejetés"
            active={filter === "rejected"}
            onPress={() => setFilter("rejected")}
          />
          <TouchableOpacity onPress={load} style={styles.reload}>
            <Text style={{ color: "#FFD700" }}>↻</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator color="#FFD700" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ padding: 18, gap: 12 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                {/* HEADER : User → ED + statut */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text style={styles.user}>
                    {item.userId} → {item.edeId}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { borderColor: badgeColor(item.status) },
                    ]}
                  >
                    <Text
                      style={{
                        color: badgeColor(item.status),
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Infos TAN */}
                <Text style={styles.row}>
                  Montant :{" "}
                  <Text style={styles.val}>{item.amountTan} TAN</Text>
                </Text>
                <Text style={styles.row}>
                  Frais Retrait TAN :{" "}
                  <Text style={styles.val}>{item.feeTan} TAN</Text>
                </Text>

                {/* IA */}
                <Text style={styles.row}>
                  IA Score :{" "}
                  <Text
                    style={[
                      styles.val,
                      {
                        color:
                          item.iaScore >= 0.88
                            ? "#22c55e"
                            : item.iaScore < 0.35
                            ? "#ef4444"
                            : "#f59e0b",
                      },
                    ]}
                  >
                    {Math.round(item.iaScore * 100)}%
                  </Text>
                </Text>

                {item.reason ? (
                  <Text style={[styles.row, { color: "#ef4444" }]}>
                    Note IA : {item.reason}
                  </Text>
                ) : null}

                {/* RÈGLES DOCTRINALES (AFFICHÉES À L’ÉCRAN) */}
                <View style={styles.rules}>
                  <Text style={styles.ruleLine}>
                    • Retraits TAN internes effectués uniquement par ED
                    (jamais par les utilisateurs)
                  </Text>
                  <Text style={styles.ruleLine}>
                    • Aucun retrait d’argent réel — système 100% fermé
                  </Text>
                  <Text style={styles.ruleLine}>
                    • Frais Retrait TAN : 15% (10% RZ-Admin + 5% ED)
                  </Text>
                  <Text style={styles.ruleLine}>
                    • Commission interne : aucune connexion à NatCash, MonCash,
                    Banque ou Cash
                  </Text>
                  <Text style={styles.ruleLine}>
                    • Cas “gris” → validation CFO/COO (éthique + mathématique)
                  </Text>
                </View>

                {/* ACTIONS */}
                <View style={styles.actions}>
                  {(item.status === "auto_approved" ||
                    item.status === "needs_review" ||
                    item.status === "pending") && (
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: "#22c55e" }]}
                      onPress={() => approve(item.id)}
                    >
                      <Text style={styles.btnText}>Valider</Text>
                    </TouchableOpacity>
                  )}

                  {item.status !== "approved" && item.status !== "rejected" && (
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: "#ef4444" }]}
                      onPress={() => reject(item.id)}
                    >
                      <Text style={styles.btnText}>Rejeter</Text>
                    </TouchableOpacity>
                  )}

                  {(item.status === "approved" ||
                    item.status === "rejected" ||
                    item.status === "auto_rejected") && (
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: "#333" }]}
                      onPress={() =>
                        Alert.alert(
                          "Détails",
                          `TX: ${item.id}\nUser: ${item.userId}\nED: ${item.edeId}`
                        )
                      }
                    >
                      <Text style={styles.btnText}>Détails</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text
                style={{ color: "#888", textAlign: "center", marginTop: 40 }}
              >
                Aucun retrait TAN interne
              </Text>
            }
          />
        )}
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
      <Text
        style={{
          color: active ? "#FFD700" : "#aaa",
          fontWeight: active ? "700" : "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 70 },
  title: { color: "#FFD700", fontSize: 22, fontWeight: "700", marginLeft: 18 },
  subtitle: {
    color: "#A1A1A1",
    fontSize: 13,
    marginLeft: 18,
    marginBottom: 10,
  },
  filters: {
    flexDirection: "row",
    alignItems: "center",
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
  reload: {
    marginLeft: "auto",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },

  card: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  user: { color: "#fff", fontSize: 15, fontWeight: "700" },
  badge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  row: { color: "#CFCFCF", fontSize: 13, marginTop: 2 },
  val: { color: "#FFD700", fontWeight: "700" },

  rules: {
    marginTop: 10,
    backgroundColor: "#0f0f0f",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
    padding: 10,
  },
  ruleLine: { color: "#888", fontSize: 12, marginBottom: 2 },

  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "800" },
});
