import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

/* 🎨 */
const COLORS = {
  bg: "#000",
  card: "#0E0E0E",
  gold: "#D4AF37",
  white: "#FFF",
  gray: "#9A9A9A",
  border: "rgba(255,255,255,0.12)",
};

export default function ReplaceWork() {
  const router = useRouter();
  const { work_id } = useLocalSearchParams<{ work_id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<any>(null);
  const [category, setCategory] = useState<string>("");

  /* ===================== LOAD WORK ===================== */
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("store_products")
        .select("title, description, category_code")
        .eq("id", work_id)
        .single();

      if (data) {
        setTitle(data.title || "");
        setDescription(data.description || "");
        setCategory(data.category_code);
      }
      setLoading(false);
    };

    load();
  }, [work_id]);

  /* ===================== PICK FILE ===================== */
  const pickFile = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });

    if (!res.canceled) {
      setFile(res.assets[0]);
    }
  };

  /* ===================== REPLACE ===================== */
  const replace = async () => {
    if (!file) {
      Alert.alert("Fichier requis", "Veuillez sélectionner un nouveau fichier.");
      return;
    }

    setSaving(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      /* ---------- UPLOAD ---------- */
      const ext = file.uri.split(".").pop();
      const path = `replace/${user.id}/${work_id}-${Date.now()}.${ext}`;
      const blob = await fetch(file.uri).then((r) => r.blob());

      const { error: upErr } = await supabase.storage
        .from("works")
        .upload(path, blob, { upsert: true });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("works")
        .getPublicUrl(path);

      /* ---------- UPDATE WORK ---------- */
      const { error } = await supabase
        .from("store_products")
        .update({
          title,
          description,
          file_url: pub.publicUrl,
          cadna_status: "pending",
          is_on_hold: true,
          replaced_at: new Date().toISOString(),
        })
        .eq("id", work_id);

      if (error) throw error;

      Alert.alert(
        "Remplacement envoyé",
        "La nouvelle version est en attente de validation CADNA."
      );

      router.replace("/user-space/mes-creations");
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Échec du remplacement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.header}>Remplacer l’œuvre</Text>
      <Text style={styles.sub}>Catégorie : {category}</Text>

      <View style={styles.card}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titre"
          placeholderTextColor={COLORS.gray}
          style={styles.input}
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor={COLORS.gray}
          style={[styles.input, { height: 90 }]}
          multiline
        />

        <TouchableOpacity style={styles.pickBtn} onPress={pickFile}>
          <Text style={styles.pickText}>
            {file ? "Nouveau fichier sélectionné" : "Choisir un nouveau fichier"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={replace}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveText}>Envoyer pour validation</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 22, paddingTop: 70 },
  boot: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { color: COLORS.white, fontSize: 24, fontWeight: "900" },
  sub: { color: COLORS.gray, fontSize: 12, marginBottom: 18 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    backgroundColor: "#000",
    color: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickBtn: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  pickText: { color: COLORS.gold, textAlign: "center", fontWeight: "800" },
  saveBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveText: { color: "#000", fontWeight: "900", fontSize: 16 },
});
