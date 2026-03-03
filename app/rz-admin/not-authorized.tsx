import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const BLACK = "#000000";
const WHITE = "#FFFFFF";
const GOLD = "#D4AF37";
const GRAY = "#8E8E93";
const SEPARATOR = "#1C1C1E";
const RED = "#FF3B30";

type Notif = {
  id: string;
  title: string | null;
  body: string | null;
  read: boolean;
  created_at: string;
};

export default function NotificationsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);

  // =============================
  // Load notifications
  // =============================
  const loadNotifications = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      setUserUid(uid);

      if (!uid) {
        setNotifs([]);
        return;
      }

      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, read, created_at")
        .eq("user_uid", uid)
        .order("created_at", { ascending: false })
        .limit(100);

      setNotifs((data as Notif[]) ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // =============================
  // Realtime
  // =============================
  useEffect(() => {
    if (!userUid) return;

    const ch = supabase
      .channel("rz-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_uid=eq.${userUid}`,
        },
        loadNotifications
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userUid, loadNotifications]);

  // =============================
  // Actions
  // =============================
  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (!userUid) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_uid", userUid)
      .eq("read", false);

    loadNotifications();
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  // =============================
  // UI
  // =============================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BLACK} />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.6}>
          <Text style={styles.action}>Tout lire</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GOLD}
            />
          }
        >
          {notifs.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune notification</Text>
            </View>
          )}

          {notifs.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => markAsRead(n.id)}
            >
              <View style={styles.rowHeader}>
                <Text
                  style={[
                    styles.rowTitle,
                    n.read && { color: GRAY },
                  ]}
                >
                  {n.title || "Notification"}
                </Text>
                {!n.read && <View style={styles.dot} />}
              </View>

              {n.body && (
                <Text style={styles.rowBody}>{n.body}</Text>
              )}

              <Text style={styles.rowDate}>
                {new Date(n.created_at).toLocaleString()}
              </Text>

              <View style={styles.separator} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// =============================
// STYLES — Apple-like (PURE)
// =============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLACK },

  header: {
    paddingTop: 72,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: WHITE,
    fontSize: 30,
    fontWeight: "600",
    letterSpacing: 0.25,
  },

  action: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "600",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  empty: {
    marginTop: 120,
    alignItems: "center",
  },

  emptyText: {
    color: GRAY,
    fontSize: 15,
  },

  row: {
    paddingVertical: 14,
  },

  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowTitle: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    paddingRight: 10,
  },

  rowBody: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },

  rowDate: {
    color: GRAY,
    fontSize: 11,
    marginTop: 8,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RED,
  },

  separator: {
    height: 1,
    backgroundColor: SEPARATOR,
    marginTop: 14,
  },
});
