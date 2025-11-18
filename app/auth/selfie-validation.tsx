import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { CameraView, useCameraPermissions } from "expo-camera";
import { supabase } from "../../lib/supabase";

// ==========================================================
// 🔥 PAGE : Selfie obligatoire après inscription
// ==========================================================

export default function SelfieValidation() {
  const router = useRouter();
  const { uid } = useLocalSearchParams(); // ID du nouvel utilisateur
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Premium Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  // ==========================================================
  // 🔥 Demande permission caméra
  // ==========================================================
  useEffect(() => {
    (async () => {
      if (!permission || !permission.granted) {
        await requestPermission();
      }
    })();
  }, [permission]);

  if (!permission) return <View />;
  if (!permission.granted)
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff", marginBottom: 20 }}>
          Permission caméra requise
        </Text>
        <TouchableOpacity style={styles.btnGold} onPress={requestPermission}>
          <Text style={styles.btnText}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );

  // ==========================================================
  // 📸 Prendre selfie
  // ==========================================================
  const takeSelfie = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
      });

      setPreview(photo.uri);
    } catch (e) {
      showAlert("Impossible de prendre le selfie.");
    }
  };

  // ==========================================================
  // 🔥 Valider selfie → enregistrer dans Supabase
  // ==========================================================
  const validateSelfie = async () => {
    if (!preview) return showAlert("Prenez un selfie avant de valider.");

    setLoading(true);

    try {
      // 1️⃣ Upload selfie dans Storage Supabase
      const response = await fetch(preview);
      const blob = await response.blob();

      const path = `selfies/${uid}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("selfies")
        .upload(path, blob, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      // 2️⃣ Récupérer l’URL publique
      const { data: publicData } = supabase.storage
        .from("selfies")
        .getPublicUrl(path);

      const selfieUrl = publicData.publicUrl;

      // 3️⃣ Mettre à jour le profil dans la table users
      const { error: dbError } = await supabase
        .from("users")
        .update({
          selfie_url: selfieUrl,
          verification_status: "selfie-validated",
          updated_at: new Date(),
        })
        .eq("uid", uid);

      if (dbError) throw dbError;

      // 4️⃣ Message de succès
      showAlert("Selfie validé ✔ Bienvenue dans RHAZN.");

      setTimeout(() => {
        setAlertVisible(false);
        router.replace("/auth/login");
      }, 900);
    } catch (e) {
      console.log("SELFIE_SUPABASE_ERROR:", e);
      showAlert("Erreur lors de l’enregistrement du selfie.");
    }

    setLoading(false);
  };

  // ==========================================================
  // UI
  // ==========================================================
  return (
    <View style={styles.full}>
      <Text style={styles.title}>Validation d'identité</Text>
      <Text style={styles.subtitle}>
        Prenez un selfie clair pour confirmer que la pièce vous appartient.
      </Text>

      {!preview ? (
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
      ) : (
        <Image source={{ uri: preview }} style={styles.preview} />
      )}

      {!preview ? (
        <TouchableOpacity style={styles.btnGold} onPress={takeSelfie}>
          <Text style={styles.btnText}>Prendre le selfie</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity style={styles.btnGold} onPress={validateSelfie}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>Valider mon selfie</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnGrey}
            onPress={() => setPreview(null)}
          >
            <Text style={styles.btnGreyTxt}>Recommencer</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Modal Premium */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>RHAZN</Text>
            <Text style={styles.modalMsg}>{alertMessage}</Text>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.modalBtnTxt}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/********************* STYLES *********************/
const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: "#000", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  title: {
    color: "#FFD700",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 30,
  },
  subtitle: {
    color: "#bbb",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 10,
  },

  camera: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },

  preview: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },

  btnGold: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 15,
  },
  btnText: { color: "#000", textAlign: "center", fontWeight: "800" },

  btnGrey: {
    backgroundColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  btnGreyTxt: {
    color: "#ccc",
    textAlign: "center",
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#0B0B0B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFD70055",
    padding: 22,
    alignItems: "center",
  },
  modalTitle: { color: "#FFD700", fontSize: 20, fontWeight: "800" },
  modalMsg: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 12,
  },
  modalBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  modalBtnTxt: { color: "#000", fontWeight: "700" },
});
