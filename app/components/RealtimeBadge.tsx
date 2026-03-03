import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

const COLORS = {
  red: "#FF3B30",
  white: "#FFFFFF",
};

export default function RealtimeBadge() {
  const [count, setCount] = useState<number>(0);

  const loadCount = async () => {
    const { count, error } = await supabase
      .from("agent_funding_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (!error && typeof count === "number") {
      setCount(count);
    }
  };

  useEffect(() => {
    // Chargement initial
    loadCount();

    // Realtime
    const channel = supabase
      .channel("rz-admin-funding-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_funding_requests",
        },
        () => loadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "900",
  },
});
