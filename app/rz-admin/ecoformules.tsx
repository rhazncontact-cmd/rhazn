// app/rz-admin/ecoformules.tsx
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
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";

export default function RZAdminEcoFormules() {
  const router = useRouter();

  const [formulas, setFormulas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ================= LOAD ================= */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("eco_formules")
        .select("*")
        .single();

      if (error) {
        setErrorMsg("Erreur lors du chargement des règles économiques.");
      } else {
        setFormulas(data);
      }
      setLoading(false);
    })();
  }, []);

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    if (!formulas || updating) return;

    setUpdating(true);
    setErrorMsg(null);

    const { error } = await supabase.from("eco_formules").upsert({
      ...formulas,
      updated_at: new Date().toISOString(),
    });

    setUpdating(false);

    if (error) {
      setErrorMsg("Erreur lors de la mise à jour.");
    } else {
      Alert.alert("Succès", "Règles mises à jour.");
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={{ color: GOLD, marginTop: 10 }}>Chargement…</Text>
      </View>
    );
  }

  /* ================= UI ================= */
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={26} color={GOLD} />
        </TouchableOpacity>
        <Text style={styles.title}>Écoformules</Text>
        <View style={{ width: 26 }} />
      </View>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      <Field label="Prix ACSET utilisateur" value={formulas.acset_price_user_htg}
        onChange={(v) => setFormulas({ ...formulas, acset_price_user_htg: v })} />

      <Field label="TAN par ACSET" value={formulas.acset_tan_value}
        onChange={(v) => setFormulas({ ...formulas, acset_tan_value: v })} />

      <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
        {updating ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.saveText}>Enregistrer</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= UI HELPERS ================= */
function Field({ label, value, onChange }: any) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={String(value ?? "")}
        keyboardType="numeric"
        onChangeText={onChange}
      />
    </>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  title: { color: GOLD, fontSize: 20, fontWeight: "900", marginLeft: 10 },
  label: { color: "#ddd", marginTop: 10, fontWeight: "600" },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveText: { color: "#000", fontSize: 16, fontWeight: "900" },
  error: { color: "#f87171", textAlign: "center", marginBottom: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
