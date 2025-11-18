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

import { AdminScreen } from "../../components/admin/AdminUI";

/* ===========================
   MOCK SANCTIONS (exemple)
   =========================== */
interface Sanction {
  id: string;
  userId: string;
  level: "warning" | "strike" | "ban";
  reason: string;
  date: string;
}

const MOCK: Sanction[] = [
  {
    id: "S001",
    userId: "U_011",
    level: "warning",
    reason: "Langage inapproprié",
    date: "2025-01-10 14:22"
  },
  {
    id: "S002",
    userId: "U_003",
    level: "strike",
    reason: "Comportement impropre dans un PACT",
    date: "2025-01-09 08:31"
  },
  {
    id: "S003",
    userId: "U_045",
    level: "ban",
    reason: "Violation grave de pureté morale",
    date: "2025-01-08 19:40"
  }
];


/* ===========================
      PAGE SANCTIONS
   =========================== */
export default function RZAdminSanctions() {
  const [items, setItems] = useState<Sanction[]>([]);

  useEffect(() => {
    setItems(MOCK);
  }, []);

  /** ACTION : avertissement */
  function issueWarning(u: string) {
    Alert.alert(
      "Envoyer un avertissement",
      `Voulez-vous envoyer un avertissement moral à l’utilisateur ${u} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: () =>
            Alert.alert("Avertissement envoyé", `L’utilisateur ${u} a été averti.`)
        }
      ]
    );
  }

  return (
    <AdminScreen
      title="Avertissements & Sanctions"
      subtitle="Pureté morale • Discipline interne • Système fermé"
      showBack   // ⬅️ bouton retour activé
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 18, gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>

            <Text style={styles.row}>
              Utilisateur : <Text style={styles.val}>{item.userId}</Text>
            </Text>

            <Text style={styles.row}>
              Niveau :
              <Text
                style={{
                  color:
                    item.level === "warning"
                      ? "#FACC15"
                      : item.level === "strike"
                      ? "#fb923c"
                      : "#ef4444",
                  fontWeight: "800"
                }}
              >
                {" "}
                {item.level.toUpperCase()}
              </Text>
            </Text>

            <Text style={styles.row}>
              Motif : <Text style={styles.motif}>{item.reason}</Text>
            </Text>

            <Text style={styles.date}>{item.date}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#FACC15" }]}
                onPress={() => issueWarning(item.userId)}
              >
                <Text style={styles.btnText}>Avertir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#333" }]}
                onPress={() =>
                  Alert.alert(
                    "Détails",
                    `ID: ${item.id}\nUser: ${item.userId}\nNiveau: ${item.level}\nMotif: ${item.reason}`
                  )
                }
              >
                <Text style={styles.btnText}>Détails</Text>
              </TouchableOpacity>
            </View>

          </View>
        )}
      />
    </AdminScreen>
  );
}


/* ===========================
            STYLES
   =========================== */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222"
  },

  row: {
    color: "#D6D6D6",
    fontSize: 13,
    marginBottom: 4
  },

  val: {
    color: "#FFD700",
    fontWeight: "800"
  },

  motif: {
    color: "#bababa",
    fontSize: 13,
    fontStyle: "italic"
  },

  date: {
    color: "#777",
    fontSize: 11,
    marginTop: 4
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },

  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center"
  },

  btnText: {
    color: "#000",
    fontWeight: "800"
  }
});
