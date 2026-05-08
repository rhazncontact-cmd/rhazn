// app/rz-channel/vendor-chat.tsx
// ✅ Chat utilisateur ↔ vendeur RHAZN
// ✅ Pas de paywall — accès direct au chat
// ✅ Images produits du vendeur (max 10)
// ✅ Clavier WhatsApp-like, pigeon voyageur 🕊️
// ✅ Son + haptic sur réponse vendeur

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { notifSound } from "../../lib/notifSound";
import { supabase } from "../../lib/supabase";

const FOOTER_H   = 80;
const INPUT_MARGIN = 8;
const MAX_IMAGES = 10;

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

type Message = {
  id:         string;
  sender_uid: string;
  content:    string;
  images:     string[];
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
function parseImages(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((u: any) => typeof u === "string");
  try { return JSON.parse(raw); } catch { return []; }
}
function parseImageUrls(raw: any): string[] {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(arr)) return arr.filter((u: any) => typeof u === "string" && u.length > 0);
  } catch {}
  return [];
}

// ─────────────────────────────────────────────────────
// BUBBLE
// ─────────────────────────────────────────────────────
function Bubble({ msg, myUid }: { msg: Message; myUid: string }) {
  const isMe = msg.sender_uid === myUid;
  const imgs = parseImages(msg.images);
  return (
    <View style={[b.wrap, isMe ? b.wrapRight : b.wrapLeft]}>
      {imgs.length > 0 && (
        <View style={[b.imgGrid, isMe ? b.imgGridRight : b.imgGridLeft]}>
          {imgs.map((url, i) => (
            <View key={i} style={b.imgThumb}>
              <Image source={{ uri: url }} style={b.imgThumbImg} contentFit="cover" />
              {imgs.length > 1 && <View style={b.imgNum}><Text style={b.imgNumTxt}>{i + 1}</Text></View>}
            </View>
          ))}
        </View>
      )}
      {msg.content.trim().length > 0 && (
        <View style={[b.bubble, isMe ? b.bubbleMe : b.bubbleThem, imgs.length > 0 && b.bubbleAfterImg]}>
          <Text style={[b.content, isMe ? b.contentMe : b.contentThem]}>{msg.content}</Text>
          <View style={b.footer}>
            <Text style={[b.time, isMe ? b.timeMe : b.timeThem]}>{fmtTime(msg.created_at)}</Text>
            {isMe && <Ionicons name={msg.is_read ? "checkmark-done" : "checkmark"} size={11} color={msg.is_read ? C.blue : "rgba(0,0,0,0.35)"} />}
          </View>
        </View>
      )}
      {msg.content.trim().length === 0 && imgs.length > 0 && (
        <Text style={[b.timeOnly, isMe ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" }]}>
          {fmtTime(msg.created_at)}
        </Text>
      )}
    </View>
  );
}
const THUMB_W = 120;
const b = StyleSheet.create({
  wrap:          { marginHorizontal: 10, marginVertical: 4, maxWidth: "85%" },
  wrapRight:     { alignSelf: "flex-end", alignItems: "flex-end" },
  wrapLeft:      { alignSelf: "flex-start", alignItems: "flex-start" },
  imgGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 },
  imgGridRight:  { justifyContent: "flex-end" },
  imgGridLeft:   { justifyContent: "flex-start" },
  imgThumb:      { width: THUMB_W, height: THUMB_W, borderRadius: 12, overflow: "hidden", position: "relative", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.35)" },
  imgThumbImg:   { width: "100%", height: "100%" },
  imgNum:        { position: "absolute", bottom: 5, right: 5, backgroundColor: "rgba(0,0,0,0.60)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  imgNumTxt:     { color: "#FFF", fontSize: 9, fontWeight: "900" },
  bubble:        { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAfterImg:{ borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  bubbleMe:      { backgroundColor: C.gold, borderBottomRightRadius: 4 },
  bubbleThem:    { backgroundColor: "#E8E8ED", borderBottomLeftRadius: 4 },
  content:       { fontSize: 15, lineHeight: 21, fontWeight: "500" },
  contentMe:     { color: "#000" },
  contentThem:   { color: C.dark },
  footer:        { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  time:          { fontSize: 10, fontWeight: "600" },
  timeMe:        { color: "rgba(0,0,0,0.45)" },
  timeThem:      { color: C.muted },
  timeOnly:      { color: C.muted, fontSize: 10, fontWeight: "600", marginTop: 2 },
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
// IMAGE PICKER MODAL
// ─────────────────────────────────────────────────────
function ImagePickerModal({ visible, vendorId, selected, onToggle, onConfirm, onClose }: {
  visible: boolean; vendorId: string; selected: string[];
  onToggle: (url: string) => void; onConfirm: () => void; onClose: () => void;
}) {
  const [productImages, setProductImages] = useState<{ url: string; productTitle: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("title, cover_url, image_urls")
        .eq("user_id", vendorId)
        .eq("cadna_status", "approved")
        .not("cover_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      const imgs: { url: string; productTitle: string | null }[] = [];
      for (const pub of data ?? []) {
        if (pub.cover_url) imgs.push({ url: pub.cover_url, productTitle: pub.title });
        for (const url of parseImageUrls(pub.image_urls)) {
          if (url !== pub.cover_url) imgs.push({ url, productTitle: pub.title });
        }
      }
      setProductImages(imgs);
      setLoading(false);
    })();
  }, [visible, vendorId]);

  const cellSize = (370 - 32 - 8) / 3;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ip.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={ip.sheet}>
          <View style={ip.handle} />
          <View style={ip.header}>
            <View>
              <Text style={ip.headerTitle}>Images produits</Text>
              <Text style={ip.headerSub}>
                {selected.length === 0
                  ? `Sélectionnez jusqu'à ${MAX_IMAGES} images`
                  : `${selected.length} / ${MAX_IMAGES} sélectionnée${selected.length > 1 ? "s" : ""}`}
              </Text>
            </View>
            <TouchableOpacity style={ip.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={C.muted} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
              <ActivityIndicator color={C.gold} size="large" />
              <Text style={{ color: C.muted, fontWeight: "700" }}>Chargement des produits…</Text>
            </View>
          ) : productImages.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
              <Ionicons name="images-outline" size={48} color={C.muted} />
              <Text style={{ color: C.muted, fontWeight: "700", fontSize: 14, textAlign: "center" }}>
                Ce vendeur n'a pas encore publié de produits.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ip.grid}>
              {productImages.map((item, i) => {
                const isSelected = selected.includes(item.url);
                const selIdx = selected.indexOf(item.url);
                const disabled = !isSelected && selected.length >= MAX_IMAGES;
                return (
                  <TouchableOpacity
                    key={`${item.url}-${i}`}
                    style={[ip.cell, { width: cellSize, height: cellSize }, isSelected && ip.cellSelected, disabled && ip.cellDisabled]}
                    onPress={() => { if (!disabled) onToggle(item.url); }}
                    activeOpacity={0.80}
                  >
                    <Image source={{ uri: item.url }} style={ip.cellImg} contentFit="cover" />
                    {isSelected && (
                      <View style={ip.selectedOverlay}>
                        <View style={ip.selectedBadge}><Text style={ip.selectedNum}>{selIdx + 1}</Text></View>
                      </View>
                    )}
                    {disabled && <View style={ip.disabledOverlay} />}
                    {item.productTitle && (
                      <View style={ip.cellCaption}>
                        <Text style={ip.cellCaptionTxt} numberOfLines={1}>{item.productTitle}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          {selected.length > 0 && (
            <TouchableOpacity style={ip.confirmBtn} onPress={onConfirm} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={20} color="#000" />
              <Text style={ip.confirmTxt}>
                Joindre {selected.length} image{selected.length > 1 ? "s" : ""}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
const ip = StyleSheet.create({
  backdrop:       { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:          { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingBottom: 40, maxHeight: "85%", minHeight: 400 },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.15)", alignSelf: "center", marginTop: 12, marginBottom: 6 },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E5EA", marginBottom: 12 },
  headerTitle:    { color: "#0A0A0A", fontWeight: "900", fontSize: 16 },
  headerSub:      { color: "#8E8E93", fontSize: 12, fontWeight: "600", marginTop: 2 },
  closeBtn:       { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" },
  grid:           { flexDirection: "row", flexWrap: "wrap", gap: 4, paddingBottom: 16 },
  cell:           { borderRadius: 10, overflow: "hidden", position: "relative" },
  cellSelected:   { borderWidth: 2.5, borderColor: "#D4AF37" },
  cellDisabled:   { opacity: 0.45 },
  cellImg:        { width: "100%", height: "100%" },
  selectedOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(212,175,55,0.25)", alignItems: "flex-end", justifyContent: "flex-start", padding: 5 },
  selectedBadge:  { width: 22, height: 22, borderRadius: 11, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFF" },
  selectedNum:    { color: "#000", fontWeight: "900", fontSize: 11 },
  disabledOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.50)" },
  cellCaption:    { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 5, paddingVertical: 3 },
  cellCaptionTxt: { color: "#FFF", fontSize: 9, fontWeight: "700" },
  confirmBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#D4AF37", borderRadius: 18, paddingVertical: 15, marginTop: 10 },
  confirmTxt:     { color: "#000", fontWeight: "900", fontSize: 16 },
});

// ─────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────
export default function VendorChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { vendorId, vendorName, isAgent } = useLocalSearchParams<{ vendorId: string; vendorName: string; isAgent?: string }>();
  const agentMode = isAgent === "true"; // ✅ pas de paywall si agent

  const [myUid,        setMyUid]        = useState<string | null>(null);
  const [convId,       setConvId]       = useState<string | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [draft,        setDraft]        = useState("");
  const [kbHeight,     setKbHeight]     = useState(0);
  const [vendorAvatar, setVendorAvatar] = useState<string | null>(null);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [selectedImgs, setSelectedImgs] = useState<string[]>([]);
  // ✅ Vérification paiement

  // ✅ Présence vendeur
  const [isVendorOnline, setIsVendorOnline] = useState(false);

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
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid || !alive) return;
      setMyUid(uid);

      const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("id", vendorId).maybeSingle();
      setVendorAvatar(prof?.avatar_url ?? null);

      // ✅ Charger présence vendeur
      const { data: presence } = await supabase
        .from("user_presence")
        .select("is_online, last_seen")
        .eq("user_uid", vendorId)
        .maybeSingle();
      if (presence) {
        const lastSeen = new Date(presence.last_seen).getTime();
        setIsVendorOnline(presence.is_online && (Date.now() - lastSeen) < 120_000);
      }



      const { data: conv } = await supabase
        .from("vendor_conversations").select("id")
        .eq("vendor_uid", vendorId).eq("user_uid", uid).maybeSingle();
      if (conv) { setConvId(conv.id); await loadMessages(conv.id, uid); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [vendorId]);

  const loadMessages = async (cid: string, uid: string) => {
    const { data } = await supabase
      .from("vendor_messages").select("*")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true }).limit(200);
    const msgs = (data ?? []).map((m: any) => ({ ...m, images: parseImages(m.images) }));
    setMessages(msgs as Message[]);
    const unread = msgs.filter(m => m.sender_uid !== uid && !m.is_read).map(m => m.id);
    if (unread.length > 0)
      await supabase.from("vendor_messages").update({ is_read: true }).in("id", unread);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
  };

  // ✅ Realtime présence vendeur
  useEffect(() => {
    if (!vendorId) return;
    const channel = supabase
      .channel(`vendor-presence-chat-${vendorId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "user_presence",
        filter: `user_uid=eq.${vendorId}`,
      }, (payload: any) => {
        const lastSeen = new Date(payload.new?.last_seen ?? 0).getTime();
        setIsVendorOnline(payload.new?.is_online && (Date.now() - lastSeen) < 120_000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [vendorId]);

  useEffect(() => {
    if (!convId || !myUid) return;
    const channel = supabase
      .channel(`vendor-chat-${convId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "vendor_messages", filter: `conversation_id=eq.${convId}`,
      }, async (payload) => {
        const raw = payload.new as any;
        const msg: Message = { ...raw, images: parseImages(raw.images) };
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender_uid !== myUid) {
          try { await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }); await notifSound.play(); } catch {}
          try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
          await supabase.from("vendor_messages").update({ is_read: true }).eq("id", msg.id);
        }
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convId, myUid]);

  const toggleImage = (url: string) => {
    setSelectedImgs(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) :
      prev.length < MAX_IMAGES ? [...prev, url] : prev
    );
  };

  const send = async () => {
    const content = draft.trim();
    if ((!content && selectedImgs.length === 0) || sending || !myUid) return;
    setSending(true);
    const imgsCopy = [...selectedImgs];
    setDraft(""); setSelectedImgs([]);
    try {
      const { data, error } = await supabase.rpc("send_vendor_message", {
        p_vendor_uid: vendorId, p_content: content || " ", p_images: imgsCopy,
      });
      if (error) { setDraft(content); setSelectedImgs(imgsCopy); return; }
      if (!convId && data?.conversation_id) {
        setConvId(data.conversation_id);
        await loadMessages(data.conversation_id, myUid);
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

  const canSend = (draft.trim().length > 0 || selectedImgs.length > 0) && !sending;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          {vendorAvatar ? (
            <Image source={{ uri: vendorAvatar }}
              style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: "rgba(212,175,55,0.40)" }}
              contentFit="cover" />
          ) : (
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.goldDim,
              borderWidth: 1.5, borderColor: C.goldBd, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.gold, fontWeight: "900", fontSize: 15 }}>
                {(vendorName ?? "V")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={s.headerTitle} numberOfLines={1}>{vendorName ?? "Vendeur"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
              {isVendorOnline && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
              )}
              <Text style={[s.headerSub, !isVendorOnline && { color: "#FF3B30" }]}>
                {isVendorOnline ? "En ligne" : "Hors ligne"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* BODY */}
      <View style={{ flex: 1 }}>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={C.gold} size="large" />
          </View>
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14,
            paddingHorizontal: 40, paddingBottom: FOOTER_H }}>
            <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: C.goldDim,
              borderWidth: 1, borderColor: C.goldBd, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={C.gold} />
            </View>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 18, textAlign: "center" }}>
              Contacter {vendorName ?? "ce vendeur"}
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 22 }}>
              Posez vos questions et partagez des images de produits{"\n"}pour animer votre échange.
            </Text>
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

        {/* Preview images sélectionnées */}
        {selectedImgs.length > 0 && (
          <View style={s.previewBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 6 }}>
              {selectedImgs.map((url, i) => (
                <View key={i} style={s.previewThumb}>
                  <Image source={{ uri: url }} style={s.previewImg} contentFit="cover" />
                  <TouchableOpacity style={s.previewRemove}
                    onPress={() => setSelectedImgs(prev => prev.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                  <View style={s.previewNum}><Text style={s.previewNumTxt}>{i + 1}</Text></View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* INPUT BAR */}
        <View style={[s.inputBar, {
          marginBottom: kbHeight > 0 ? kbHeight + 4 : FOOTER_H + INPUT_MARGIN,
          paddingBottom: 8,
        }]}>
          <TouchableOpacity
            style={[s.galleryBtn, selectedImgs.length > 0 && s.galleryBtnActive]}
            onPress={() => { Keyboard.dismiss(); setPickerOpen(true); }}
            activeOpacity={0.80}
          >
            <Ionicons name="images-outline" size={20} color={selectedImgs.length > 0 ? "#000" : C.gold} />
            {selectedImgs.length > 0 && (
              <View style={s.galleryCount}>
                <Text style={s.galleryCountTxt}>{selectedImgs.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TextInput
            style={s.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={selectedImgs.length > 0 ? "Ajouter un commentaire…" : `Écrire à ${vendorName ?? "ce vendeur"}…`}
            placeholderTextColor={C.muted}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[s.pigeonBtn, !canSend && s.pigeonBtnOff]}
            onPress={send}
            disabled={!canSend}
            activeOpacity={0.80}
          >
            {sending ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.pigeonIcon}>🕊️</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <ImagePickerModal
        visible={pickerOpen}
        vendorId={vendorId}
        selected={selectedImgs}
        onToggle={toggleImage}
        onConfirm={() => { setPickerOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: "#F2F2F7" },
  header:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 35, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E5EA", gap: 10 },
  backBtn:        { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F2F2F7", borderWidth: 1, borderColor: "#E5E5EA", alignItems: "center", justifyContent: "center" },
  headerTitle:    { color: "#0A0A0A", fontWeight: "900", fontSize: 15 },
  headerSub:      { color: "#8E8E93", fontSize: 11, fontWeight: "600" },
  previewBar:     { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E5EA" },
  previewThumb:   { width: 64, height: 64, borderRadius: 10, overflow: "hidden", position: "relative", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.40)" },
  previewImg:     { width: "100%", height: "100%" },
  previewRemove:  { position: "absolute", top: -4, right: -4, backgroundColor: "#FFFFFF", borderRadius: 9 },
  previewNum:     { position: "absolute", bottom: 3, left: 3, backgroundColor: "rgba(0,0,0,0.60)", borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1 },
  previewNumTxt:  { color: "#FFF", fontSize: 9, fontWeight: "900" },
  inputBar:       { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 10, paddingTop: 10, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E5EA" },
  galleryBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.35)", alignItems: "center", justifyContent: "center", position: "relative" },
  galleryBtnActive:{ backgroundColor: "#D4AF37", borderColor: "#D4AF37" },
  galleryCount:   { position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FF3B30", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  galleryCountTxt:{ color: "#FFF", fontSize: 9, fontWeight: "900" },
  input:          { flex: 1, backgroundColor: "#F2F2F7", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: "#0A0A0A", fontSize: 15, fontWeight: "500", borderWidth: 1, borderColor: "#E5E5EA", maxHeight: 120 },
  pigeonBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", shadowColor: "#D4AF37", shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  pigeonBtnOff:   { opacity: 0.38 },
  pigeonIcon:     { fontSize: 22 },
});