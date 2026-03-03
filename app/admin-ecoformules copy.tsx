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
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

type EcoFormules = {
  id: string;
  acset_price_user_htg: number;
  acset_tan_value: number;
  tan_seconds_value: number;

  acset_price_agent_htg: number;
  acset_agent_commission_htg: number;

  tan_withdraw_rate_htg: number;
  tan_agent_commission_percent: number;
  tan_admin_commission_percent: number;

  tan_transfer_admin_percent: number;

  withdraw_min_tan: number;
  withdraw_max_tan_per_day: number;

  transfer_min_tan: number;
  transfer_max_tan_per_day: number;

  buy_acset_min: number;
  buy_acset_max_per_day: number;

  profile_photo_change_price: number;
};

export default function RZAdminEcoFormules() {
  const router = useRouter();

  const [formulas, setFormulas] = useState<EcoFormules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= LOAD ================= */
  useEffect(() => {
    const load = async () => {
      setError(null);
      const { data, error } = await supabase
        .from("eco_formules")
        .select("*")
        .single();

      if (error || !data) {
        setError("Impossible de charger les formules.");
      } else {
        setFormulas(data as EcoFormules);
      }
      setLoading(false);
    };

    load();
  }, []);

  /* ================= SAVE ================= */
  const save = async () => {
    if (!formulas || saving) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("eco_formules").upsert({
      ...formulas,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      setError("Erreur lors de l’enregistrement.");
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

  /* ================= PROTECTION ABSOLUE ================= */
  if (!formulas) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#f87171" }}>
          Aucune formule trouvée.
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: GOLD, marginTop: 10 }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ================= UI ================= */
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={26} color={GOLD} />
        </TouchableOpacity>
        <Text style={styles.title}>Économie RHAZN</Text>
        <View style={{ width: 26 }} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Section title="Prix & Conversions">
        <Field label="Prix ACSET utilisateur (HTG)" value={formulas.acset_price_user_htg}
          onChange={(v) => setFormulas({ ...formulas, acset_price_user_htg: v })} />
        <Field label="TAN par ACSET" value={formulas.acset_tan_value}
          onChange={(v) => setFormulas({ ...formulas, acset_tan_value: v })} />
        <Field label="Secondes par TAN" value={formulas.tan_seconds_value}
          onChange={(v) => setFormulas({ ...formulas, tan_seconds_value: v })} />
      </Section>

      <Section title="Agents">
        <Field label="Prix ACSET agent (HTG)" value={formulas.acset_price_agent_htg}
          onChange={(v) => setFormulas({ ...formulas, acset_price_agent_htg: v })} />
        <Field label="Commission agent / ACSET" value={formulas.acset_agent_commission_htg}
          onChange={(v) => setFormulas({ ...formulas, acset_agent_commission_htg: v })} />
      </Section>

      <Section title="Retrait TAN">
        <Field label="Taux TAN → HTG" value={formulas.tan_withdraw_rate_htg}
          onChange={(v) => setFormulas({ ...formulas, tan_withdraw_rate_htg: v })} />
        <Field label="Commission agent (%)" value={formulas.tan_agent_commission_percent}
          onChange={(v) => setFormulas({ ...formulas, tan_agent_commission_percent: v })} />
        <Field label="Commission admin (%)" value={formulas.tan_admin_commission_percent}
          onChange={(v) => setFormulas({ ...formulas, tan_admin_commission_percent: v })} />
        <Field label="Retrait min TAN" value={formulas.withdraw_min_tan}
          onChange={(v) => setFormulas({ ...formulas, withdraw_min_tan: v })} />
        <Field label="Retrait max / jour TAN" value={formulas.withdraw_max_tan_per_day}
          onChange={(v) => setFormulas({ ...formulas, withdraw_max_tan_per_day: v })} />
      </Section>

      <Section title="Transferts TAN">
        <Field label="Commission admin (%)" value={formulas.tan_transfer_admin_percent}
          onChange={(v) => setFormulas({ ...formulas, tan_transfer_admin_percent: v })} />
        <Field label="Transfert min TAN" value={formulas.transfer_min_tan}
          onChange={(v) => setFormulas({ ...formulas, transfer_min_tan: v })} />
        <Field label="Transfert max / jour TAN" value={formulas.transfer_max_tan_per_day}
          onChange={(v) => setFormulas({ ...formulas, transfer_max_tan_per_day: v })} />
      </Section>

      <Section title="Achat ACSET">
        <Field label="Achat min ACSET" value={formulas.buy_acset_min}
          onChange={(v) => setFormulas({ ...formulas, buy_acset_min: v })} />
        <Field label="Achat max / jour ACSET" value={formulas.buy_acset_max_per_day}
          onChange={(v) => setFormulas({ ...formulas, buy_acset_max_per_day: v })} />
      </Section>

      <Section title="Profil utilisateur">
        <Field label="Prix photo profil (TAN)" value={formulas.profile_photo_change_price}
          onChange={(v) => setFormulas({ ...formulas, profile_photo_change_price: v })} />
      </Section>

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#000" /> :
          <Text style={styles.saveText}>Enregistrer</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= UI HELPERS ================= */

function Section({ title, children }: any) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, value, onChange }: any) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={String(value)}
        keyboardType="numeric"
        onChangeText={(v) => onChange(Number(v))}
      />
    </>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  title: { color: GOLD, fontSize: 20, fontWeight: "900" },
  error: { color: "#f87171", marginBottom: 10, textAlign: "center" },

  section: {
    backgroundColor: "#0c0c0c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 16,
  },

  sectionTitle: { color: GOLD, fontWeight: "900", marginBottom: 8 },

  label: { color: "#ddd", fontSize: 13, marginBottom: 4 },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginBottom: 10,
  },

  saveBtn: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  saveText: { color: "#000", fontSize: 16, fontWeight: "900" },
});
