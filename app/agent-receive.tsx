// app/agent-receive.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

export default function AgentReceive() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [tanAmount, setTanAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error" | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMsgType(type);
    setMsg(text);
  };

  // ============================================================
  // 🔥 RECEVOIR UN PAIEMENT TAN (converti en ACSET)
  // ============================================================
  const handleReceive = async () => {
    setMsg(null);
    setMsgType(null);

    const email = userEmail.trim().toLowerCase();
    const amount = parseInt(tanAmount, 10);

    if (!email || !email.endsWith("@gmail.com")) {
      showMessage("error", "Veuillez entrer un email Gmail utilisateur valide.");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      showMessage("error", "Montant TAN invalide.");
      return;
    }

    setLoading(true);

    try {
      // Vérification session agent
      const { data: sessionData } = await supabase.auth.getSession();
      const agentUid = sessionData.session?.user?.id;

      if (!agentUid) {
        showMessage("error", "Session expirée. Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }

      // Vérifier si l'utilisateur existe dans la table RHAZN
      const { data: userExists } = await supabase
        .from("users")
        .select("uid")
        .eq("email", email)
        .maybeSingle();

      if (!userExists) {
        showMessage("error", "Aucun utilisateur RHAZN trouvé avec cet email.");
        setLoading(false);
        return;
      }

      // Appel RPC Supabase (procédure sécurisée)
      const { error } = await supabase.rpc("agent_receive_payment", {
        p_agent_uid: agentUid,
        p_user_email: email,
        p_tan_amount: amount,
      });

      if (error) {
        console.log("AGENT_RECEIVE_ERROR:", error);

        if (error.message.includes("insufficient")) {
          showMessage("error", "Solde TAN utilisateur insuffisant.");
        } else {
          showMessage(
            "error",
            error.message || "Opération impossible. Réessayez."
          );
        }
      } else {
        showMessage(
          "success",
          "Paiement reçu avec succès. Le TAN a été converti automatiquement en ACSET."
        );
        setTanAmount("");
        setUserEmail("");
      }
    } catch (e: any) {
      console.log("AGENT_RECEIVE_FATAL:", e);
      showMessage("error", "Erreur inattendue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.title}>Recevoir Paiement</Text>

        <View style={{ width: 28 }} />
      </View>

      <View style={styles.body}>
        {/* Email utilisateur */}
        <Text style={styles.label}>Email de l’utilisateur (Gmail)</Text>
        <TextInput
          style={styles.input}
          placeholder="utilisateur@gmail.com"
          placeholderTextColor="#777"
          value={userEmail}
          onChangeText={setUserEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Montant TAN */}
        <Text style={styles.label}>Montant TAN à recevoir</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex. 250"
          placeholderTextColor="#777"
          value={tanAmount}
          onChangeText={setTanAmount}
          keyboardType="numeric"
        />

        {/* Bouton */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleReceive}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Confirmer le paiement</Text>
          )}
        </TouchableOpacity>

        {/* Message résultat */}
        {msg && (
          <View
            style={[
              styles.msgBox,
              msgType === "error" ? styles.msgError : styles.msgSuccess,
            ]}
          >
            <Text style={styles.msgText}>{msg}</Text>
          </View>
        )}

        {/* Notes */}
        <Text style={styles.note}>
          • Le TAN est débité du portefeuille utilisateur.{"\n"}
          • Votre solde Agent reçoit des ACSET automatiquement selon les règles RHAZN.{"\n"}
          • L’opération est enregistrée dans votre historique RHAZN.
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "800",
  },

  body: { paddingHorizontal: 20, paddingTop: 20 },

  label: { color: "#fff", marginBottom: 6, fontSize: 14 },

  input: {
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    fontSize: 14,
  },

  button: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },

  buttonText: { color: "#000", fontWeight: "800", fontSize: 15 },

  msgBox: {
    marginTop: 14,
    padding: 10,
    borderRadius: 8,
  },

  msgError: { backgroundColor: "#451a1a" },

  msgSuccess: { backgroundColor: "#14532d" },

  msgText: { color: "#fff", fontSize: 13, textAlign: "center" },

  note: {
    color: "#888",
    fontSize: 12,
    marginTop: 20,
    lineHeight: 18,
    textAlign: "left",
  },
});
