// app/agent-pin.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";
import AgentGuard from "./components/AgentGuard";

const GOLD = "#D4AF37";
const WHITE = "#FFFFFF";
const GRAY = "#8E8E93";

export default function AgentPinScreen() {
  return (
    <AgentGuard>
      <AgentPinContent />
    </AgentGuard>
  );
}

function AgentPinContent() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState<boolean>(false);

  // set pin
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");

  // change pin
  const [oldPin, setOldPin] = useState("");

  const [saving, setSaving] = useState(false);

  const title = useMemo(() => (hasPin ? "Sécurité Agent" : "Configurer le PIN"), [hasPin]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        const uid = session?.session?.user?.id;
        if (!uid) {
          setHasPin(false);
          return;
        }

        const { data, error } = await supabase
          .from("agents")
          .select("pin_hash")
          .eq("uid", uid)
          .maybeSingle();

        // si pas d’agent row ou erreur, on reste safe
        if (error || !data) {
          setHasPin(false);
        } else {
          setHasPin(!!data.pin_hash);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const validatePin = (p: string) => /^\d{4,8}$/.test(p); // 4 à 8 chiffres (simple & premium)

  const onSave = async () => {
    if (saving) return;

    const np = newPin.trim();
    const cnp = confirmNewPin.trim();

    if (!validatePin(np)) {
      Alert.alert("PIN invalide", "Le PIN doit contenir 4 à 8 chiffres.");
      return;
    }
    if (np !== cnp) {
      Alert.alert("Confirmation", "Les deux PIN ne correspondent pas.");
      return;
    }

    setSaving(true);
    try {
      if (!hasPin) {
        // first set
        const { error } = await supabase.rpc("agent_set_pin", { p_new_pin: np });
        if (error) {
          Alert.alert("Erreur", error.message);
          return;
        }
        Alert.alert("OK", "PIN configuré avec succès.", [{ text: "OK", onPress: () => router.back() }]);
      } else {
        // change pin
        const op = oldPin.trim();
        if (!validatePin(op)) {
          Alert.alert("Ancien PIN", "Veuillez entrer l’ancien PIN (4 à 8 chiffres).");
          return;
        }
        const { error } = await supabase.rpc("agent_change_pin", {
          p_old_pin: op,
          p_new_pin: np,
        });
        if (error) {
          Alert.alert("Erreur", error.message);
          return;
        }
        Alert.alert("OK", "PIN modifié avec succès.", [{ text: "OK", onPress: () => router.back() }]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={26} color={GOLD} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 26 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={styles.hint}>
              {hasPin
                ? "Pour valider des demandes, le PIN est requis."
                : "Définissez un PIN pour sécuriser vos validations."}
            </Text>

            {hasPin && (
              <>
                <Text style={styles.label}>Ancien PIN</Text>
                <TextInput
                  value={oldPin}
                  onChangeText={setOldPin}
                  style={styles.input}
                  placeholder="••••"
                  placeholderTextColor={GRAY}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={8}
                />
              </>
            )}

            <Text style={styles.label}>{hasPin ? "Nouveau PIN" : "Créer un PIN"}</Text>
            <TextInput
              value={newPin}
              onChangeText={setNewPin}
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={GRAY}
              keyboardType="numeric"
              secureTextEntry
              maxLength={8}
            />

            <Text style={styles.label}>Confirmer</Text>
            <TextInput
              value={confirmNewPin}
              onChangeText={setConfirmNewPin}
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={GRAY}
              keyboardType="numeric"
              secureTextEntry
              maxLength={8}
            />

            <TouchableOpacity
              onPress={onSave}
              disabled={saving}
              style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryText}>{hasPin ? "METTRE À JOUR" : "ENREGISTRER"}</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              • Le PIN est chiffré (jamais stocké en clair).{"\n"}
              • Requis pour accepter les demandes utilisateur.{"\n"}
              • 4 à 8 chiffres.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: { padding: 4 },

  headerTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  body: { paddingHorizontal: 20, paddingTop: 10 },

  hint: { color: GRAY, fontSize: 13, marginBottom: 18, lineHeight: 18 },

  label: { color: WHITE, fontSize: 13, marginBottom: 6, fontWeight: "600" },

  input: {
    backgroundColor: "#0b0b0b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1c1c1e",
    color: WHITE,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 16,
    letterSpacing: 6,
    textAlign: "center",
  },

  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  primaryText: { color: "#000", fontWeight: "900", letterSpacing: 0.5 },

  note: { color: GRAY, fontSize: 12, marginTop: 16, lineHeight: 18 },
});
