import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#FFD700";

export default function ApplyAgent() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [cityOfBirth, setCityOfBirth] = useState("");

  const [idDoc, setIdDoc] = useState<any>(null);
  const [selfie, setSelfie] = useState<any>(null);
  const [depositSlip, setDepositSlip] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const isValid =
    fullName &&
    firstName &&
    cityOfBirth &&
    idDoc &&
    selfie &&
    depositSlip;

  // ============================
  // ✅ UPLOAD IMAGE
  // ============================
  const pickImage = async (setter: any) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) setter(result.assets[0]);
  };

  const uploadFile = async (file: any, bucket: string) => {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const filePath = `${Date.now()}-${Math.random()}.jpg`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob);

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  // ============================
  // ✅ SOUMISSION OFFICIELLE
  // ============================
  const submitForm = async () => {
    if (!isValid) {
      Alert.alert("Formulaire incomplet", "Tous les champs sont obligatoires.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Session invalide.");

      const idUrl = await uploadFile(idDoc, "agent-ids");
      const selfieUrl = await uploadFile(selfie, "agent-selfies");
      const depositUrl = await uploadFile(depositSlip, "agent-deposits");

      const { error } = await supabase.from("agent_applications").insert({
        user_uid: user.id,
        email: user.email,
        full_name: fullName.trim(),
        first_name: firstName.trim(),
        city_of_birth: cityOfBirth.trim(),

        id_document_url: idUrl,
        selfie_url: selfieUrl,
        deposit_slip_url: depositUrl,

        acset_amount: 1000,
        deposit_amount: 1000,

        status: "PENDING",
      });

      if (error) throw error;

      Alert.alert(
        "Demande enregistrée",
        "Votre dossier Agent RHAZN (ED) est en cours de vérification."
      );
      router.replace("/dashboard");
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Soumission impossible.");
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // ✅ UI
  // ============================

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#000" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ color: GOLD, fontSize: 22, marginBottom: 20 }}>
          Demande d’Accréditation — Agent RHAZN (ED)
        </Text>

        <Text style={{ color: "#ccc" }}>Nom *</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

        <Text style={{ color: "#ccc" }}>Prénom *</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

        <Text style={{ color: "#ccc" }}>Ville de naissance *</Text>
        <TextInput style={styles.input} value={cityOfBirth} onChangeText={setCityOfBirth} />

        <TouchableOpacity style={styles.upload} onPress={() => pickImage(setIdDoc)}>
          <Text style={styles.uploadText}>📄 Pièce d’Identité</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.upload} onPress={() => pickImage(setSelfie)}>
          <Text style={styles.uploadText}>🤳 Selfie Biométrique</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.upload} onPress={() => pickImage(setDepositSlip)}>
          <Text style={styles.uploadText}>🧾 Fiche de Dépôt (1 000 HTG)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submit, !isValid && { opacity: 0.5 }]}
          onPress={submitForm}
          disabled={!isValid || loading}
        >
          <Text style={{ fontWeight: "bold" }}>
            {loading ? "Envoi..." : "Soumettre la Demande Officielle"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  input: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  upload: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: GOLD,
  },
  uploadText: { color: GOLD, textAlign: "center" },
  submit: {
    backgroundColor: GOLD,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
};
