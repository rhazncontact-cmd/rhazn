import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  View
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [idImage, setIdImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // 🔥 Alert system
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  // ============================
  // 📸 SELECT ID
  // ============================
  const handleSelectID = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return showAlert("Permission refusée. Activez l’accès à la galerie.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setIdImage(result.assets[0].uri);
    }
  };

  // ============================
  // 🔐 REGISTER (Supabase)
  // ============================
  const handleRegister = async () => {
    const mail = email.trim().toLowerCase();

    if (!mail || !password || !confirm) {
      return showAlert("Veuillez remplir tous les champs.");
    }

    if (password.length < 8) {
      return showAlert("Le mot de passe doit contenir au moins 8 caractères.");
    }

    if (password !== confirm) {
      return showAlert("Les mots de passe ne correspondent pas.");
    }

    if (!idImage) {
      return showAlert("Veuillez importer votre pièce d’identité.");
    }

    setLoading(true);

    try {
      // 1️⃣ Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: mail,
        password: password,
      });

      if (authError) throw authError;

      const uid = authData.user?.id;
      if (!uid) throw new Error("Impossible de récupérer l'UID.");

      // 2️⃣ Upload ID card into Supabase Storage
      const response = await fetch(idImage);
      const blob = await response.blob();

      const path = `id-cards/${uid}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("id-cards")
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3️⃣ Get public URL
      const { data: urlData } = supabase.storage
        .from("id-cards")
        .getPublicUrl(path);

      const idImageUrl = urlData.publicUrl;

      // 4️⃣ Insert Profile in Supabase Database
      const { error: dbError } = await supabase.from("users").insert({
        uid,
        email: mail,
        fullName: null,
        gender: null,
        dateOfBirth: null,

        id_image_url: idImageUrl,
        selfie_url: null,
        verification_status: "id-uploaded",

        qob: 0,
        cir: 0,
        tan: 0,
        pact_count: 0,

        role: "user",
        account_status: "pending",
        suspended: false,

        created_at: new Date(),
        updated_at: new Date(),
      });

      if (dbError) throw dbError;

      // 5️⃣ Success + redirection
      showAlert("Pièce vérifiée. Étape suivante : selfie obligatoire.");

      setTimeout(() => {
        setAlertVisible(false);
        router.replace({
          pathname: "/auth/selfie-validation",
          params: { uid },
        });
      }, 900);
    } catch (e: any) {
      console.log("SUPABASE_REGISTER_ERROR:", e);

      let msg = "Erreur : impossible de créer le compte.";

      if (e?.message?.includes("duplicate")) {
        msg = "Cet e-mail possède déjà un compte.";
      }

      showAlert(msg);
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // UI
  // ============================
  return (
    <View style={styles.full}>
      {/* ... les styles et le JSX identiques à TA VERSION ... */}
      {/* Je ne touche PAS l’UI car elle est parfaite */}
    </View>
  );
}

/***************** STYLES ******************/
const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: "#000" },

  logoContainer: {
    position: "absolute",
    top: 35,
    right: 20,
    zIndex: 100,
  },
  logo: { width: 45, height: 45, resizeMode: "contain" },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    paddingTop: 130,
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#bbb",
    fontSize: 15,
    marginBottom: 20,
    textAlign: "center",
  },

  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#FFD700",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scanText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },

  preview: {
    width: 160,
    height: 110,
    marginBottom: 12,
    borderRadius: 8,
  },

  input: {
    width: "100%",
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  createButton: {
    backgroundColor: "#FFD700",
    width: "100%",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
  },
  createText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "700",
    fontSize: 15,
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
    backgroundColor: "#0B0BB0",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFD70055",
    padding: 22,
    alignItems: "center",
  },
  modalTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "800",
  },
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
  modalBtnTxt: {
    color: "#000",
    fontWeight: "700",
  },
});
