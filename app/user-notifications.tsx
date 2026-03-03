// ======================================================
// RHAZN — NOTIFICATIONS V2 (FINTECH PREMIUM • APPLE-LIKE)
// ✅ Temps réel
// ✅ Recherche
// ✅ Filtres (Toutes / Non lues / Lues) + Période
// ✅ Groupes smart (Aujourd’hui/Hier/Semaine/Mois/Année/Anciennes)
// ✅ Sticky headers
// ✅ Icônes par type
// ✅ Haptics + Toast premium
// ✅ Modal détails + Supprimer
// ======================================================

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { RealtimeChannel } from "@supabase/supabase-js";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

/* ================= TYPES ================= */

type NotificationRow = {
  id: string;
  user_uid: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  meta?: any;
};

/* ================= UI HELPERS ================= */

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const safeJson = (obj: any) => {
  try {
    if (!obj) return null;
    return JSON.stringify(obj, null, 2);
  } catch {
    return null;
  }
};

const prettyPeriod = (label: string) => label; // déjà humain ici

const iconForType = (type?: string | null) => {
  const t = (type || "").trim().toUpperCase();

  // adaptez librement aux types que vous utilisez en DB
  if (t.includes("TAN") || t.includes("WALLET") || t.includes("TRANSACTION"))
    return { lib: "material", name: "account-balance-wallet" as const };

  if (t.includes("SUSPENTZ") || t.includes("VIDEO"))
    return { lib: "ion", name: "play-circle" as const };

  if (t.includes("CADNA") || t.includes("REVIEW"))
    return { lib: "ion", name: "shield-checkmark" as const };

  if (t.includes("WARNING") || t.includes("ALERT") || t.includes("ERROR"))
    return { lib: "ion", name: "warning" as const };

  if (t.includes("FOLLOW") || t.includes("SOCIAL"))
    return { lib: "ion", name: "people" as const };

  return { lib: "feather", name: "bell" as const };
};

const badgeColorFor = (n: NotificationRow) => {
  if (!n.is_read) return GOLD;
  return "rgba(255,255,255,0.35)";
};

/* ================= GROUPED LIST TYPES ================= */

type ListItem =
  | { kind: "header"; key: string; count: number; unread: number }
  | { kind: "row"; n: NotificationRow };

/* ================= MAIN ================= */

export default function Notifications() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [filterRead, setFilterRead] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [filterPeriod, setFilterPeriod] = useState<
    "TOUTES" | "JOUR" | "SEMAINE" | "MOIS" | "ANNEE" | "ANCIENNES"
  >("TOUTES");
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationRow | null>(null);

  /* Toast premium */
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTy = useRef(new Animated.Value(10)).current;

  const showToast = (m: string) => {
    setToast(m);

    toastOpacity.setValue(0);
    toastTy.setValue(10);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(toastTy, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(toastTy, {
          toValue: 10,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setToast(null));
    }, 2200);
  };

  const unreadCount = useMemo(
    () => rows.filter((x) => !x.is_read).length,
    [rows]
  );

  /* ================= LOAD ================= */

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s?.session?.user?.id;
      if (!uid) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_uid", uid)
        .order("created_at", { ascending: false });

      setRows((data as NotificationRow[]) || []);
      setLoading(false);
    })();
  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {
    let channel: RealtimeChannel;

    supabase.auth.getSession().then(({ data }) => {
      const uid = data?.session?.user?.id;
      if (!uid) return;

      channel = supabase
        .channel(`rt-notifications-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_uid=eq.${uid}`,
          },
          (payload) => {
            const n = payload.new as NotificationRow;
            setRows((prev) => [n, ...prev]);
            showToast("Nouvelle notification");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
              () => {}
            );
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* ================= ACTIONS ================= */

  const markAsRead = async (n: NotificationRow) => {
    if (n.is_read) return;

    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);

    setRows((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
    );
  };

  const openDetails = async (n: NotificationRow) => {

  /* 🔥 REDIRECTION AUTO SI CADNA */
  if ((n as any).data?.redirect) {
    await markAsRead(n);

    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});

    router.push((n as any).data.redirect);
    return;
  }

  setSelected(n);
  setOpen(true);

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  await markAsRead(n);
};

  const deleteNotification = async (n: NotificationRow) => {
    await supabase.from("notifications").delete().eq("id", n.id);
    setRows((prev) => prev.filter((x) => x.id !== n.id));
  };

  const confirmDelete = (n: NotificationRow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      "Supprimer ?",
      "Cette notification sera supprimée définitivement.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNotification(n);
              setOpen(false);
              setSelected(null);
              showToast("Notification supprimée");
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              ).catch(() => {});
            } catch {
              showToast("Erreur de suppression");
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              ).catch(() => {});
            }
          },
        },
      ]
    );
  };

  /* ================= FILTERS (SEARCH + READ + PERIOD) ================= */

  const qNorm = q.trim().toLowerCase();

  const matchesSearch = (n: NotificationRow) => {
    if (!qNorm) return true;
    const hay = [
      n.title ?? "",
      n.body ?? "",
      n.type ?? "",
      n.id ?? "",
      n.created_at ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(qNorm);
  };

  const filteredRows = useMemo(() => {
    const now = new Date();

    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startToday.getDate() - 1);

    const startWeek = new Date(startToday);
    startWeek.setDate(startWeek.getDate() - startWeek.getDay());

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startYear = new Date(now.getFullYear(), 0, 1);

    return rows.filter((n) => {
      // read filter
      if (filterRead === "UNREAD" && n.is_read) return false;
      if (filterRead === "READ" && !n.is_read) return false;

      // search
      if (!matchesSearch(n)) return false;

      // period filter
      const d = new Date(n.created_at);

      switch (filterPeriod) {
        case "JOUR":
          return d >= startToday;

        case "SEMAINE":
          return d >= startWeek;

        case "MOIS":
          return d >= startMonth;

        case "ANNEE":
          return d >= startYear;

        case "ANCIENNES":
          return d < startYear;

        default:
          return true;
      }
    });
  }, [rows, filterRead, filterPeriod, qNorm]);

  /* ================= SMART GROUPING (BANQUE STYLE) ================= */

  const listItems: ListItem[] = useMemo(() => {
    const now = new Date();

    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startYesterday = new Date(startToday);
    startYesterday.setDate(startToday.getDate() - 1);

    const startWeek = new Date(startToday);
    startWeek.setDate(startWeek.getDate() - startWeek.getDay());

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startYear = new Date(now.getFullYear(), 0, 1);

    const buckets: Record<string, NotificationRow[]> = {
      "Aujourd’hui": [],
      "Hier": [],
      "Cette semaine": [],
      "Ce mois": [],
      "Cette année": [],
      "Années précédentes": [],
    };

    for (const n of filteredRows) {
      const d = new Date(n.created_at);

      if (d >= startToday) buckets["Aujourd’hui"].push(n);
      else if (d >= startYesterday) buckets["Hier"].push(n);
      else if (d >= startWeek) buckets["Cette semaine"].push(n);
      else if (d >= startMonth) buckets["Ce mois"].push(n);
      else if (d >= startYear) buckets["Cette année"].push(n);
      else buckets["Années précédentes"].push(n);
    }

    const order = [
      "Aujourd’hui",
      "Hier",
      "Cette semaine",
      "Ce mois",
      "Cette année",
      "Années précédentes",
    ];

    const out: ListItem[] = [];

    for (const key of order) {
      const items = buckets[key];
      if (!items.length) continue;

      const unread = items.filter((x) => !x.is_read).length;

      out.push({ kind: "header", key, count: items.length, unread });

      for (const n of items) out.push({ kind: "row", n });
    }

    return out;
  }, [filteredRows]);

  const stickyHeaderIndices = useMemo(() => {
    return listItems
      .map((x, i) => (x.kind === "header" ? i : -1))
      .filter((i) => i !== -1);
  }, [listItems]);

  /* ================= RENDER ROW ================= */

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "header") {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>{prettyPeriod(item.key)}</Text>
          <View style={styles.groupRight}>
            {!!item.unread && (
              <View style={styles.groupDot}>
                <Text style={styles.groupDotText}>{item.unread}</Text>
              </View>
            )}
            <Text style={styles.groupCount}>{item.count}</Text>
          </View>
        </View>
      );
    }

    const n = item.n;
    const icon = iconForType(n.type);

    return (
      <Pressable
        onPress={() => openDetails(n)}
        style={[styles.card, !n.is_read && styles.unread]}
      >
        <View style={styles.iconWrap}>
          {icon.lib === "ion" ? (
            <Ionicons name={icon.name} size={18} color={badgeColorFor(n)} />
          ) : icon.lib === "material" ? (
            <MaterialIcons name={icon.name} size={18} color={badgeColorFor(n)} />
          ) : (
            <Feather name={icon.name as any} size={18} color={badgeColorFor(n)} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {n.title}
          </Text>

          <Text style={styles.cardBody} numberOfLines={2}>
            {n.body}
          </Text>

          <Text style={styles.cardTime}>{formatDateTime(n.created_at)}</Text>
        </View>

        <Text style={[styles.miniType, { color: badgeColorFor(n) }]}>
          {(n.type || "SYSTÈME").toUpperCase()}
        </Text>
      </Pressable>
    );
  };

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {filteredRows.length} affichées • {unreadCount} non lues
          </Text>
        </View>
      </View>

      {/* SEARCH */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color="rgba(255,255,255,0.55)" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher (titre, message, type...)"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!q && (
          <Pressable onPress={() => setQ("")} style={styles.clearBtn}>
            <Feather name="x" size={16} color="#FFF" />
          </Pressable>
        )}
      </View>

      {/* FILTERS: READ */}
      <View style={styles.pillsRow}>
        <Pill
          label="Toutes"
          active={filterRead === "ALL"}
          onPress={() => setFilterRead("ALL")}
        />
        <Pill
          label="Non lues"
          active={filterRead === "UNREAD"}
          onPress={() => setFilterRead("UNREAD")}
        />
        <Pill
          label="Lues"
          active={filterRead === "READ"}
          onPress={() => setFilterRead("READ")}
        />
      </View>

      {/* FILTERS: PERIOD */}
      <View style={styles.pillsRow}>
        <Pill
          label="Toutes"
          active={filterPeriod === "TOUTES"}
          onPress={() => setFilterPeriod("TOUTES")}
        />
        <Pill
          label="Jour"
          active={filterPeriod === "JOUR"}
          onPress={() => setFilterPeriod("JOUR")}
        />
        <Pill
          label="Semaine"
          active={filterPeriod === "SEMAINE"}
          onPress={() => setFilterPeriod("SEMAINE")}
        />
        <Pill
          label="Mois"
          active={filterPeriod === "MOIS"}
          onPress={() => setFilterPeriod("MOIS")}
        />
        <Pill
          label="Années"
          active={filterPeriod === "ANNEE"}
          onPress={() => setFilterPeriod("ANNEE")}
        />
      </View>

      {/* LIST */}
      {listItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Aucune notification.</Text>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(it, idx) =>
            it.kind === "header" ? `h-${it.key}` : `n-${it.n.id}-${idx}`
          }
          renderItem={renderItem}
          stickyHeaderIndices={stickyHeaderIndices}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* MODAL DETAILS */}
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.modalClose}>
                <Feather name="x" size={18} color="#FFF" />
              </Pressable>
            </View>

            {!selected ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator color={GOLD} />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <KV k="Titre" v={selected.title || "—"} />
                <KV k="Message" v={selected.body || "—"} />
                <KV k="Date" v={formatDateTime(selected.created_at)} />
                <KV k="Type" v={(selected.type || "SYSTÈME").toUpperCase()} />
                <KV k="Statut" v={selected.is_read ? "Lu" : "Non lu"} />

                {safeJson(selected.meta) ? (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.k}>Meta</Text>
                    <View style={styles.metaBox}>
                      <Text style={styles.metaText}>{safeJson(selected.meta)}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={{ height: 6 }} />

                <Pressable
                  onPress={() => confirmDelete(selected)}
                  style={styles.deleteBtn}
                >
                  <Feather name="trash-2" size={16} color="#FFF" />
                  <Text style={styles.deleteText}>Supprimer</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* TOAST */}
      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            { opacity: toastOpacity, transform: [{ translateY: toastTy }] },
          ]}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ================= SMALL UI ================= */

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

/* ================= STYLES (APPLE-LIKE) ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: "rgba(255,255,255,0.55)", fontWeight: "700" },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  title: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 4, fontWeight: "800" },

  /* Search */
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchInput: {
    flex: 1,
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
  },

  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  /* Pills rows */
  pillsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  pill: {
    flex: 1,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  pillActive: {
    backgroundColor: GOLD,
    borderColor: "rgba(0,0,0,0.35)",
  },

  pillText: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.2,
  },

  pillTextActive: {
    color: "#000",
  },

  /* Group header */
  groupHeader: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  groupTitle: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 13,
  },

  groupRight: { flexDirection: "row", alignItems: "center", gap: 8 },

  groupDot: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },

  groupDotText: { color: "#000", fontWeight: "900", fontSize: 11 },

  groupCount: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "900",
    fontSize: 12,
  },

  /* Cards */
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    gap: 12,
  },

  unread: {
    borderColor: GOLD,
    borderWidth: 2,
  },

  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  cardTitle: { color: "#FFF", fontWeight: "900", fontSize: 13 },
  cardBody: { color: "rgba(255,255,255,0.65)", marginTop: 6, fontWeight: "800", fontSize: 12 },
  cardTime: { color: "rgba(255,255,255,0.4)", marginTop: 6, fontSize: 11, fontWeight: "700" },

  miniType: { fontSize: 10, fontWeight: "900", letterSpacing: 0.3, marginLeft: 6 },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 18,
    justifyContent: "center",
  },

  modalCard: {
    backgroundColor: "#0E0E0E",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 14,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  modalTitle: { color: "#FFF", fontSize: 16, fontWeight: "900" },

  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  k: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "900" },
  v: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "900",
    flexShrink: 1,
    textAlign: "right",
  },

  metaBox: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 10,
  },

  metaText: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "800" },

  deleteBtn: {
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,69,58,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.35)",
    flexDirection: "row",
    gap: 10,
  },

  deleteText: { color: "#FFF", fontWeight: "900" },

  /* Toast */
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  toastText: { color: "#FFF", fontWeight: "900", textAlign: "center" },
});
