import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInRight,
    Layout,
    SlideOutLeft,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

type NotifType = "QOB" | "TAN" | "SECURITY" | "SYSTEM";

type Notif = {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsRHAZN() {
  const router = useRouter();

  const [data, setData] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotifType | "ALL">("ALL");
  const [userUid, setUserUid] = useState<string | null>(null);

  // ================== LOAD USER + REALTIME ==================
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;

      setUserUid(uid);
      await loadNotifications(uid);

      channel = supabase
        .channel(`notifications-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          (payload) => {
            const n = payload.new as any;
            if (n?.user_uid === uid) {
              loadNotifications(uid);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ================== LOAD NOTIFICATIONS ==================
  const loadNotifications = async (uid: string) => {
    setLoading(true);

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_uid", uid)
      .order("created_at", { ascending: false });

    if (filter !== "ALL") query = query.eq("type", filter);

    const { data } = await query;

    setData((data as Notif[]) || []);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (userUid) loadNotifications(userUid);
    }, [userUid, filter])
  );

  // ================== MARQUER UNE COMME LUE ==================
  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);

    setData((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  // ================== MARQUER TOUT COMME LU ==================
  const markAllAsRead = async () => {
    if (!userUid) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_uid", userUid);

    setData((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // ================== UI ITEM ==================
  const renderItem = ({ item }: { item: Notif }) => {
    const icon =
      item.type === "QOB"
        ? "heart"
        : item.type === "TAN"
        ? "cash"
        : item.type === "SECURITY"
        ? "lock-closed"
        : "information-circle";

    return (
      <Animated.View
        entering={FadeInRight}
        exiting={SlideOutLeft}
        layout={Layout.springify()}
        style={[
          styles.card,
          !item.is_read && { borderColor: GOLD, backgroundColor: "#161200" },
        ]}
      >
        <Pressable onPress={() => markAsRead(item.id)}>
          <View style={styles.row}>
            <Ionicons name={icon} size={22} color={GOLD} />
            <Text style={styles.title}>{item.title}</Text>
          </View>

          <Text style={styles.msg}>{item.message}</Text>

          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleString()}
          </Text>

          {!item.is_read && <Text style={styles.unread}>NOUVEAU</Text>}
        </Pressable>
      </Animated.View>
    );
  };

  // ================== RENDER ==================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={26} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.clearAll}>Tout lire</Text>
        </TouchableOpacity>
      </View>

      {/* FILTERS */}
      <View style={styles.filters}>
        {["ALL", "QOB", "TAN", "SECURITY", "SYSTEM"].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f as any)}
            style={[
              styles.filterBtn,
              filter === f && { backgroundColor: GOLD },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && { color: "#000" },
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
      ) : data.length === 0 ? (
        <Text style={styles.empty}>Aucune notification</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

/* ================== STYLES ================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },

  header: {
    paddingTop: 60,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: { color: GOLD, fontSize: 22, fontWeight: "900" },

  clearAll: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "700",
  },

  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  filterBtn: {
    backgroundColor: "#111",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#333",
  },

  filterText: { color: "#aaa", fontSize: 12 },

  card: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 12,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 8 },

  title: { color: "#fff", fontWeight: "700", fontSize: 14 },

  msg: { color: "#aaa", marginTop: 6, fontSize: 12 },

  date: { color: "#666", marginTop: 6, fontSize: 11 },

  unread: {
    color: GOLD,
    fontSize: 11,
    marginTop: 6,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  empty: {
    color: "#777",
    textAlign: "center",
    marginTop: 60,
    fontSize: 14,
  },
});
