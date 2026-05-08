import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function NotifBadge() {
  const [count, setCount] = useState(0);

  const loadCount = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;

    if (!uid) {
      setCount(0);
      return;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_uid", uid)
      .eq("read", false);

    if (!error && typeof count === "number") setCount(count);
  };

  useEffect(() => {
    loadCount();

    const ch = supabase
      .channel("rz-notifications-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => loadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? "99+" : String(count)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
  },
  text: { color: "#FFF", fontSize: 10, fontWeight: "900" },
});
