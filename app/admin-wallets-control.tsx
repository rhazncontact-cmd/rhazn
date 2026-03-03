import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* 🍎 RHAZN — Apple-like Admin */
const COLORS = {
  bg: "#000000",
  card: "#0F0F0F",
  border: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  muted: "#9A9A9A",
  gold: "#D4AF37",
  green: "#30D158",
  red: "#FF453A",
};

export default function AdminWalletsControl() {
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const [tan, setTan] = useState("");
  const [acset, setAcset] = useState("");
  const [processing, setProcessing] = useState(false);

  /* ================= FETCH EMAILS ================= */
  useEffect(() => {
    const fetchEmails = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .not("email", "is", null);

      if (error) {
        Alert.alert("Erreur", error.message);
      } else {
        setEmails(data.map((u) => u.email));
      }
      setLoading(false);
    };
    fetchEmails();
  }, []);

  /* ================= SEARCH ================= */
  const filteredEmails = useMemo(() => {
    return emails.filter((e) =>
      e.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, emails]);

  /* ================= ACTION ================= */
  const submit = async () => {
    if (!selectedEmail) {
      Alert.alert("Erreur", "Sélectionnez un email");
      return;
    }

    const tanValue = parseInt(tan || "0");
    const acsetValue = parseInt(acset || "0");

    if (tanValue === 0 && acsetValue === 0) {
      Alert.alert("Erreur", "Montant invalide");
      return;
    }

    setProcessing(true);

    const { error } = await supabase.rpc("admin_refill_wallet", {
      email: selectedEmail,
      tan: tanValue,
      acset: acsetValue,
    });

    setProcessing(false);

    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      Alert.alert("Succès", "Wallet mis à jour");
      setTan("");
      setAcset("");
    }
  };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Wallet Control</Text>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.muted} />
        <TextInput
          placeholder="Rechercher un email…"
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* EMAIL LIST */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredEmails}
          keyExtractor={(item) => item}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedEmail(item)}
              style={[
                styles.emailItem,
                selectedEmail === item && styles.emailActive,
              ]}
            >
              <Text style={styles.emailText}>{item}</Text>
            </Pressable>
          )}
        />
      )}

      {/* ACTION CARD */}
      {selectedEmail && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedEmail}</Text>

          <TextInput
            placeholder="TAN (+ / -)"
            placeholderTextColor={COLORS.muted}
            keyboardType="numeric"
            value={tan}
            onChangeText={setTan}
            style={styles.input}
          />

          <TextInput
            placeholder="ACSET (+ / -)"
            placeholderTextColor={COLORS.muted}
            keyboardType="numeric"
            value={acset}
            onChangeText={setAcset}
            style={styles.input}
          />

          <Pressable
            onPress={submit}
            disabled={processing}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {processing ? "Traitement…" : "Appliquer"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
  },
  list: {
    maxHeight: 260,
    marginBottom: 16,
  },
  emailItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  emailActive: {
    backgroundColor: "rgba(212,175,55,0.15)",
  },
  emailText: {
    color: COLORS.text,
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.card,
  },
  cardTitle: {
    color: COLORS.gold,
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    color: COLORS.text,
    marginBottom: 10,
  },
  button: {
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonText: {
    color: "#000",
    fontWeight: "600",
  },
});
