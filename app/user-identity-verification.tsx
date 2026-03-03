// app/user-identity-verification.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Camera from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

const GOLD = "#D4AF37";
const ACTION_CODE = "IDENTITY_VERIFICATION"; // ✅ produit / catégorie

export default function UserIdentityVerification() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [user, setUser] = useState<any>(null);

  // ✅ pièces à soumettre
  const [identityDocUri, setIdentityDocUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);

  // ✅ déverrouillage après paiement
  const [paid, setPaid] = useState(false);

  /* ===================== LOAD PROFILE ===================== */
  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return router.replace("/auth/login");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (!error && data) setUser(data);
      setLoading(false);
    };

    load();
  }, []);

  const isReady = useMemo(
    () => !!identityDocUri && !!selfieUri,
    [identityDocUri, selfieUri]
  );

  /* ===================== APPLE-LIKE WARNING + PAYMENT ===================== */
  const confirmAndPay = async () => {
    if (paid) return true;
    if (paying) return false;

    return await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Vérification d’identité",
        "Cette action est payante et nécessite un document valide + un selfie.\n\nLe paiement est requis AVANT l’accès à la caméra ou à la galerie.\n\nSouhaitez-vous continuer ?",
        [
          { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Continuer",
            onPress: async () => {
              try {
                setPaying(true);

                // ✅ paiement sécurisé côté SQL (RPC)
                const { error } = await supabase.rpc("pay_before_action", {
                  p_action_code: ACTION_CODE,
                });

                if (error) {
                  Alert.alert("Paiement refusé", error.message);
                  setPaying(false);
                  return resolve(false);
                }

                setPaid(true);
                setPaying(false);
                resolve(true);
              } catch (e: any) {
                setPaying(false);
                Alert.alert(
                  "Erreur",
                  e?.message || "Impossible de finaliser le paiement."
                );
                resolve(false);
              }
            },
          },
        ]
      );
    });
  };

  /* ===================== PICK IDENTITY DOC ===================== */
  const pickIdentityDoc = async () => {
    const ok = await confirmAndPay();
    if (!ok) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!res.canceled) {
      setIdentityDocUri(res.assets[0].uri);
    }
  };

  /* ===================== TAKE SELFIE ===================== */
  const takeSelfie = async () => {
    const ok = await confirmAndPay();
    if (!ok) return;

    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission requise", "Accès caméra nécessaire.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.9,
    });

    if (!res.canceled) {
      setSelfieUri(res.assets[0].uri);
    }
  };

  /* ===================== SUBMIT CADNA ===================== */
  const submitToCadna = async () => {
    if (!paid) {
      Alert.alert(
        "Paiement requis",
        "Veuillez activer le service avant la soumission."
      );
      return;
    }

    if (!isReady) {
      Alert.alert(
        "Dossier incomplet",
        "Veuillez importer la pièce d’identité ET prendre un selfie."
      );
      return;
    }

    if (!user?.id) {
      Alert.alert("Erreur", "Profil introuvable.");
      return;
    }

    try {
      setSubmitting(true);

      // ✅ soumission CADNA (profil visible après validation)
      const { error } = await supabase
        .from("profiles")
        .update({
          identity_doc_url: identityDocUri, // (même logique que tes autres écrans)
          selfie_url: selfieUri,
          cadna_status: "pending",
          cadna_reject_reason: null,
          cadna_suggestions: null,
          profile_status: "submitted",
        })
        .eq("id", user.id);

      if (error) {
        Alert.alert("Erreur", error.message || "Soumission impossible.");
        return;
      }

      Alert.alert(
        "Soumission envoyée",
        "Votre identité est en cours de validation par CADNA."
      );

      router.replace("/user-profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <SecureScreen scope="Identity-Verification">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Vérification d’identité</Text>
        <Text style={styles.subtitle}>
          Service payant • Paiement avant accès caméra/galerie • Validation CADNA
          obligatoire
        </Text>

        {/* LOCKED INFO */}
        <View style={styles.lockedBox}>
          <Text style={styles.locked}>Email : {user?.email || "—"} 🔒</Text>
          <Text style={styles.locked}>
            Âge : {user?.age ? `${user.age} ans` : "—"} 🔒
          </Text>
          <Text style={styles.locked}>
            Ville de naissance : {user?.birth_city || "—"} 🔒
          </Text>
        </View>

        {/* ACTION STATE */}
        <View style={styles.stateRow}>
          <View
            style={[
              styles.stateDot,
              { backgroundColor: paid ? "#00C853" : "#F9A825" },
            ]}
          />
          <Text style={styles.stateText}>
            {paid
              ? "Service activé (paiement effectué)"
              : "Service non activé (paiement requis)"}
          </Text>
        </View>

        {/* DOC */}
        <UploadBlock
          label="Importer la pièce d’identité (galerie)"
          icon="image"
          onPress={pickIdentityDoc}
          done={!!identityDocUri}
          loading={paying}
        />

        {/* SELFIE */}
        <UploadBlock
          label="Prendre un selfie (caméra frontale)"
          icon="camera"
          onPress={takeSelfie}
          done={!!selfieUri}
          loading={paying}
        />

        {/* SUBMIT */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isReady || submitting) && { opacity: 0.6 },
          ]}
          onPress={submitToCadna}
          disabled={!isReady || submitting}
          activeOpacity={0.9}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.submitText}>Soumettre à CADNA</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </ScrollView>
    </SecureScreen>
  );
}

/* ===================== UI ===================== */

function UploadBlock({
  label,
  icon,
  onPress,
  done,
  loading,
}: {
  label: string;
  icon: any;
  onPress: () => void;
  done: boolean;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.uploadBox, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.9}
    >
      <Ionicons name={icon} size={22} color={GOLD} />
      <Text style={styles.uploadText}>{label}</Text>
      {done ? (
        <Feather name="check-circle" size={18} color="#00C853" />
      ) : (
        <Feather name="lock" size={18} color={GOLD} />
      )}
    </TouchableOpacity>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  boot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  subtitle: { color: "#aaa", fontSize: 13, marginBottom: 16, marginTop: 6 },

  lockedBox: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 14,
    borderColor: "#333",
    borderWidth: 1,
    marginBottom: 14,
  },
  locked: { color: "#888", fontSize: 13, marginBottom: 4 },

  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  stateDot: { width: 10, height: 10, borderRadius: 999 },
  stateText: { color: "#bbb", fontWeight: "700" },

  uploadBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 14,
  },
  uploadText: { color: "#fff", flex: 1, fontWeight: "600" },

  submitBtn: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
    alignItems: "center",
  },
  submitText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#000",
    fontSize: 16,
  },

  backBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#0f0f0f",
    alignItems: "center",
  },
  backText: { color: GOLD, fontWeight: "900" },
});
