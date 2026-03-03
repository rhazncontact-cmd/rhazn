import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

export default function AdminProfileList({
  title,
  filter,
}: {
  title: string;
  filter: { role?: string; is_creator?: boolean };
}) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    (async () => {
      let query = supabase.from("profiles").select("*");

      if (filter.role) query = query.eq("role", filter.role);
      if (filter.is_creator !== undefined)
        query = query.eq("is_creator", filter.is_creator);

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (!error) setProfiles(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.full_name || "—"}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.role}>Rôle : {item.role}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { color: GOLD, fontSize: 22, fontWeight: "900", marginBottom: 16 },
  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  name: { color: "#fff", fontWeight: "800", fontSize: 16 },
  email: { color: "#aaa", marginTop: 4 },
  role: { color: GOLD, marginTop: 6, fontWeight: "700" },
});
