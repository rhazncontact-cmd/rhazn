// app/rz-admin-support.tsx
// ✅ Photo profil dans les bulles (avatar utilisateur à gauche)
// ✅ Son + haptic à chaque nouveau message entrant
// ✅ Clavier WhatsApp-like (header fixe, input flotte juste au-dessus du footer)
// ✅ Pigeon voyageur 🕊️

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { notifSound } from "../lib/notifSound";
import { supabase } from "../lib/supabase";

const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";
// ✅ Espace entre le champ texte et le footer / clavier
const INPUT_MARGIN_FOOTER = 8;
const FOOTER_H            = 80;

const C = {
  bg:      "#F2F2F7",
  card:    "#FFFFFF",
  gold:    "#D4AF37",
  goldDim: "rgba(212,175,55,0.12)",
  goldBd:  "rgba(212,175,55,0.30)",
  text:    "#0A0A0A",
  muted:   "#8E8E93",
  border:  "#E5E5EA",
  dark:    "#1C1C1E",
  green:   "#30D158",
  red:     "#FF3B30",
  blue:    "#0A84FF",
};

type Conversation = {
  id:              string;
  user_uid:        string;
  status:          "OPEN" | "CLOSED";
  last_message_at: string;
  unread_count:    number;
  last_content:    string;
  user_name:       string | null;
  user_avatar:     string | null;
};

type Message = {
  id:          string;
  sender_uid:  string;
  sender_role: "USER" | "ADMIN";
  content:     string;
  is_read:     boolean;
  created_at:  string;
};

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diffH = (Date.now() - d.getTime()) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return ""; }
}

function fmtDay(iso: string): string {
  try {
    const d = new Date(iso);
    const diffDays = Math.round((Date.now() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
  } catch { return ""; }
}

// ─────────────────────────────────────────────────────
// ✅ BUBBLE avec photo profil utilisateur
// ─────────────────────────────────────────────────────
function Bubble({ msg, userAvatar, userName }: {
  msg: Message;
  userAvatar: string | null;
  userName: string | null;
}) {
  const isAdmin = msg.sender_role === "ADMIN";

  return (
    <View style={[b.row, isAdmin ? b.rowRight : b.rowLeft]}>

      {/* ✅ Photo profil utilisateur — à gauche des bulles USER */}
      {!isAdmin && (
        <View style={b.avatarCol}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={b.avatar} contentFit="cover" />
          ) : (
            <View style={[b.avatar, b.avatarFallback]}>
              <Text style={b.avatarInitial}>
                {(userName ?? "U")[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={[b.bubble, isAdmin ? b.bubbleAdmin : b.bubbleUser]}>
        <Text style={[b.content, isAdmin ? b.contentAdmin : b.contentUser]}>
          {msg.content}
        </Text>
        <View style={b.footer}>
          <Text style={[b.time, isAdmin ? b.timeAdmin : b.timeUser]}>
            {fmtTime(msg.created_at)}
          </Text>
          {isAdmin && (
            <Ionicons
              name={msg.is_read ? "checkmark-done" : "checkmark"}
              size={11}
              color={msg.is_read ? C.blue : "rgba(255,255,255,0.40)"}
            />
          )}
        </View>
      </View>

      {/* ✅ Badge ADMIN à droite des bulles admin */}
      {isAdmin && (
        <View style={b.adminBadge}>
          <Ionicons name="shield-checkmark" size={13} color={C.gold} />
        </View>
      )}
    </View>
  );
}

const AVATAR_SIZE = 34;

const b = StyleSheet.create({
  row:          { flexDirection: "row", alignItems: "flex-end", marginHorizontal: 10, marginVertical: 3, maxWidth: "88%" },
  rowRight:     { alignSelf: "flex-end",   justifyContent: "flex-end"  },
  rowLeft:      { alignSelf: "flex-start", justifyContent: "flex-start"},
  avatarCol:    { marginRight: 6, marginBottom: 2 },
  avatar:       { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 1.5, borderColor: "rgba(212,175,55,0.30)" },
  avatarFallback:{ backgroundColor: "rgba(212,175,55,0.15)", alignItems: "center", justifyContent: "center" },
  avatarInitial:{ color: "#D4AF37", fontWeight: "900", fontSize: 13 },
  adminBadge:   { marginLeft: 5, marginBottom: 6 },
  bubble:       { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "85%", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleAdmin:  { backgroundColor: "#1C1C1E", borderBottomRightRadius: 4 },
  bubbleUser:   { backgroundColor: "#E8E8ED", borderBottomLeftRadius: 4 },
  content:      { fontSize: 15, lineHeight: 21, fontWeight: "500" },
  contentAdmin: { color: "#FFFFFF" },
  contentUser:  { color: "#0A0A0A" },
  footer:       { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  time:         { fontSize: 10, fontWeight: "600" },
  timeAdmin:    { color: "rgba(255,255,255,0.40)" },
  timeUser:     { color: "#8E8E93" },
});

function DaySep({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 24, marginVertical: 10 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", marginHorizontal: 10 }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────
// CONVERSATION ROW
// ─────────────────────────────────────────────────────
function ConvRow({ conv, onPress }: { conv: Conversation; onPress: () => void }) {
  return (
    <TouchableOpacity style={cr.row} onPress={onPress} activeOpacity={0.80}>
      <View style={{ position: "relative" }}>
        {conv.user_avatar ? (
          <Image source={{ uri: conv.user_avatar }} style={cr.avatar} contentFit="cover" />
        ) : (
          <View style={[cr.avatar, cr.fallback]}>
            <Text style={{ color: "#D4AF37", fontWeight: "900", fontSize: 16 }}>
              {(conv.user_name ?? "U")[0].toUpperCase()}
            </Text>
          </View>
        )}
        {conv.status === "OPEN" && <View style={cr.dot} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={cr.name} numberOfLines={1}>{conv.user_name ?? "Utilisateur RHAZN"}</Text>
          <Text style={cr.time}>{fmtTime(conv.last_message_at)}</Text>
        </View>
        <Text style={cr.preview} numberOfLines={1}>{conv.last_content || "Aucun message"}</Text>
      </View>
      {conv.unread_count > 0 && (
        <View style={cr.badge}>
          <Text style={cr.badgeTxt}>{conv.unread_count > 99 ? "99+" : conv.unread_count}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
    </TouchableOpacity>
  );
}

const cr = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E5EA" },
  avatar:  { width: 52, height: 52, borderRadius: 26 },
  fallback:{ backgroundColor: "rgba(212,175,55,0.12)", alignItems: "center", justifyContent: "center" },
  dot:     { position: "absolute", bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: "#30D158", borderWidth: 2, borderColor: "#FFFFFF" },
  name:    { color: "#0A0A0A", fontWeight: "800", fontSize: 14, flex: 1 },
  time:    { color: "#8E8E93", fontSize: 11, fontWeight: "600" },
  preview: { color: "#8E8E93", fontSize: 13, fontWeight: "500" },
  badge:   { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeTxt:{ color: "#000", fontWeight: "900", fontSize: 11 },
});

// ─────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────
export default function AdminSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [myUid,         setMyUid]         = useState<string | null>(null);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [view,          setView]          = useState<"list" | "chat">("list");
  const [activeConv,    setActiveConv]    = useState<Conversation | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [draft,         setDraft]         = useState("");
  const [sending,       setSending]       = useState(false);
  const [closing,       setClosing]       = useState(false);

  const listRef       = useRef<FlatList>(null);
  const activeConvRef = useRef<Conversation | null>(null);

  const [kbHeight, setKbHeight] = useState(0); // hauteur réelle du clavier

// ✅ Synchronise le ref à chaque changement de conversation active
useEffect(() => {
  activeConvRef.current = activeConv;
}, [activeConv]);


  // ✅ Init son notifSound
  useEffect(() => {
    notifSound.init().catch(() => {});
  }, []);

  // ✅ Mesure hauteur exacte du clavier
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKbHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ✅ Jouer son + haptic pour chaque nouveau message entrant
  const playAlert = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      await notifSound.play();
    } catch {}
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setMyUid(uid);
      const { data: adminRow } = await supabase
        .from("support_admins").select("user_uid").eq("user_uid", uid).maybeSingle();
      const admin = !!adminRow || session.user.email === SUPREME_EMAIL;
      setIsAdmin(admin);
      if (admin) await loadConversations();
      setLoading(false);
    })();
  }, []);

  const loadConversations = async () => {
    const { data: convs } = await supabase
      .from("support_conversations")
      .select("id, user_uid, status, last_message_at")
      .order("last_message_at", { ascending: false }).limit(100);
    if (!convs || convs.length === 0) { setConversations([]); return; }

    const uids = convs.map((c: any) => c.user_uid);
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name, avatar_url").in("id", uids);
    const profMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

    const enriched: Conversation[] = await Promise.all(
      convs.map(async (c: any) => {
        const { data: last } = await supabase
          .from("support_messages").select("content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const { count } = await supabase
          .from("support_messages").select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id).eq("sender_role", "USER").eq("is_read", false);
        const prof = profMap[c.user_uid] ?? {};
        return {
          id: c.id, user_uid: c.user_uid, status: c.status,
          last_message_at: c.last_message_at, unread_count: count ?? 0,
          last_content: last?.content ?? "",
          user_name: prof.full_name ?? null, user_avatar: prof.avatar_url ?? null,
        };
      })
    );
    setConversations(enriched);
  };

  const openConv = async (conv: Conversation) => {
    setActiveConv(conv);
    setMessages([]);
    setView("chat");
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("support_messages").select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true }).limit(300);
    setMessages((data ?? []) as Message[]);
    setLoadingMsgs(false);
    const unread = (data ?? [])
      .filter((m: Message) => m.sender_role === "USER" && !m.is_read)
      .map((m: Message) => m.id);
    if (unread.length > 0) {
      await supabase.from("support_messages").update({ is_read: true }).in("id", unread);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
  };

  const goBack = () => {
    setView("list"); setActiveConv(null); setMessages([]); setDraft("");
    loadConversations();
  };

  // ✅ Realtime + son + haptic sur nouveau message USER
    // ✅ Realtime + son + haptic sur nouveau message USER
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-support-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" },
        async (payload: any) => {
          const msg = payload.new as Message & { conversation_id: string };
          const currentConv = activeConvRef.current; // ✅ toujours à jour

          if (currentConv && msg.conversation_id === currentConv.id) {
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);

            if (msg.sender_role === "USER") {
              await playAlert();
              await supabase.from("support_messages").update({ is_read: true }).eq("id", msg.id);
            }
          } else {
            if (msg.sender_role === "USER") {
              await playAlert();
            }
            setConversations(prev =>
              prev.map(c => c.id === msg.conversation_id
                ? { ...c, last_content: msg.content, last_message_at: msg.created_at,
                    unread_count: msg.sender_role === "USER" ? c.unread_count + 1 : c.unread_count }
                : c
              ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
            );
          }
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_conversations" },
        () => loadConversations()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]); // ✅ Plus de activeConv ici — évite de recréer le channel à chaque ouverture


  const reply = async () => {
    const content = draft.trim();
    if (!content || sending || !activeConv) return;
    setSending(true); setDraft("");
    try {
      const { error } = await supabase.rpc("admin_reply_support", {
        p_conversation_id: activeConv.id, p_content: content,
      });
      if (error) { setDraft(content); }
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const toggleStatus = async () => {
    if (!activeConv || closing) return;
    setClosing(true);
    const newStatus = activeConv.status === "OPEN" ? "CLOSED" : "OPEN";
    await supabase.from("support_conversations").update({ status: newStatus }).eq("id", activeConv.id);
    setActiveConv(prev => prev ? { ...prev, status: newStatus } : prev);
    setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, status: newStatus } : c));
    setClosing(false);
  };

  type ListItem = { type: "sep"; label: string; key: string } | { type: "msg"; msg: Message };
  const listItems: ListItem[] = [];
  let lastDay = "";
  for (const msg of messages) {
    const day = fmtDay(msg.created_at);
    if (day !== lastDay) { lastDay = day; listItems.push({ type: "sep", label: day, key: `sep-${day}` }); }
    listItems.push({ type: "msg", msg });
  }

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  if (loading) return (
    <View style={[s.screen, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator color={C.gold} size="large" />
    </View>
  );

  if (!isAdmin) return (
    <View style={[s.screen, { paddingTop: insets.top, alignItems: "center", justifyContent: "center", gap: 14 }]}>
      <Ionicons name="lock-closed" size={40} color={C.red} />
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 18 }}>Accès refusé</Text>
      <TouchableOpacity style={s.goldBtn} onPress={() => router.back()}>
        <Text style={s.goldBtnTxt}>Retour</Text>
      </TouchableOpacity>
    </View>
  );

  // ════════════════════════════════════════════════
  // VUE LISTE
  // ════════════════════════════════════════════════
  if (view === "list") return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Support Admin</Text>
          <Text style={s.headerSub}>
            {conversations.length} conversation{conversations.length > 1 ? "s" : ""}
            {totalUnread > 0 ? ` · ${totalUnread} non lue${totalUnread > 1 ? "s" : ""}` : ""}
          </Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={loadConversations} activeOpacity={0.75}>
          <Ionicons name="refresh" size={18} color={C.gold} />
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40, paddingBottom: FOOTER_H }}>
          <Ionicons name="chatbubble-outline" size={48} color={C.muted} />
          <Text style={{ color: C.muted, fontWeight: "700", fontSize: 14, textAlign: "center" }}>
            Aucune conversation pour le moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          renderItem={({ item }) => <ConvRow conv={item} onPress={() => openConv(item)} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: FOOTER_H + 20 }}
        />
      )}
    </View>
  );

  // ════════════════════════════════════════════════
  // VUE CHAT
  // ════════════════════════════════════════════════
  // ✅ marginBottom = FOOTER_H + INPUT_MARGIN_FOOTER pour l'espace parfait
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>

      {/* HEADER — fixe, hors KeyboardAvoidingView */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          {/* ✅ Photo profil de l'utilisateur dans le header */}
          {activeConv?.user_avatar ? (
            <Image source={{ uri: activeConv.user_avatar }}
              style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "rgba(212,175,55,0.40)" }}
              contentFit="cover" />
          ) : (
            <View style={{ width: 38, height: 38, borderRadius: 19,
              backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.35)",
              alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#D4AF37", fontWeight: "900", fontSize: 15 }}>
                {(activeConv?.user_name ?? "U")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {activeConv?.user_name ?? "Utilisateur RHAZN"}
            </Text>
            <Text style={[s.headerSub, activeConv?.status === "CLOSED" && { color: C.red }]}>
              {activeConv?.status === "CLOSED" ? "Conversation clôturée" : "Conversation ouverte"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.statusBtn, activeConv?.status === "OPEN" ? s.statusClose : s.statusOpen]}
          onPress={toggleStatus} disabled={closing} activeOpacity={0.82}
        >
          {closing ? (
            <ActivityIndicator size="small" color={C.muted} />
          ) : (
            <Text style={[s.statusBtnTxt,
              activeConv?.status === "OPEN" ? { color: C.muted } : { color: C.gold }]}>
              {activeConv?.status === "OPEN" ? "Clôturer" : "Rouvrir"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ✅ KeyboardAvoidingView : FlatList + InputBar
          behavior=padding → pousse l'input vers le haut quand clavier monte
          Les messages restent scrollables dans la FlatList (flex:1) */}
      {/* ✅ Pas de KeyboardAvoidingView — marginBottom dynamique selon hauteur clavier */}
      <View style={{ flex: 1 }}>
        {loadingMsgs ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={C.gold} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listItems}
            keyExtractor={item => item.type === "sep" ? item.key : item.msg.id}
            renderItem={({ item }) => {
              if (item.type === "sep") return <DaySep label={item.label} />;
              return (
                <Bubble
                  msg={item.msg}
                  userAvatar={activeConv?.user_avatar ?? null}
                  userName={activeConv?.user_name ?? null}
                />
              );
            }}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* ✅ BARRE INPUT
            marginBottom = FOOTER_H + INPUT_MARGIN_FOOTER
            → 1/2 espace au-dessus du footer RHAZN
            → 1/2 espace au-dessus du clavier (géré par KeyboardAvoidingView) */}
        {activeConv?.status !== "CLOSED" ? (
          <View style={[s.inputBar, {
            // ✅ kbHeight = hauteur réelle clavier
          // Clavier ouvert  → input juste au-dessus du clavier (+ 4px de respiration)
          // Clavier fermé   → input au-dessus du footer RHAZN
          marginBottom: kbHeight > 0 ? kbHeight + 4 : FOOTER_H + INPUT_MARGIN_FOOTER,
            paddingBottom: 8,
          }]}>
            <TextInput
              style={s.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Répondre à l'utilisateur…"
              placeholderTextColor={C.muted}
              multiline
              maxLength={2000}
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[s.pigeonBtn, (!draft.trim() || sending) && s.pigeonBtnOff]}
              onPress={reply}
              disabled={!draft.trim() || sending}
              activeOpacity={0.80}
            >
              {sending ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={s.pigeonIcon}>🕊️</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.closedBar, { marginBottom: kbHeight > 0 ? kbHeight + 4 : FOOTER_H + INPUT_MARGIN_FOOTER }]}>
            <Ionicons name="lock-closed-outline" size={14} color={C.muted} />
            <Text style={s.closedTxt}>Clôturée — appuyez sur "Rouvrir" pour répondre.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: "#F2F2F7" },
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 35, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E5EA", gap: 10 },
  backBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F2F2F7", borderWidth: 1, borderColor: "#E5E5EA", alignItems: "center", justifyContent: "center" },
  refreshBtn:  { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1, borderColor: "rgba(212,175,55,0.30)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#0A0A0A", fontWeight: "900", fontSize: 15 },
  headerSub:   { color: "#8E8E93", fontSize: 11, fontWeight: "600", marginTop: 1 },
  statusBtn:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  statusClose: { backgroundColor: "#F2F2F7", borderColor: "#E5E5EA" },
  statusOpen:  { backgroundColor: "rgba(212,175,55,0.12)", borderColor: "rgba(212,175,55,0.30)" },
  statusBtnTxt:{ fontWeight: "800", fontSize: 11 },
  closedBar:   { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, backgroundColor: "#E5E5EA", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  closedTxt:   { flex: 1, color: "#8E8E93", fontSize: 12, fontWeight: "600" },
  inputBar:    { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 10, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E5EA" },
  input:       { flex: 1, backgroundColor: "#F2F2F7", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: "#0A0A0A", fontSize: 15, fontWeight: "500", borderWidth: 1, borderColor: "#E5E5EA", maxHeight: 120 },
  pigeonBtn:   { width: 44, height: 44, borderRadius: 22, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", shadowColor: "#D4AF37", shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  pigeonBtnOff:{ opacity: 0.38 },
  pigeonIcon:  { fontSize: 22 },
  goldBtn:     { backgroundColor: "#D4AF37", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13, marginTop: 8 },
  goldBtnTxt:  { color: "#000", fontWeight: "900", fontSize: 14 },
});