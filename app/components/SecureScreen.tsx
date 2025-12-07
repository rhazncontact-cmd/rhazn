// app/components/SecureScreen.tsx
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";

type Props = {
  children: React.ReactNode;
  scope?: string; // ex: "Profil", "Wallet", "Vente ACSET"
};

export default function SecureScreen({ children, scope = "RHAZN" }: Props) {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [checkingPin, setCheckingPin] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const secureAccess = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: `Sécurité ${scope}`,
            fallbackLabel: "Utiliser le PIN",
            cancelLabel: "Annuler",
          });

          if (result.success) {
            setAuthorized(true);
            setBooting(false);
            return;
          }

          // Biométrie dispo mais refusée/échouée → PIN
          setPinRequired(true);
          setBooting(false);
          return;
        }

        // Pas de biométrie → PIN directement
        setPinRequired(true);
        setBooting(false);
      } catch (e) {
        console.log("SECURE_SCREEN_ERROR:", e);
        // En cas de bug matériel → PIN
        setPinRequired(true);
        setBooting(false);
      }
    };

    secureAccess();
  }, [scope]);

  const verifyPin = async () => {
    if (pinInput.length < 4) {
      Alert.alert("Erreur", "PIN invalide (min. 4 chiffres).");
      return;
    }

    try {
      setCheckingPin(true);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;

      if (!uid) {
        Alert.alert("Erreur", "Session expirée.");
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("security_pin")
        .eq("uid", uid)
        .single();

      if (error || !data) {
        Alert.alert("Erreur système", "Impossible de vérifier le PIN.");
        router.replace("/dashboard");
        return;
      }

      if (!data.security_pin) {
        Alert.alert(
          "PIN non défini",
          "Aucun PIN n’est enregistré pour votre compte."
        );
        router.replace("/dashboard");
        return;
      }

      if (data.security_pin !== pinInput) {
        Alert.alert("Accès refusé", "PIN incorrect.");
        router.replace("/dashboard");
        return;
      }

      // ✅ PIN correct → accès accordé
      setAuthorized(true);
      setPinRequired(false);
    } finally {
      setCheckingPin(false);
    }
  };

  // Écran de boot pendant la détection biométrie / PIN
  if (booting) {
    return (
      <View style={styles.bootWrap}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.bootText}>Sécurisation de l’accès…</Text>
      </View>
    );
  }

  // Tant que pas autorisé, on bloque le contenu derrière (overlay PIN)
  if (!authorized && pinRequired) {
    return (
      <View style={styles.lockedWrap}>
        <Modal transparent visible animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {scope} — Vérification PIN
              </Text>

              <Text style={styles.modalSubtitle}>
                Face ID / empreinte indisponible ou refusée.
                {"\n"}Veuillez saisir votre PIN de sécurité.
              </Text>

              <TextInput
                value={pinInput}
                onChangeText={setPinInput}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                placeholder="••••"
                placeholderTextColor="#777"
                style={styles.pinInput}
              />

              <TouchableOpacity
                style={[styles.modalBtn, checkingPin && { opacity: 0.6 }]}
                onPress={verifyPin}
                disabled={checkingPin}
              >
                {checkingPin ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.modalBtnText}>VALIDER</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#333" }]}
                onPress={() => {
                  Alert.alert(
                    "Sécurité",
                    "Accès annulé.",
                    [{ text: "OK", onPress: () => router.replace("/dashboard") }],
                  );
                }}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  ANNULER
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ✅ Autorisé → on affiche la page normalement
  return <>{children}</>;
}

const styles = StyleSheet.create({
  bootWrap: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  bootText: { color: "#aaa", marginTop: 10 },

  lockedWrap: {
    flex: 1,
    backgroundColor: "#000",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  modalBox: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 20,
  },

  modalTitle: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },

  modalSubtitle: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },

  pinInput: {
    backgroundColor: "#000",
    borderColor: GOLD,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    letterSpacing: 6,
    textAlign: "center",
    fontSize: 20,
    marginBottom: 14,
  },

  modalBtn: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },

  modalBtnText: {
    textAlign: "center",
    fontWeight: "800",
    color: "#000",
  },
});
