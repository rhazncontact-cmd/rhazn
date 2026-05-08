// app/rz-admin/vendor-inbox.tsx
// ✅ Boîte de réception du vendeur — liste conversations + chat
// ✅ Vendeur voit tous les utilisateurs qui lui ont écrit
// ✅ Bouton "Répondre" — même logique que rz-admin-support
// ✅ Son + haptic sur nouveau message
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
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { notifSound } from "../../lib/notifSound";
import { supabase } from "../../lib/supabase";

const FOOTER_H            = 80;
const INPUT_MARGIN_FOOTER = 8;

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
  blue:    "#0A84FF",
};

type Conversation = {
  id:              string;
  user_uid:        string;
  last_message_at: string;
  unread_count:    number;
  last_content:    string;
  user_name:       string | null;
  user_avatar:     string | null;
};

type Message = {
  id:         string;
  sender_uid: string;
  content:    string;
  is_read:    boolean;
  created_at: string;
};

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    if ((Date.now() - d.getTime()) / 3600000 < 24)
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return ""; }
}

function fmtDay(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Math.round((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
  } catch { return ""; }
}

function Bubble({ msg, myUid }: { msg: Message; myUid: string }) {
  const isMe = msg.sender_uid === myUid;
  return (
    <View style={[b.row, isMe ? b.rowRight : b.rowLeft]}>
      {!isMe && <View style={b.tag}><Text style={b.tagTxt}>CLIENT</Text></View>}
      <View style={[b.bubble, isMe ? b.bubbleMe : b.bubbleThem]}>
        <Text style={[b.content, isMe ? b.contentMe : b.contentThem]}>{msg.content}</Text>
        <View style={b.footer}>
          <Text style={[b.time, isMe ? b.timeMe : b.timeThem]}>{fmtTime(msg.created_at)}</Text>
          {isMe && (
            <Ionicons name={msg.is_read ? "checkmark-done" : "checkmark"} size={11}
              color={msg.is_read ? C.blue : "rgba(255,255,255,0.40)"} />
          )}
        </View>
      </View>
    </View>
  );
}

const b = StyleSheet.create({
  row:        { marginHorizontal: 12, marginVertical: 3, maxWidth: "82%" },
  rowRight:   { alignSelf: "flex-end", alignItems: "flex-end" },
  rowLeft:    { alignSelf: "flex-start", alignItems: "flex-start" },
  tag:        { marginBottom: 3, marginLeft: 4 },
  tagTxt:     { color: C.muted, fontSize: 9, fontWeight: "700" },
  bubble:     { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe:   { backgroundColor: C.dark, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "#E8E8ED", borderBottomLeftRadius: 4 },
  content:    { fontSize: 15, lineHeight: 21, fontWeight: "500" },
  contentMe:  { color: "#FFFFFF" },
  contentThem:{ color: "#0A0A0A" },
  footer:     { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  time:       { fontSize: 10, fontWeight: "600" },
  timeMe:     { color: "rgba(255,255,255,0.40)" },
  timeThem:   { color: C.muted },
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

function ConvRow({ conv, onPress }: { conv: Conversation; onPress: () => void }) {
  return (
    <TouchableOpacity style={cr.row} onPress={onPress} activeOpacity={0.80}>
      <View style={{ position: "relative" }}>
        {conv.user_avatar ? (
          <Image source={{ uri: conv.user_avatar }} style={cr.avatar} contentFit="cover" />
        ) : (
          <View style={[cr.avatar, cr.fallback]}>
            <Text style={{ color: C.gold, fontWeight: "900", fontSize: 16 }}>
              {(conv.user_name ?? "U")[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={cr.name} numberOfLines={1}>{conv.user_name ?? "Client RHAZN"}</Text>
          <Text style={cr.time}>{fmtTime(conv.last_message_at)}</Text>
        </View>
        <Text style={cr.preview} numberOfLines={1}>{conv.last_content || "Aucun message"}</Text>
      </View>
      {conv.unread_count > 0 && (
        <View style={cr.badge}>
          <Text style={cr.badgeTxt}>{conv.unread_count > 99 ? "99+" : conv.unread_count}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={C.muted} />
    </TouchableOpacity>
  );
}

const cr = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E5EA" },
  avatar:  { width: 52, height: 52, borderRadius: 26 },
  fallback:{ backgroundColor: "rgba(212,175,55,0.12)", alignItems: "center", justifyContent: "center" },
  name:    { color: "#0A0A0A", fontWeight: "800", fontSize: 14, flex: 1 },
  time:    { color: "#8E8E93", fontSize: 11, fontWeight: "600" },
  preview: { color: "#8E8E93", fontSize: 13, fontWeight: "500" },
  badge:   { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeTxt:{ color: "#000", fontWeight: "900", fontSize: 11 },
});

export default function VendorInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [myUid,         setMyUid]         = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [view,          setView]          = useState<"list" | "chat">("list");
  const [activeConv,    setActiveConv]    = useState<Conversation | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [draft,         setDraft]         = useState("");
  const [sending,       setSending]       = useState(false);
  const [kbHeight,      setKbHeight]      = useState(0);

  const listRef = useRef<FlatList>(null);

  useEffect(() => { notifSound.init().catch(() => {}); }, []);

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

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setMyUid(uid);
      await loadConversations(uid);
      setLoading(false);
    })();
  }, []);

  const loadConversations = async (uid: string) => {
    const { data: convs } = await supabase
      .from("vendor_conversations")
      .select("id, user_uid, last_message_at")
      .eq("vendor_uid", uid)
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (!convs || convs.length === 0) { setConversations([]); return; }

    const uids = convs.map((c: any) => c.user_uid);
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name, avatar_url").in("id", uids);
    const profMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

    const enriched: Conversation[] = await Promise.all(
      convs.map(async (c: any) => {
        const { data: last } = await supabase
          .from("vendor_messages").select("content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const { count } = await supabase
          .from("vendor_messages").select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_uid", uid)
          .eq("is_read", false);
        const prof = profMap[c.user_uid] ?? {};
        return {
          id: c.id, user_uid: c.user_uid,
          last_message_at: c.last_message_at, unread_count: count ?? 0,
          last_content: last?.content ?? "",
          user_name: prof.full_name ?? null, user_avatar: prof.avatar_url ?? null,
        };
      })
    );
    setConversations(enriched);
  };

  const openConv = async (conv: Conversation) => {
    if (!myUid) return;
    setActiveConv(conv); setMessages([]); setView("chat"); setLoadingMsgs(true);
    const { data } = await supabase
      .from("vendor_messages").select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true }).limit(300);
    setMessages((data ?? []) as Message[]);
    setLoadingMsgs(false);
    const unread = (data ?? [])
      .filter((m: Message) => m.sender_uid !== myUid && !m.is_read)
      .map((m: Message) => m.id);
    if (unread.length > 0) {
      await supabase.from("vendor_messages").update({ is_read: true }).in("id", unread);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 150);
  };

  const goBack = () => {
    setView("list"); setActiveConv(null); setMessages([]); setDraft("");
    if (myUid) loadConversations(myUid);
  };

  // Realtime
  useEffect(() => {
    if (!myUid) return;
    const channel = supabase
      .channel("vendor-inbox-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendor_messages" },
        async (payload: any) => {
          const msg = payload.new as Message & { conversation_id: string };
          if (activeConv && msg.conversation_id === activeConv.id) {
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
            if (msg.sender_uid !== myUid) {
              try { await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }); await notifSound.play(); } catch {}
              try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
              await supabase.from("vendor_messages").update({ is_read: true }).eq("id", msg.id);
            }
          } else if (msg.sender_uid !== myUid) {
            try { await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }); await notifSound.play(); } catch {}
            try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
            setConversations(prev =>
              prev.map(c => c.id === msg.conversation_id
                ? { ...c, last_content: msg.content, last_message_at: msg.created_at, unread_count: c.unread_count + 1 }
                : c
              ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
            );
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myUid, activeConv]);

  const reply = async () => {
    const content = draft.trim();
    if (!content || sending || !activeConv || !myUid) return;
    setSending(true); setDraft("");
    try {
      // ✅ Essayer vendor_reply (RPC)
      const { data, error } = await supabase.rpc("vendor_reply", {
        p_conversation_id: activeConv.id,
        p_content:         content,
        p_images:          [] as string[],
      });

      if (error) {
        console.warn("vendor_reply error:", error.message, error.code);
        // ✅ Fallback : insert direct si RPC échoue
        const { error: insertErr } = await supabase
          .from("vendor_messages")
          .insert({
            conversation_id: activeConv.id,
            sender_uid:      myUid,
            content:         content,
            images:          [],
          });
        if (insertErr) {
          console.error("insert fallback error:", insertErr.message);
          setDraft(content);
          return;
        }
        // Mettre à jour last_message_at manuellement
        await supabase
          .from("vendor_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", activeConv.id);
      }
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
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

  // VUE LISTE
  if (view === "list") return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Mes messages</Text>
          <Text style={s.headerSub}>
            {conversations.length} conversation{conversations.length > 1 ? "s" : ""}
            {totalUnread > 0 ? ` · ${totalUnread} non lue${totalUnread > 1 ? "s" : ""}` : ""}
          </Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => myUid && loadConversations(myUid)} activeOpacity={0.75}>
          <Ionicons name="refresh" size={18} color={C.gold} />
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40, paddingBottom: FOOTER_H }}>
          <Ionicons name="chatbubble-outline" size={48} color={C.muted} />
          <Text style={{ color: C.muted, fontWeight: "700", fontSize: 14, textAlign: "center" }}>
            Aucun message de client pour le moment.
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

  // VUE CHAT
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          {activeConv?.user_avatar ? (
            <Image source={{ uri: activeConv.user_avatar }}
              style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: "rgba(212,175,55,0.40)" }}
              contentFit="cover" />
          ) : (
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.goldDim, borderWidth: 1.5, borderColor: C.goldBd, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.gold, fontWeight: "900", fontSize: 15 }}>
                {(activeConv?.user_name ?? "C")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={s.headerTitle} numberOfLines={1}>{activeConv?.user_name ?? "Client"}</Text>
            <Text style={s.headerSub}>Client RHAZN</Text>
          </View>
        </View>
      </View>

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
              return <Bubble msg={item.msg} myUid={myUid ?? ""} />;
            }}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[s.inputBar, {
          marginBottom: kbHeight > 0 ? kbHeight + 4 : FOOTER_H + INPUT_MARGIN_FOOTER,
          paddingBottom: 8,
        }]}>
          <TextInput
            style={s.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Répondre au client…"
            placeholderTextColor={C.muted}
            multiline maxLength={2000} autoCorrect={false}
          />
          <TouchableOpacity
            style={[s.pigeonBtn, (!draft.trim() || sending) && s.pigeonBtnOff]}
            onPress={reply} disabled={!draft.trim() || sending} activeOpacity={0.80}
          >
            {sending ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.pigeonIcon}>🕊️</Text>}
          </TouchableOpacity>
        </View>
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
  inputBar:    { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 10, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E5EA" },
  input:       { flex: 1, backgroundColor: "#F2F2F7", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: "#0A0A0A", fontSize: 15, fontWeight: "500", borderWidth: 1, borderColor: "#E5E5EA", maxHeight: 120 },
  pigeonBtn:   { width: 44, height: 44, borderRadius: 22, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", shadowColor: "#D4AF37", shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  pigeonBtnOff:{ opacity: 0.38 },
  pigeonIcon:  { fontSize: 22 },
});