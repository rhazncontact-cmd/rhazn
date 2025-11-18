import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import AdminGuard from "../../components/admin/AdminGuard";
import { financeApi } from "../../lib/finance/mockApi";
import { AccountingLock } from "../../lib/finance/types";

export default function RZAdminAccounting() {
  const [locks, setLocks] = useState<AccountingLock[]>([]);

  async function load() {
    const data = await financeApi.getLocks();
    setLocks(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function sign(id: string) {
    await financeApi.signLock(id, "CFO"); // Validation morale finale
    await load();
  }

  return (
    <AdminGuard>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.container}>
        <Text style={styles.title}>Validation Comptable (Système Fermé)</Text>
        <Text style={styles.subtitle}>
          Vérification interne · Moralité · Exactitude des flux TAN / ACSET
        </Text>

        <FlatList
          data={locks}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 18, gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>

              {/* OBJET */}
              <Text style={styles.row}>
                Objet : <Text style={styles.val}>{item.subjectId}</Text>
              </Text>

              {/* STATUT */}
              <Text style={styles.row}>
                Statut :
                <Text
                  style={{
                    color:
                      item.status === "validated" ? "#22c55e" : item.status === "rejected" ? "#ef4444" : "#f59e0b",
                    fontWeight: "800",
                  }}
                >
                  {" "}
                  {item.status}
                </Text>
              </Text>

              {/* SIGNATURES */}
              <Text style={styles.row}>
                Signatures internes :
                <Text style={styles.val}> {item.signatures.length}</Text>
              </Text>

              {/* RÈGLES DOCTRINALES */}
              <View style={styles.blockRules}>
                <Text style={styles.ruleLine}>• Aucune monnaie externe</Text>
                <Text style={styles.ruleLine}>• Comptabilité fermée : TAN + ACSET uniquement</Text>
                <Text style={styles.ruleLine}>• Tous les flux = internes et traçables</Text>
                <Text style={styles.ruleLine}>• Double validation : IA → CFO</Text>
              </View>

              {/* ACTIONS */}
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => sign(item.id)}
                  style={[styles.btn, { backgroundColor: "#22c55e" }]}
                >
                  <Text style={styles.btnText}>Valider (CFO)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: "#333" }]}
                  onPress={() =>
                    Alert.alert(
                      "Détails du Verrou Comptable",
                      `ID: ${item.id}\nObjet: ${item.subjectId}\nSignatures: ${item.signatures.length}`
                    )
                  }
                >
                  <Text style={styles.btnText}>Détails</Text>
                </TouchableOpacity>
              </View>

            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucun verrou comptable</Text>
          }
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
    color: "#9a9a9a",
    fontSize: 13,
    marginLeft: 18,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
  },

  row: { color: "#D6D6D6", fontSize: 13, marginBottom: 2 },

  val: { color: "#FFD700", fontWeight: "800" },

  blockRules: {
    marginTop: 10,
    backgroundColor: "#0f0f0f",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
  },

  ruleLine: {
    color: "#888",
    fontSize: 12,
    marginBottom: 2,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
  },

  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
});
