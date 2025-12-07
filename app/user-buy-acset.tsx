// app/user-buy-acset.tsx
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Agent = {
  uid: string;
  email: string | null;
};

export default function UserBuyAcsetScreen() {
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [amount, setAmount] = useState("");
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ============================
  // 🔥 Charger la liste des agents
  // ============================
  useEffect(() => {
    const loadAgents = async () => {
      setLoadingAgents(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("uid, email, role")
          .eq("role", "agent");

        if (error) throw error;

        const agentsList =
          (data || []).map((row: any) => ({
            uid: row.uid,
            email: row.email,
          })) ?? [];

        setAgents(agentsList);
      } catch (e: any) {
        console.log("LOAD_AGENTS_ERROR:", e);
        Alert.alert("Erreur", "Impossible de charger les agents.");
      } finally {
        setLoadingAgents(false);
      }
    };

    loadAgents();
  }, []);

  // ============================
  // 🔥 Envoyer une demande d’achat
  // ============================
  const handleSubmit = async () => {
    if (submitting) return;

    const qty = parseInt(amount, 10);
    if (!selectedAgent) {
      return Alert.alert("Info", "Veuillez sélectionner un Agent RZ.");
    }
    if (!qty || qty <= 0) {
      return Alert.alert("Info", "Veuillez saisir un montant ACSET valide.");
    }

    try {
      setSubmitting(true);

      // Récupérer l'utilisateur courant
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth?.user;
      if (!currentUser) {
        return Alert.alert(
          "Session expirée",
          "Veuillez vous reconnecter.",
        );
      }

      // INSERT dans agent_buy_requests
      const { error } = await supabase.from("agent_buy_requests").insert({
        user_id: currentUser.id,
        agent_id: selectedAgent.uid,
        acset_amount: qty,
        status: "pending",
      });

      if (error) throw error;

      Alert.alert(
        "Demande envoyée",
        "Votre demande d’achat ACSET a été envoyée à l’Agent.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e: any) {
      console.log("SUBMIT_BUY_REQUEST_ERROR:", e);
      Alert.alert(
        "Erreur",
        e?.message || "Impossible d'envoyer la demande. Réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acheter des ACSET</Text>
      <Text style={styles.subtitle}>
        Choisissez un Agent RZ et indiquez la quantité d’ACSET à acheter.
      </Text>

      {/* Montant */}
      <Text style={styles.label}>Montant ACSET</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex : 150"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Liste des agents */}
      <Text style={[styles.label, { marginTop: 18 }]}>Choisir un Agent RZ</Text>

      {loadingAgents ? (
        <ActivityIndicator size="small" color="#FFD700" />
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.uid}
          style={{ maxHeight: 260 }}
          ListEmptyComponent={
            <Text style={{ color: "#888", marginTop: 10 }}>
              Aucun agent disponible pour le moment.
            </Text>
          }
          renderItem={({ item }) => {
            const isSelected = selectedAgent?.uid === item.uid;
            return (
              <TouchableOpacity
                onPress={() => setSelectedAgent(item)}
                style={[
                  styles.agentCard,
                  isSelected && styles.agentCardSelected,
                ]}
              >
                <Text style={styles.agentEmail}>
                  {item.email || "Agent sans email"}
                </Text>
                {isSelected && <Text style={styles.tagSelected}>SÉLECTIONNÉ</Text>}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Bouton */}
      <TouchableOpacity
        style={[styles.button, submitting && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Envoi en cours..." : "Envoyer la demande"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "#AAA",
    fontSize: 13,
    marginBottom: 20,
  },
  label: {
    color: "#DDD",
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFF",
    borderWidth: 1,
    borderColor: "#333",
  },
  agentCard: {
    backgroundColor: "#101010",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
    marginTop: 8,
  },
  agentCardSelected: {
    borderColor: "#FFD700",
  },
  agentEmail: {
    color: "#FFF",
    fontSize: 13,
  },
  tagSelected: {
    color: "#FFD700",
    fontSize: 11,
    marginTop: 4,
  },
  button: {
    marginTop: 22,
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },
});
