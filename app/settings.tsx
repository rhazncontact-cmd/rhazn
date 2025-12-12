import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

const GOLD = "#D4AF37";

export default function SettingsUser() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uid, setUid] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  // ---------- LOAD USER ----------
  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userUid = auth?.user?.id;
      if (!userUid) return router.replace("/auth/login");

      setUid(userUid);

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("uid", userUid)
        .single();

      if (!data) return;

      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setCity(data.city || "");

      setLoading(false);
    };

    load();
  }, []);

  // ---------- SAVE ----------
  const saveProfile = async () => {
    if (!uid) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          city: city.trim(),
        })
        .eq("uid", uid);

      if (error) throw error;

      Alert.alert("Succès", "Profil mis à jour avec succès.");
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de sauvegarder.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- LOGOUT ----------
  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  // ---------- UI ----------
  if (loading)
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );

  return (
    <SecureScreen scope="Settings">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ✅ HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Réglages Utilisateur</Text>
        </View>

        {/* ✅ FORM */}
        <View style={styles.card}>
          <Label>Prénom</Label>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

          <Label>Nom</Label>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

          <Label>Email</Label>
          <TextInput
            style={[styles.input, styles.readonly]}
            value={email}
            editable={false}
          />

          <Label>Téléphone</Label>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

          <Label>Ville</Label>
          <TextInput style={styles.input} value={city} onChangeText={setCity} />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            onPress={saveProfile}
            disabled={saving}
          >
            <Text style={styles.saveText}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ✅ SÉCURITÉ / CONFIDENTIALITÉ / BIOMÉTRIE / LOGS */}
        <View style={styles.securityBox}>

          <SecurityItem
            label="Confidentialité & Mode Créateur"
            onPress={() => router.push("/settings-privacy")}
          />

          <SecurityItem
            label="Sécurité Biométrique"
            onPress={() => router.push("/settings-biometric")}
          />

          <SecurityItem
            label="Historique des Connexions"
            onPress={() => router.push("/login-history")}
          />

          <SecurityItem
            label="Sécurité & PIN"
            onPress={() => router.push("/security-pin")}
          />

          <SecurityItem
            label="Déconnexion"
            danger
            onPress={logout}
          />

        </View>

      </ScrollView>
    </SecureScreen>
  );
}

/* ---------- UI COMPONENTS ---------- */
function Label({ children }: any) {
  return <Text style={styles.label}>{children}</Text>;
}

function SecurityItem({ label, onPress, danger }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.securityItem,
        danger && { borderColor: "#B00020" },
      ]}
    >
      <Text style={[styles.securityText, danger && { color: "#FF5C5C" }]}>
        {label}
      </Text>
      <Feather name="chevron-right" size={18} color={danger ? "#FF5C5C" : GOLD} />
    </TouchableOpacity>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },

  boot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: GOLD,
  },

  card: {
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },

  label: { color: "#aaa", fontSize: 12, marginTop: 12 },

  input: {
    backgroundColor: "#000",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
    padding: 12,
    marginTop: 6,
  },

  readonly: { opacity: 0.5 },

  saveBtn: {
    backgroundColor: GOLD,
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  saveText: { fontWeight: "900", color: "#000" },

  securityBox: {
    backgroundColor: "#111",
    marginTop: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
  },

  securityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomColor: "#222",
    borderBottomWidth: 1,
  },

  securityText: {
    color: "#fff",
    fontWeight: "700",
  },
});
