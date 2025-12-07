import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const GOLD = "#D4AF37";
const PIN_KEY = "RHAZN_USER_PIN";

export default function PinSecurity() {
  const router = useRouter();

  const [mode, setMode] = useState<"create" | "verify" | "change">("verify");
  const [step, setStep] = useState<1 | 2>(1);

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [oldPin, setOldPin] = useState("");

  // --------------------------------------------
  // 🔐 INITIAL MODE
  // --------------------------------------------
  useEffect(() => {
    (async () => {
      const storedPin = await SecureStore.getItemAsync(PIN_KEY);
      if (!storedPin) setMode("create");
    })();
  }, []);

  // --------------------------------------------
  // ✅ CREATE PIN
  // --------------------------------------------
  const createPin = async () => {
    if (pin.length !== 4 || confirm.length !== 4)
      return Alert.alert("PIN invalide", "Le PIN doit contenir 4 chiffres.");

    if (pin !== confirm)
      return Alert.alert("Erreur", "Les 2 PIN ne correspondent pas.");

    await SecureStore.setItemAsync(PIN_KEY, pin);

    Alert.alert("Succès ✅", "PIN sécurisé enregistré.");
    reset();
    router.back();
  };

  // --------------------------------------------
  // ✅ VERIFY PIN
  // --------------------------------------------
  const verifyPin = async () => {
    const saved = await SecureStore.getItemAsync(PIN_KEY);

    if (!saved || pin !== saved) {
      return Alert.alert("Accès refusé", "PIN incorrect.");
    }

    Alert.alert("Accès autorisé ✅", "Authentification réussie.");
    reset();
    router.back();
  };

  // --------------------------------------------
  // ✅ CHANGE PIN
  // --------------------------------------------
  const changePin = async () => {
    const saved = await SecureStore.getItemAsync(PIN_KEY);

    if (oldPin !== saved)
      return Alert.alert("Erreur", "Ancien PIN incorrect.");

    if (pin.length !== 4 || confirm.length !== 4)
      return Alert.alert("Erreur", "Le nouveau PIN doit contenir 4 chiffres.");

    if (pin !== confirm)
      return Alert.alert("Erreur", "Les nouveaux PIN ne correspondent pas.");

    await SecureStore.setItemAsync(PIN_KEY, pin);

    Alert.alert("Succès ✅", "PIN modifié avec succès.");
    reset();
    router.back();
  };

  const reset = () => {
    setPin("");
    setConfirm("");
    setOldPin("");
    setStep(1);
  };

  // --------------------------------------------
  // UI
  // --------------------------------------------
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color={GOLD} />
        </TouchableOpacity>
        <Text style={styles.title}>Sécurité PIN</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* MODE SWITCH */}
      <View style={styles.tabs}>
        <Tab label="Créer" active={mode === "create"} onPress={() => setMode("create")} />
        <Tab label="Vérifier" active={mode === "verify"} onPress={() => setMode("verify")} />
        <Tab label="Changer" active={mode === "change"} onPress={() => setMode("change")} />
      </View>

      {/* FORM */}
      <View style={styles.card}>
        {mode === "create" && (
          <>
            <PinInput label="Nouveau PIN" value={pin} onChange={setPin} />
            <PinInput label="Confirmer PIN" value={confirm} onChange={setConfirm} />
            <PrimaryButton title="ENREGISTRER" onPress={createPin} />
          </>
        )}

        {mode === "verify" && (
          <>
            <PinInput label="Votre PIN" value={pin} onChange={setPin} />
            <PrimaryButton title="VÉRIFIER" onPress={verifyPin} />
          </>
        )}

        {mode === "change" && (
          <>
            <PinInput label="Ancien PIN" value={oldPin} onChange={setOldPin} />
            <PinInput label="Nouveau PIN" value={pin} onChange={setPin} />
            <PinInput
              label="Confirmer nouveau PIN"
              value={confirm}
              onChange={setConfirm}
            />
            <PrimaryButton title="MODIFIER" onPress={changePin} />
          </>
        )}
      </View>
    </View>
  );
}

/* ---------------- COMPONENTS ---------------- */

function PinInput({ label, value, onChange }) {
  return (
    <View style={styles.inputBox}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        secureTextEntry
        maxLength={4}
        style={styles.input}
        placeholder="••••"
        placeholderTextColor="#555"
      />
    </View>
  );
}

function PrimaryButton({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );
}

function Tab({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tab, active && styles.activeTab]}
    >
      <Text style={[styles.tabText, active && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------------- STYLES APPLE TYPE ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  title: { color: GOLD, fontSize: 22, fontWeight: "800" },

  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },

  activeTab: {
    backgroundColor: GOLD,
    borderRadius: 16,
  },

  tabText: { color: "#888", fontWeight: "700" },
  activeTabText: { color: "#000" },

  card: {
    backgroundColor: "#111",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },

  inputBox: { marginBottom: 16 },
  label: { color: GOLD, marginBottom: 6, fontWeight: "700" },

  input: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 18,
    letterSpacing: 6,
    textAlign: "center",
  },

  btn: {
    backgroundColor: GOLD,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
  },

  btnText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#000",
    fontSize: 16,
  },
});
