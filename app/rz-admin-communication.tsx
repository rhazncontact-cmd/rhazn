import { useRouter } from "expo-router";
import { useState } from "react";
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
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

type Audience = "all" | "agents" | "users";

export default function RZAdminCommunication() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<"info" | "warning" | "alert">("info");
  const [targetAudience, setTargetAudience] = useState<Audience>("all");
  const [loading, setLoading] = useState(false);

  const isValid = title.trim() && body.trim();

  const publish = async () => {
    if (!isValid) {
      Alert.alert("Champs obligatoires", "Titre et message sont requis.");
      return;
    }

    try {
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      if (!data?.user) throw new Error("Session invalide.");

      // 1️⃣ Enregistrer le message dans la table rz_communication
      const { error } = await supabase.from("rz_communication").insert({
        title: title.trim(),
        body: body.trim(),
        level,
        target_audience: targetAudience,
        created_by: data.user.id,
        is_published: true,
      });

      if (error) throw error;

      // 2️⃣ Déclencher la fonction edge pour push ciblé
      try {
        await supabase.functions.invoke("send-rz-communication-push", {
          body: {
            title: title.trim(),
            body: body.trim(),
            target_audience: targetAudience,
          },
        });
      } catch (e) {
        console.log("PUSH_EDGE_ERROR:", e);
      }

      Alert.alert("Publié", "Le message RZ-Communication a été diffusé.");
      setTitle("");
      setBody("");
      setLevel("info");
      setTargetAudience("all");
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Publication impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#000" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        <Text style={styles.header}>RZ-Communication — Admin</Text>
        <Text style={styles.subtitle}>
          Publiez un message officiel. Il apparaîtra en temps réel dans la
          section RZ-Communication des utilisateurs ciblés.
        </Text>

        <Text style={styles.label}>Titre</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex : Maintenance programmée..."
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, { height: 140, textAlignVertical: "top" }]}
          multiline
          value={body}
          onChangeText={setBody}
          placeholder="Message détaillé..."
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Niveau</Text>
        <View style={styles.row}>
          {(["info", "warning", "alert"] as const).map((lvl) => (
            <TouchableOpacity
              key={lvl}
              onPress={() => setLevel(lvl)}
              style={[
                styles.chip,
                level === lvl && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  level === lvl && { color: "#000" },
                ]}
              >
                {lvl.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Cible</Text>
        <View style={styles.row}>
          {(
            [
              { key: "all", label: "Tous" },
              { key: "agents", label: "Agents" },
              { key: "users", label: "Utilisateurs" },
            ] as { key: Audience; label: string }[]
          ).map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setTargetAudience(item.key)}
              style={[
                styles.chip,
                targetAudience === item.key && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  targetAudience === item.key && { color: "#000" },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !isValid && { opacity: 0.4 }]}
          onPress={publish}
          disabled={!isValid || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Publication..." : "Publier & Notifier"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { color: GOLD, fontSize: 22, fontWeight: "800", marginBottom: 10 },
  subtitle: { color: "#aaa", fontSize: 13, marginBottom: 24 },
  label: {
    color: "#ccc",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  row: { flexDirection: "row", marginTop: 6, marginBottom: 16 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GOLD,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: GOLD,
  },
  chipText: { color: GOLD, fontSize: 12, fontWeight: "700" },
  button: {
    marginTop: 16,
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { fontWeight: "800", fontSize: 15 },
});
