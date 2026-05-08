import { Feather } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";

export default function WalletActions({ userId, status }: any) {
  const setStatus = async (next: string) => {
    const { error } = await supabase.rpc("admin_set_wallet_status", {
      p_user_id: userId,
      p_status: next,
    });

    if (error) Alert.alert("Erreur", error.message);
  };

  const adjustTan = async (delta: number) => {
    const { error } = await supabase.rpc("admin_adjust_wallet_tan", {
      p_user_id: userId,
      p_delta_tan: delta,
      p_reason: "admin_quick_action",
    });

    if (error) Alert.alert("Erreur", error.message);
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={() => setStatus("paused")} style={styles.btn}>
        <Feather name="pause" size={14} color="#fff" />
      </Pressable>

      <Pressable onPress={() => setStatus("disabled")} style={styles.btn}>
        <Feather name="slash" size={14} color="#fff" />
      </Pressable>

      <Pressable onPress={() => setStatus("active")} style={styles.btn}>
        <Feather name="play" size={14} color="#fff" />
      </Pressable>

      <Pressable onPress={() => adjustTan(+250)} style={styles.goldBtn}>
        <Text style={styles.goldText}>+250</Text>
      </Pressable>

      <Pressable onPress={() => adjustTan(-250)} style={styles.darkBtn}>
        <Text style={styles.darkText}>-250</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  goldBtn: {
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: GOLD,
    justifyContent: "center",
  },
  goldText: { fontWeight: "900", color: "#000" },
  darkBtn: {
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#222",
    justifyContent: "center",
  },
  darkText: { fontWeight: "900", color: "#fff" },
});
