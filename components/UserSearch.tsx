// app/components/UserSearch.tsx
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export type SimpleUser = { id: string; name: string; avatarUrl?: string };

type Props = {
  data: SimpleUser[];
  placeholder?: string;
  onSelect: (user: SimpleUser) => void;
};

export default function UserSearch({ data, onSelect, placeholder = "Rechercher par nom ou ID..." }: Props) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data.slice(0, 10);
    return data.filter(
      u => u.name.toLowerCase().includes(term) || u.id.toLowerCase().includes(term)
    );
  }, [q, data]);

  return (
    <View style={styles.box}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={placeholder}
        placeholderTextColor="#777"
        style={styles.input}
      />
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onSelect(item)} style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.id}>{item.id}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun résultat…</Text>}
        style={{ maxHeight: 220 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#111", borderRadius: 12, borderWidth: 1, borderColor: "#222", padding: 12 },
  input: {
    color: "#fff", backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#222",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderColor: "#1b1b1b" },
  name: { color: "#fff", fontSize: 14 },
  id: { color: "#888", fontSize: 12 },
  empty: { color: "#666", textAlign: "center", paddingVertical: 12 },
});
