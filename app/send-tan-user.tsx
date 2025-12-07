// app/send-tan-user.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useWallet } from "../context/WalletContext";
import UserSearch, { SimpleUser } from "./components/UserSearch";

/***********************************************
 * 🎯 FRAIS RHAZN (2% min 1 TAN)
 ***********************************************/
function computeFees(amount: number): number {
  return Math.max(1, Math.ceil(amount * 0.02));
}

/***********************************************
 * 🔒 RÈGLES OFFICIELLES TRANSFERT TAN
 * MIN = 500 TAN
 * MAX = 100 000 TAN
 ***********************************************/
const MIN_SEND = 500;
const MAX_SEND = 100000;

// ===== Mock Users (à remplacer plus tard par Supabase) =====
const MOCK_USERS: SimpleUser[] = [
  { id: "RZ-BA-0001", name: "BA" },
  { id: "RZ-SRD-0002", name: "Sr Doc" },
  { id: "RZ-NEL-0003", name: "Nelcie" },
  { id: "RZ-SNS-0004", name: "Sinsin" },
];

export default function SendTanUser() {
  const router = useRouter();
  const { addTransaction } = useWallet() as any;

  const [selected, setSelected] = useState<SimpleUser | null>(null);
  const [amount, setAmount] = useState<string>("");

  const parsed = useMemo(() => {
    const a = Number(amount);
    const ok = Number.isFinite(a) && a > 0;

    const fees = ok ? computeFees(a) : 0;
    const net = ok ? Math.max(0, a - fees) : 0;

    return { ok, a, fees, net };
  }, [amount]);

  const confirm = () => {
    if (!selected)
      return Alert.alert("Choix requis", "Sélectionnez un destinataire.");

    if (!parsed.ok)
      return Alert.alert("Montant invalide", "Veuillez entrer un montant TAN valide.");

    // 🔒 Validation règles RHAZN
    if (parsed.a < MIN_SEND) {
      return Alert.alert(
        "Montant insuffisant",
        `Le minimum pour envoyer est de ${MIN_SEND} TAN.`
      );
    }

    if (parsed.a > MAX_SEND) {
      return Alert.alert(
        "Montant trop élevé",
        `Le maximum d’envoi est de ${MAX_SEND} TAN.`
      );
    }

    // Enregistrement local mock
    try {
      if (typeof addTransaction === "function") {
        addTransaction({
          type: "SEND_TAN",
          amount: parsed.a,
          fees: parsed.fees,
          net: parsed.net,
          to: selected.id,
          at: Date.now(),
        });
      }
    } catch {}

    Alert.alert(
      "Confirmation",
      `Envoi de ${parsed.a} TAN à ${selected.name} (${selected.id})\nFrais : ${parsed.fees} TAN\nNet reçu : ${parsed.net} TAN`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#000" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Envoyer TAN</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Recherche utilisateur */}
        <Text style={styles.label}>Destinataire</Text>
        <UserSearch data={MOCK_USERS} onSelect={setSelected} />

        {selected && (
          <View style={styles.selectedBox}>
            <Text style={styles.selTxt}>
              À : <Text style={styles.selVal}>{selected.name}</Text>
            </Text>
            <Text style={styles.selId}>{selected.id}</Text>
          </View>
        )}

        {/* Montant */}
        <Text style={[styles.label, { marginTop: 16 }]}>Montant TAN</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Ex: 1200"
          placeholderTextColor="#777"
          style={styles.input}
        />

        {/* Récap */}
        <View style={styles.feeBox}>
          <Row k="Montant saisi" v={`${parsed.a || 0} TAN`} />
          <Row k="Frais (RHAZN)" v={`${parsed.fees} TAN`} />
          <Row k="Net reçu" v={`${parsed.net} TAN`} strong />
        </View>

        {/* Bouton */}
        <TouchableOpacity
          onPress={confirm}
          style={[
            styles.btn,
            { opacity: selected && parsed.ok ? 1 : 0.5 },
          ]}
          disabled={!selected || !parsed.ok}
        >
          <Text style={styles.btnTxt}>Confirmer l’envoi</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text
        style={[styles.k, strong && { color: "#fff", fontWeight: "800" }]}
      >
        {k}
      </Text>
      <Text
        style={[
          styles.v,
          strong && { color: "#FFD700", fontWeight: "800" },
        ]}
      >
        {v}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#1b1b1b",
  },
  headerTitle: { color: "#D4AF37", fontSize: 18, fontWeight: "700" },

  label: { color: "#aaa", marginBottom: 6, marginTop: 6 },

  input: {
    color: "#fff",
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  selectedBox: {
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  selTxt: { color: "#aaa" },
  selVal: { color: "#fff", fontWeight: "700" },
  selId: { color: "#888", marginTop: 4 },

  feeBox: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  k: { color: "#aaa" },
  v: { color: "#fff" },

  btn: {
    backgroundColor: "#D4AF37",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
  },
  btnTxt: { color: "#000", textAlign: "center", fontWeight: "800" },
});
