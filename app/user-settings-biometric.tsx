import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import SecureScreen from "./components/SecureScreen";

const GOLD = "#D4AF37";
const BIOMETRIC_KEY = "RHAZN_BIOMETRIC_ENABLED";

export default function SettingsBiometric() {
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);

  // ---------- INIT ----------
  useEffect(() => {
    const init = async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setSupported(hasHardware && isEnrolled);

      const saved = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      setEnabled(saved === "true");

      setLoading(false);
    };
    init();
  }, []);

  // ---------- TOGGLE ----------
  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Activer la sécurité biométrique RHAZN",
        fallbackLabel: "Utiliser le code",
      });

      if (!res.success) {
        Alert.alert("Échec", "Authentification biométrique refusée.");
        return;
      }
    }

    setEnabled(value);
    await SecureStore.setItemAsync(BIOMETRIC_KEY, value ? "true" : "false");
  };

  if (loading)
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );

  return (
    <SecureScreen scope="Biométrie">
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Sécurité Biométrique</Text>

        {!supported ? (
          <Text style={styles.warning}>
            Votre appareil ne supporte pas la biométrie.
          </Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>
              Déverrouillage par Empreinte / FaceID
            </Text>

            <Switch
              value={enabled}
              onValueChange={toggleBiometric}
              thumbColor={enabled ? GOLD : "#666"}
              trackColor={{ false: "#333", true: "#6b5c1b" }}
            />

            <Text style={styles.hint}>
              Active une sécurité supplémentaire à chaque ouverture de l’app.
            </Text>
          </View>
        )}
      </ScrollView>
    </SecureScreen>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },

  boot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: GOLD,
    marginBottom: 20,
  },

  warning: {
    color: "#FF5C5C",
    fontSize: 14,
    marginTop: 20,
  },

  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderColor: "#333",
    borderWidth: 1,
    padding: 16,
  },

  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  hint: {
    color: "#888",
    fontSize: 12,
    marginTop: 10,
  },
});
