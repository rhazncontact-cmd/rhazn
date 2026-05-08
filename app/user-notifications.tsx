// app/user-notifications.tsx
// ✅ RHAZN — Notifications Premium Apple-like
// ✅ Temps réel (Supabase Realtime)
// ✅ Son + Badge en temps réel
// ✅ FIX : badgeStore.set() différé (setTimeout 0) — évite setState pendant render
// ✅ Toutes activités wallet, compte, statut, système
// ✅ Groupes smart + sticky headers
// ✅ Modal détails Apple bottom-sheet

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { badgeStore } from "../lib/badgeStore";
import { notifSound } from "../lib/notifSound";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────
const C = {
  bg:         "#000000",
  card:       "#0D0D0D",
  card2:      "#111111",
  border:     "#1C1C1C",
  white:      "#FFFFFF",
  muted:      "rgba(255,255,255,0.45)",
  mutedMed:   "rgba(255,255,255,0.65)",
  gold:       "#D4AF37",
  goldDim:    "rgba(212,175,55,0.12)",
  goldBorder: "rgba(212,175,55,0.28)",
  green:      "#30D158",
  greenDim:   "rgba(48,209,88,0.12)",
  red:        "#FF453A",
  redDim:     "rgba(255,69,58,0.12)",
  redBorder:  "rgba(255,69,58,0.28)",
  blue:       "#0A84FF",
  blueDim:    "rgba(10,132,255,0.12)",
  orange:     "#FF9F0A",
  glass:      "rgba(255,255,255,0.055)",
  hairline:   "rgba(255,255,255,0.08)",
};

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type NotifRow = {
  id:         string;
  user_uid:   string;
  title:      string;
  body:       string;
  type:       string;
  is_read:    boolean;
  created_at: string;
  meta?:      any;
};

type ListItem =
  | { kind: "header"; key: string; count: number; unread: number }
  | { kind: "row";    n: NotifRow };

// ─────────────────────────────────────────────────────────────
// TYPE → icône + couleur + catégorie
// ─────────────────────────────────────────────────────────────
const NOTIF_META: Record<string, { icon: string; color: string; label: string }> = {
  WELCOME:           { icon: "gift",              color: C.green,  label: "Bienvenue"     },
  TRANSFER_TAN_IN:   { icon: "arrow-down-circle", color: C.green,  label: "TAN reçus"     },
  TRANSFER_TAN_OUT:  { icon: "arrow-up-circle",   color: C.red,    label: "TAN envoyés"   },
  BUY_TAN:           { icon: "cash",              color: C.green,  label: "Achat TAN"     },
  WITHDRAW_TAN:      { icon: "wallet-outline",    color: C.gold,   label: "Retrait TAN"   },
  PACT_APPROVED:     { icon: "shield-checkmark",  color: C.green,  label: "Pact approuvé" },
  PACT_REJECTED:     { icon: "shield",            color: C.red,    label: "Pact rejeté"   },
  ROLE_NOMINATION:   { icon: "ribbon",            color: C.gold,   label: "Nomination"    },
  QOB_MILESTONE:     { icon: "trophy",            color: C.gold,   label: "Milestone QOB" },
  TAN_EARNED:        { icon: "trending-up",       color: C.green,  label: "TAN gagnés"    },
  SYSTEM:            { icon: "settings",          color: C.muted,  label: "Système"       },
  SECURITY:          { icon: "lock-closed",       color: C.orange, label: "Sécurité"      },
  FOLLOW:            { icon: "person-add",        color: C.blue,   label: "Nouvel abonné" },
  PAYMENT:           { icon: "card",              color: C.gold,   label: "Paiement"      },
  info:              { icon: "information-circle",color: C.blue,   label: "Info"          },
  CREDIT:            { icon: "arrow-down-circle", color: C.green,  label: "Crédit reçu"   },
  DEBIT:             { icon: "arrow-up-circle",   color: C.red,    label: "Débit wallet"  },
};

const getNotifMeta = (type?: string | null) => {
  if (!type) return { icon: "notifications-outline", color: C.gold, label: "Notification" };
  const exact = NOTIF_META[type];
  if (exact) return exact;
  const t = type.toUpperCase();
  for (const [key, val] of Object.entries(NOTIF_META)) {
    if (t.includes(key.toUpperCase())) return val;
  }
  return { icon: "notifications-outline", color: C.gold, label: "Notification" };
};

const fmtDate = (iso: string) => {
  try {
    const d      = new Date(iso);
    const now    = new Date();
    const diffMs  = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH   = Math.floor(diffMs / 3600000);
    if (diffMin < 1)  return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH   < 24) return `Il y a ${diffH}h`;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

const fmtFull = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export default function UserNotifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [rows,     setRows]     = useState<NotifRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [q,        setQ]        = useState("");
  const [selected, setSelected] = useState<NotifRow | null>(null);
  const [badge,    setBadge]    = useState(0);

  const toastOp = useRef(new Animated.Value(0)).current;
  const toastY  = useRef(new Animated.Value(-20)).current;
  const [toast, setToast] = useState<{ title: string; body: string; color: string } | null>(null);

  // ── Configurer expo-notifications ──
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList:   true,
            shouldPlaySound:  true,
            shouldSetBadge:   true,
          }),
        });
      }
    })();
  }, []);

  const playSound = async () => {
    try {
      await notifSound.play();
    } catch {}
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  // ── Toast entrant ──
  const showToast = (n: NotifRow) => {
    const meta = getNotifMeta(n.type);
    setToast({ title: n.title, body: n.body, color: meta.color });
    toastOp.setValue(0); toastY.setValue(-20);
    Animated.parallel([
      Animated.spring(toastOp, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
      Animated.spring(toastY,  { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOp, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(toastY,  { toValue: -20, duration: 280, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, 4000);
  };

  // ── Charger notifications ──
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { setLoading(false); return; }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_uid", uid)
        .order("created_at", { ascending: false })
        .limit(200);

      const notifs = (data as NotifRow[]) ?? [];
      setRows(notifs);

      const unread = notifs.filter(n => !n.is_read).length;
      setBadge(unread);

      // ✅ setTimeout → évite setState pendant render d'un autre composant
      setTimeout(() => {
        badgeStore.set(unread);
        Notifications.setBadgeCountAsync(unread).catch(() => {});
      }, 0);

      setLoading(false);
    })();
  }, []);

  // ── Realtime local (toast + liste quand l'écran est ouvert) ──
  useEffect(() => {
    let channel: any;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      channel = supabase
        .channel(`notifs-screen-${uid}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public",
          table: "notifications", filter: `user_uid=eq.${uid}`,
        }, async (payload) => {
          const n = payload.new as NotifRow;

          // ✅ Ajouter à la liste
          setRows(prev => [n, ...prev]);

          // ✅ Badge différé — évite le warning setState pendant render
          setTimeout(() => {
            setBadge(prev => {
              const next = prev + 1;
              badgeStore.set(next);
              Notifications.setBadgeCountAsync(next).catch(() => {});
              return next;
            });
          }, 0);

          // Toast visuel (quand l'écran est ouvert)
          showToast(n);

          // Notification système expo
          await Notifications.scheduleNotificationAsync({
            content: { title: n.title, body: n.body, sound: true },
            trigger: null,
          }).catch(() => {});
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // ── Marquer lu ──
  const markRead = async (n: NotifRow) => {
    if (n.is_read) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    setRows(prev => {
      const updated = prev.map(x => x.id === n.id ? { ...x, is_read: true } : x);
      const unread  = updated.filter(x => !x.is_read).length;
      setBadge(unread);
      setTimeout(() => {
        badgeStore.set(unread);
        Notifications.setBadgeCountAsync(unread).catch(() => {});
      }, 0);
      return updated;
    });
  };

  const markAllRead = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    await supabase.from("notifications")
      .update({ is_read: true })
      .eq("user_uid", uid)
      .eq("is_read", false);
    setRows(prev => prev.map(x => ({ ...x, is_read: true })));
    setBadge(0);
    setTimeout(() => {
      badgeStore.reset();
      Notifications.setBadgeCountAsync(0).catch(() => {});
    }, 0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const deleteNotif = async (n: NotifRow) => {
    Alert.alert("Supprimer ?", "Cette notification sera supprimée définitivement.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        await supabase.from("notifications").delete().eq("id", n.id);
        setRows(prev => prev.filter(x => x.id !== n.id));
        if (!n.is_read) {
          setTimeout(() => {
            setBadge(prev => Math.max(0, prev - 1));
            badgeStore.decrement();
          }, 0);
        }
        setSelected(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }},
    ]);
  };

  // ── Filtrage ──
  const qNorm    = q.trim().toLowerCase();
  const filtered = useMemo(() => rows.filter(n => {
    if (filter === "UNREAD" && n.is_read)  return false;
    if (filter === "READ"   && !n.is_read) return false;
    if (!qNorm) return true;
    return [n.title, n.body, n.type].join(" ").toLowerCase().includes(qNorm);
  }), [rows, filter, qNorm]);

  // ── Grouping ──
  const listItems: ListItem[] = useMemo(() => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest  = new Date(today); yest.setDate(today.getDate() - 1);
    const week  = new Date(today); week.setDate(today.getDate() - today.getDay());
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const year  = new Date(now.getFullYear(), 0, 1);

    const buckets: Record<string, NotifRow[]> = {
      "Aujourd'hui": [], "Hier": [], "Cette semaine": [],
      "Ce mois": [], "Cette année": [], "Années précédentes": [],
    };
    for (const n of filtered) {
      const d = new Date(n.created_at);
      if (d >= today)      buckets["Aujourd'hui"].push(n);
      else if (d >= yest)  buckets["Hier"].push(n);
      else if (d >= week)  buckets["Cette semaine"].push(n);
      else if (d >= month) buckets["Ce mois"].push(n);
      else if (d >= year)  buckets["Cette année"].push(n);
      else                 buckets["Années précédentes"].push(n);
    }

    const order = ["Aujourd'hui","Hier","Cette semaine","Ce mois","Cette année","Années précédentes"];
    const out: ListItem[] = [];
    for (const key of order) {
      const items = buckets[key];
      if (!items.length) continue;
      const unread = items.filter(x => !x.is_read).length;
      out.push({ kind: "header", key, count: items.length, unread });
      for (const n of items) out.push({ kind: "row", n });
    }
    return out;
  }, [filtered]);

  const stickyIndices = useMemo(() =>
    listItems.map((x, i) => x.kind === "header" ? i : -1).filter(i => i !== -1),
    [listItems]
  );

  const unreadCount = rows.filter(n => !n.is_read).length;

  // ── Render row ──
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "header") {
      return (
        <View style={s.groupHeader}>
          <Text style={s.groupTitle}>{item.key}</Text>
          <View style={s.groupRight}>
            {item.unread > 0 && (
              <View style={s.groupBadge}>
                <Text style={s.groupBadgeTxt}>{item.unread}</Text>
              </View>
            )}
            <Text style={s.groupCount}>{item.count}</Text>
          </View>
        </View>
      );
    }

    const n    = item.n;
    const meta = getNotifMeta(n.type);

    return (
      <Pressable
        style={[s.card, !n.is_read && s.cardUnread]}
        onPress={async () => { await markRead(n); setSelected(n); }}
        activeOpacity={0.82}
      >
        {!n.is_read && <View style={s.unreadDot} />}

        <View style={[s.cardIcon, { backgroundColor: meta.color + "18", borderColor: meta.color + "30" }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[s.cardTitle, !n.is_read && s.cardTitleUnread]} numberOfLines={1}>
            {n.title}
          </Text>
          <Text style={s.cardBody} numberOfLines={2}>{n.body}</Text>
          <View style={s.cardFooter}>
            <View style={[s.typeBadge, { backgroundColor: meta.color + "15", borderColor: meta.color + "25" }]}>
              <Text style={[s.typeTxt, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
            </View>
            <Text style={s.cardTime}>{fmtDate(n.created_at)}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={14} color={C.muted as string} />
      </Pressable>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Notifications</Text>
          <Text style={s.headerSub}>{filtered.length} • {unreadCount} non lues</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.markAllBtn} onPress={markAllRead} activeOpacity={0.82}>
            <Ionicons name="checkmark-done" size={14} color="#000" />
            <Text style={s.markAllTxt}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Badge résumé */}
      {!loading && unreadCount > 0 && (
        <View style={s.badgeBanner}>
          <View style={s.badgeBannerLeft}>
            <View style={s.badgeCircle}>
              <Text style={s.badgeCircleTxt}>{unreadCount}</Text>
            </View>
            <Text style={s.badgeBannerTxt}>
              notification{unreadCount > 1 ? "s" : ""} non lue{unreadCount > 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.8}>
            <Text style={s.badgeBannerAction}>Tout marquer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={C.muted as string} />
        <TextInput
          value={q} onChangeText={setQ}
          placeholder="Rechercher…"
          placeholderTextColor={C.muted as string}
          style={s.searchInput}
          autoCapitalize="none" autoCorrect={false}
        />
        {!!q && (
          <TouchableOpacity onPress={() => setQ("")}>
            <Ionicons name="close-circle" size={18} color={C.muted as string} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres */}
      <View style={s.filtersRow}>
        {(["ALL","UNREAD","READ"] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterPill, filter === f && s.filterPillActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.82}
          >
            {f === "UNREAD" && filter === f && <View style={s.filterDot} />}
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
              {f === "ALL" ? "Toutes" : f === "UNREAD" ? "Non lues" : "Lues"}
            </Text>
            {f === "UNREAD" && unreadCount > 0 && filter !== "UNREAD" && (
              <View style={s.filterCount}>
                <Text style={s.filterCountTxt}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.gold} size="large" />
          <Text style={s.centerTxt}>Chargement…</Text>
        </View>
      ) : listItems.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="notifications-off-outline" size={52} color={C.muted as string} />
          <Text style={s.centerTxt}>
            {filter === "UNREAD" ? "Tout est lu ✓" : "Aucune notification"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(it, idx) => it.kind === "header" ? `h-${it.key}` : `n-${it.n.id}-${idx}`}
          renderItem={renderItem}
          stickyHeaderIndices={stickyIndices}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 160 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Modal détail */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={s.modalBd} onPress={() => setSelected(null)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            {selected && (
              <NotifDetail
                n={selected}
                onClose={() => setSelected(null)}
                onDelete={() => deleteNotif(selected)}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Toast entrant */}
      {toast && (
        <Animated.View
          style={[s.toast, { opacity: toastOp, transform: [{ translateY: toastY }] }]}
          pointerEvents="none"
        >
          <View style={[s.toastBar, { backgroundColor: toast.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.toastTitle} numberOfLines={1}>{toast.title}</Text>
            <Text style={s.toastBody}  numberOfLines={1}>{toast.body}</Text>
          </View>
          <Ionicons name="notifications" size={16} color={toast.color} />
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// BOTTOM SHEET DÉTAIL
// ─────────────────────────────────────────────────────────────
function NotifDetail({ n, onClose, onDelete }: {
  n: NotifRow; onClose: () => void; onDelete: () => void;
}) {
  const meta = getNotifMeta(n.type);
  return (
    <>
      <View style={d.handle} />
      <View style={d.hero}>
        <View style={[d.heroIcon, { backgroundColor: meta.color + "18", borderColor: meta.color + "35" }]}>
          <Ionicons name={meta.icon as any} size={32} color={meta.color} />
        </View>
        <View style={[d.readDot, { backgroundColor: n.is_read ? C.green : meta.color }]}>
          <Ionicons name={n.is_read ? "checkmark" : "ellipse"} size={10} color="#000" />
          <Text style={d.readTxt}>{n.is_read ? "Lu" : "Non lu"}</Text>
        </View>
      </View>
      <Text style={d.title}>{n.title}</Text>
      <Text style={d.body}>{n.body}</Text>
      <View style={d.divider} />
      <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
        <Row icon="calendar-outline" label="Date"  value={fmtFull(n.created_at)} />
        <Row icon="pricetag-outline" label="Type"  value={meta.label} color={meta.color} />
        <Row icon="id-card-outline"  label="ID"    value={n.id.slice(0, 24) + "…"} />
        {n.meta && (
          <View style={d.metaBox}>
            <Text style={d.metaTitle}>Données</Text>
            <Text style={d.metaJson}>{JSON.stringify(n.meta, null, 2)}</Text>
          </View>
        )}
      </ScrollView>
      <View style={d.actions}>
        <TouchableOpacity style={d.deleteBtn} onPress={onDelete} activeOpacity={0.82}>
          <Ionicons name="trash" size={16} color={C.red} />
          <Text style={d.deleteTxt}>Supprimer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={d.closeBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={d.closeTxt}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function Row({ icon, label, value, color }: {
  icon: string; label: string; value: string; color?: string;
}) {
  return (
    <View style={d.row}>
      <View style={d.rowLeft}>
        <Ionicons name={icon as any} size={13} color={C.muted as string} />
        <Text style={d.rowLabel}>{label}</Text>
      </View>
      <Text style={[d.rowValue, color ? { color } : {}]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, paddingTop: 6, gap: 10 },
  backBtn:     { width: 40, height: 40, borderRadius: 13, backgroundColor: C.glass, borderWidth: 1, borderColor: C.hairline, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.white, fontSize: 18, fontWeight: "900", flex: 1 },
  headerSub:   { color: C.muted as string, fontSize: 11 },
  markAllBtn:  { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  markAllTxt:  { color: "#000", fontWeight: "900", fontSize: 11 },

  badgeBanner:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 10, backgroundColor: C.goldDim, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.goldBorder },
  badgeBannerLeft:   { flexDirection: "row", alignItems: "center", gap: 10 },
  badgeCircle:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" },
  badgeCircleTxt:    { color: "#000", fontWeight: "900", fontSize: 13 },
  badgeBannerTxt:    { color: C.gold, fontWeight: "800", fontSize: 13 },
  badgeBannerAction: { color: C.gold, fontWeight: "900", fontSize: 12, textDecorationLine: "underline" },

  searchWrap:  { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, height: 44, borderRadius: 14, backgroundColor: C.glass, borderWidth: 1, borderColor: C.hairline, gap: 8 },
  searchInput: { flex: 1, color: C.white, fontWeight: "700", fontSize: 13 },

  filtersRow:       { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  filterPill:       { flex: 1, height: 36, borderRadius: 12, backgroundColor: C.glass, borderWidth: 1, borderColor: C.hairline, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  filterPillActive: { backgroundColor: C.gold, borderColor: "transparent" },
  filterTxt:        { color: C.mutedMed, fontWeight: "800", fontSize: 12 },
  filterTxtActive:  { color: "#000", fontWeight: "900" },
  filterDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: "#000" },
  filterCount:      { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterCountTxt:   { color: "#000", fontWeight: "900", fontSize: 10 },

  groupHeader:   { backgroundColor: C.card2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupTitle:    { color: C.white, fontWeight: "900", fontSize: 12 },
  groupRight:    { flexDirection: "row", alignItems: "center", gap: 8 },
  groupBadge:    { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  groupBadgeTxt: { color: "#000", fontWeight: "900", fontSize: 11 },
  groupCount:    { color: C.muted as string, fontWeight: "700", fontSize: 11 },

  card:            { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, gap: 12, position: "relative" },
  cardUnread:      { borderColor: "rgba(212,175,55,0.35)", backgroundColor: "rgba(212,175,55,0.04)" },
  unreadDot:       { position: "absolute", top: 12, left: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold },
  cardIcon:        { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  cardTitle:       { color: C.mutedMed, fontWeight: "700", fontSize: 13 },
  cardTitleUnread: { color: C.white, fontWeight: "900" },
  cardBody:        { color: C.muted as string, fontWeight: "600", fontSize: 12, lineHeight: 17 },
  cardFooter:      { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  typeBadge:       { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  typeTxt:         { fontWeight: "800", fontSize: 9, letterSpacing: 0.5 },
  cardTime:        { color: C.muted as string, fontSize: 10, fontWeight: "600" },

  center:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerTxt: { color: C.muted as string, fontWeight: "700", fontSize: 14 },

  modalBd:   { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#0E0E0E", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, borderTopWidth: 1, borderTopColor: C.hairline },

  toast:      { position: "absolute", top: 60, left: 16, right: 16, backgroundColor: "#1A1A1A", borderRadius: 18, flexDirection: "row", alignItems: "center", padding: 14, gap: 10, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 },
  toastBar:   { width: 3, height: 36, borderRadius: 2 },
  toastTitle: { color: C.white, fontWeight: "900", fontSize: 13 },
  toastBody:  { color: C.muted as string, fontSize: 11, fontWeight: "600", marginTop: 1 },
});

const d = StyleSheet.create({
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: C.hairline, alignSelf: "center", marginBottom: 20 },
  hero:     { alignItems: "center", marginBottom: 14, gap: 8 },
  heroIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  readDot:  { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  readTxt:  { color: "#000", fontWeight: "900", fontSize: 11 },
  title:    { color: C.white, fontWeight: "900", fontSize: 18, textAlign: "center", marginBottom: 6 },
  body:     { color: C.mutedMed, fontWeight: "600", fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 14 },
  divider:  { height: 1, backgroundColor: C.border, marginBottom: 12 },
  row:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  rowLeft:  { flexDirection: "row", alignItems: "center", gap: 7 },
  rowLabel: { color: C.muted as string, fontSize: 12, fontWeight: "700" },
  rowValue: { color: C.white, fontSize: 12, fontWeight: "800", flex: 1, textAlign: "right" },
  metaBox:  { backgroundColor: C.glass, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.hairline, marginTop: 8 },
  metaTitle:{ color: C.muted as string, fontWeight: "800", fontSize: 11, marginBottom: 6 },
  metaJson: { color: C.mutedMed, fontWeight: "600", fontSize: 10, lineHeight: 16 },
  actions:  { flexDirection: "row", gap: 10, marginTop: 16 },
  deleteBtn:{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 16, backgroundColor: C.redDim, borderWidth: 1, borderColor: C.redBorder },
  deleteTxt:{ color: C.red, fontWeight: "900", fontSize: 14 },
  closeBtn: { flex: 2, paddingVertical: 14, borderRadius: 16, backgroundColor: C.gold, alignItems: "center" },
  closeTxt: { color: "#000", fontWeight: "900", fontSize: 15 },
});