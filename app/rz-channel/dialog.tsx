// app/rz-channel/dialog.tsx
// ✅ Accès galerie LOCALE du téléphone (toutes photos, captures d'écran, etc.)
// ✅ Copier/coller via appui long
// ✅ Son + haptic à chaque réponse admin
// ✅ Clavier WhatsApp-like

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
// ✅ Même import que auteur.tsx
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { notifSound } from "../../lib/notifSound";
import { supabase } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────
const FOOTER_H            = 80;
const INPUT_MARGIN_FOOTER = 8;
const BUCKET              = "dialog-images";

const C = {
  bg:     "#F2F2F7",
  card:   "#FFFFFF",
  gold:   "#D4AF37",
  text:   "#0A0A0A",
  muted:  "#8E8E93",
  border: "#E5E5EA",
  dark:   "#1C1C1E",
  green:  "#30D158",
  blue:   "#0A84FF",
  danger: "#FF3B30",
};

type Message = {
  id:          string;
  sender_uid:  string;
  sender_role: "USER" | "ADMIN";
  content:     string;
  image_url:   string | null;
  is_read:     boolean;
  created_at:  string;
};

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    if ((Date.now() - d.getTime()) / 3600000 < 24)
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " · " +
           d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function fmtDay(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Math.round((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return ""; }
}

// ─────────────────────────────────────────────────────────────
// VISIONNEUSE IMAGE PLEIN ÉCRAN
// ─────────────────────────────────────────────────────────────
function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={iv.overlay} onPress={onClose}>
        {/* ✅ expo-image comme auteur.tsx */}
        <Image source={{ uri }} style={iv.img} contentFit="contain" />
        <View style={iv.closeBtn}>
          <Ionicons name="close-circle" size={36} color="#FFF" />
        </View>
      </Pressable>
    </Modal>
  );
}
const iv = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.93)", justifyContent: "center", alignItems: "center" },
  img:      { width: "94%", height: "80%" },
  closeBtn: { position: "absolute", top: 54, right: 18 },
});

// ─────────────────────────────────────────────────────────────
// BULLE DE MESSAGE
// ─────────────────────────────────────────────────────────────
function Bubble({ msg, myUid, onImagePress, onLongPress }: {
  msg: Message;
  myUid: string;
  onImagePress: (uri: string) => void;
  onLongPress:  (msg: Message) => void;
}) {
  const isMe = msg.sender_uid === myUid;
  return (
    <View style={[b.row, isMe ? b.rowRight : b.rowLeft]}>
      {!isMe && (
        <View style={b.adminBadge}>
          <Ionicons name="shield-checkmark" size={9} color={C.gold} />
          <Text style={b.adminBadgeTxt}>RHAZN</Text>
        </View>
      )}
      <Pressable
        style={[b.bubble, isMe ? b.bubbleUser : b.bubbleAdmin]}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onLongPress(msg);
        }}
        delayLongPress={380}
      >
        {/* Image dans la bulle */}
        {msg.image_url ? (
          <Pressable onPress={() => onImagePress(msg.image_url!)} style={b.imgWrap}>
            {/* ✅ expo-image comme auteur.tsx */}
            <Image
              source={{ uri: msg.image_url }}
              style={b.img}
              contentFit="cover"
              transition={200}
            />
          </Pressable>
        ) : null}
        {/* Texte */}
        {msg.content ? (
          <Text style={[b.content, isMe ? b.contentUser : b.contentAdmin]}>
            {msg.content}
          </Text>
        ) : null}
        <View style={b.footer}>
          <Text style={[b.time, isMe ? b.timeUser : b.timeAdmin]}>
            {fmtTime(msg.created_at)}
          </Text>
          {isMe && (
            <Ionicons
              name={msg.is_read ? "checkmark-done" : "checkmark"}
              size={12}
              color={msg.is_read ? C.blue : "rgba(0,0,0,0.35)"}
            />
          )}
        </View>
      </Pressable>
    </View>
  );
}
const b = StyleSheet.create({
  row:          { marginHorizontal: 12, marginVertical: 3, maxWidth: "82%" },
  rowRight:     { alignSelf: "flex-end",   alignItems: "flex-end"   },
  rowLeft:      { alignSelf: "flex-start", alignItems: "flex-start" },
  adminBadge:   { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 3, marginLeft: 4 },
  adminBadgeTxt:{ color: C.gold, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  bubble:       { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, overflow: "hidden" },
  bubbleUser:   { backgroundColor: C.gold, borderBottomRightRadius: 4 },
  bubbleAdmin:  { backgroundColor: "#1C1C1E", borderBottomLeftRadius: 4 },
  imgWrap:      { borderRadius: 12, overflow: "hidden", marginBottom: 6, marginHorizontal: -4 },
  img:          { width: 220, height: 180, borderRadius: 12 },
  content:      { fontSize: 15, lineHeight: 21, fontWeight: "500" },
  contentUser:  { color: "#000" },
  contentAdmin: { color: "#FFF" },
  footer:       { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  time:         { fontSize: 10, fontWeight: "600" },
  timeUser:     { color: "rgba(0,0,0,0.45)" },
  timeAdmin:    { color: "rgba(255,255,255,0.40)" },
});

// ─────────────────────────────────────────────────────────────
// SÉPARATEUR DE JOUR
// ─────────────────────────────────────────────────────────────
function DaySep({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 24, marginVertical: 10 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", marginHorizontal: 10 }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// PREVIEW IMAGE AVANT ENVOI
// ─────────────────────────────────────────────────────────────
function ImagePreviewBar({ uri, onRemove }: { uri: string; onRemove: () => void }) {
  return (
    <View style={ip.bar}>
      {/* ✅ expo-image */}
      <Image source={{ uri }} style={ip.thumb} contentFit="cover" />
      <Pressable style={ip.removeBtn} onPress={onRemove} hitSlop={12}>
        <Ionicons name="close-circle" size={22} color="#FFF" />
      </Pressable>
      <Text style={ip.label}>Image prête à envoyer</Text>
      <Ionicons name="checkmark-circle" size={16} color={C.gold} />
    </View>
  );
}
const ip = StyleSheet.create({
  bar:       { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(212,175,55,0.08)", borderTopWidth: 1, borderTopColor: "rgba(212,175,55,0.25)" },
  thumb:     { width: 52, height: 52, borderRadius: 10, borderWidth: 2, borderColor: C.gold },
  removeBtn: { position: "absolute", top: 2, left: 48, zIndex: 10 },
  label:     { color: C.gold, fontWeight: "700", fontSize: 12, flex: 1 },
});

// ─────────────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function DialogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [myUid,    setMyUid]    = useState<string | null>(null);
  const [convId,   setConvId]   = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [draft,    setDraft]    = useState("");
  const [status,   setStatus]   = useState<"OPEN" | "CLOSED">("OPEN");
  const [kbHeight, setKbHeight] = useState(0);

  // Image
  const [pendingUri,     setPendingUri]     = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewingImage,   setViewingImage]   = useState<string | null>(null);

  const listRef = useRef<FlatList>(null);

  // ── Init son ───────────────────────────────────────────────
  useEffect(() => { notifSound.init().catch(() => {}); }, []);

  // ── Clavier ────────────────────────────────────────────────
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      e => setKbHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Alerte admin ────────────────────────────────────────────
  const playAlert = async () => {
    try { await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }); await notifSound.play(); } catch {}
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  };

  // ── Init conversation ───────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid || !alive) return;
      setMyUid(uid);
      const { data: conv } = await supabase
        .from("support_conversations").select("id, status")
        .eq("user_uid", uid).maybeSingle();
      if (conv) {
        setConvId(conv.id);
        setStatus(conv.status as "OPEN" | "CLOSED");
        await loadMessages(conv.id, uid);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const loadMessages = async (cid: string, _uid: string) => {
    const { data } = await supabase
      .from("support_messages").select("*")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true }).limit(200);
    setMessages((data ?? []) as Message[]);
    const unread = (data ?? [])
      .filter((m: Message) => m.sender_role === "ADMIN" && !m.is_read)
      .map((m: Message) => m.id);
    if (unread.length > 0)
      await supabase.from("support_messages").update({ is_read: true }).in("id", unread);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
  };

  // ── Realtime ────────────────────────────────────────────────
  useEffect(() => {
    if (!convId || !myUid) return;
    const ch = supabase.channel(`dialog-${convId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "support_messages", filter: `conversation_id=eq.${convId}`,
      }, async (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender_role === "ADMIN") {
          await playAlert();
          await supabase.from("support_messages").update({ is_read: true }).eq("id", msg.id);
        }
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId, myUid]);

  // ─────────────────────────────────────────────────────────
  // ✅ ACCÈS GALERIE LOCALE DU TÉLÉPHONE
  // Méthode directe — même approche que le reste de l'app
  // ─────────────────────────────────────────────────────────
  const pickImage = async () => {

    // 1) Demander la permission d'accès à la bibliothèque photo
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permResult.status === "denied" || permResult.status === "undetermined") {
      if (!permResult.canAskAgain) {
        // Refus permanent → ouvrir les réglages système
        Alert.alert(
          "Accès à la galerie bloqué",
          Platform.OS === "ios"
            ? "Allez dans Réglages → RHAZN → Photos → Toutes les photos"
            : "Allez dans Paramètres → Applications → RHAZN → Autorisations → Photos",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Ouvrir les réglages", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      Alert.alert(
        "Permission requise",
        "Autorisez l'accès à vos photos pour envoyer des images."
      );
      return;
    }

    // 2) Ouvrir directement la galerie NATIVE du téléphone
    //    getAllPhotos = photos, captures d'écran, téléchargements, WhatsApp, etc.
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        // ✅ Clé du fix : on accède à TOUS les albums du téléphone
        mediaTypes: 'images' as any,
        allowsEditing:           false, // pas de recadrage = toutes les photos accessibles
        allowsMultipleSelection: false,
        quality: 0.85,
        base64:  false,
        exif:    false,
      });

      if (result.canceled) return;
      if (!result.assets?.[0]?.uri) return;

      setPendingUri(result.assets[0].uri);
      Haptics.selectionAsync().catch(() => {});

    } catch (e: any) {
      // Fallback : si MediaTypeOptions ne fonctionne pas → essai avec string
      try {
        const result2 = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images' as any,
          allowsEditing: false,
          quality: 0.85,
        });
        if (!result2.canceled && result2.assets?.[0]?.uri) {
          setPendingUri(result2.assets[0].uri);
          Haptics.selectionAsync().catch(() => {});
        }
      } catch (e2: any) {
        console.warn("pickImage fallback error:", e2?.message);
        Alert.alert(
          "Impossible d'ouvrir la galerie",
          "Vérifiez que RHAZN a accès à vos photos dans les réglages."
        );
      }
    }
  };

  // ── Upload image → Supabase Storage ────────────────────────
  const uploadImage = async (localUri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const base64 = await new Promise<string>((resolve, reject) => {
        fetch(localUri)
          .then(r => r.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror  = reject;
            reader.readAsDataURL(blob);
          })
          .catch(reject);
      });
      const ext      = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";
      const path     = `dialog/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const bytes    = new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0)));
      const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: mimeType });
      if (error) { console.warn("upload:", error); return null; }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return pub?.publicUrl ?? null;
    } catch (e) {
      console.warn("uploadImage:", e);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // ── Envoyer message ─────────────────────────────────────────
  const send = async () => {
    const content = draft.trim();
    if ((!content && !pendingUri) || sending || !myUid) return;
    setSending(true);
    const imgToSend  = pendingUri;
    const txtToSend  = content;
    setDraft("");
    setPendingUri(null);
    try {
      let imageUrl: string | null = null;
      if (imgToSend) {
        imageUrl = await uploadImage(imgToSend);
        if (!imageUrl) {
          Alert.alert("Erreur", "L'image n'a pas pu être envoyée.");
          setPendingUri(imgToSend); setDraft(txtToSend); return;
        }
      }
     // 1) Tenter via RPC (crée la conversation si elle n'existe pas)
const { data, error } = await supabase.rpc("send_support_message", {
  p_content:   txtToSend,
  p_image_url: imageUrl,
});

if (error) {
  console.error("RPC send_support_message:", error.message, error.details);

  // 2) Fallback : insertion directe si la RPC échoue
  if (convId && myUid) {
    const { error: insErr } = await supabase
      .from("support_messages")
      .insert({
        conversation_id: convId,
        sender_uid:      myUid,
        sender_role:     "USER",
        content:         txtToSend,
        image_url:       imageUrl,
        is_read:         false,
      });

    if (insErr) {
      console.error("Fallback insert:", insErr.message);
      setDraft(txtToSend);
      if (imgToSend) setPendingUri(imgToSend);
      Alert.alert("Erreur", "Message non envoyé. Vérifiez votre connexion.");
    }
  } else {
    setDraft(txtToSend);
    if (imgToSend) setPendingUri(imgToSend);
  }
  return;
}

// 3) Nouvelle conversation créée par la RPC
if (!convId && data?.conversation_id) {
  setConvId(data.conversation_id);
  await loadMessages(data.conversation_id, myUid);
}


    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  // ── Appui long → copier ─────────────────────────────────────
  const handleLongPress = (msg: Message) => {
    const options: string[] = [];
    const actions: (() => void)[] = [];

    if (msg.content) {
      options.push("📋  Copier le texte");
      actions.push(async () => {
        await Clipboard.setStringAsync(msg.content);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      });
    }
    if (msg.image_url) {
      options.push("🖼️  Voir en plein écran");
      actions.push(() => setViewingImage(msg.image_url!));
      options.push("🔗  Copier le lien");
      actions.push(async () => {
        await Clipboard.setStringAsync(msg.image_url!);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      });
    }
    options.push("Annuler");

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        i => { if (i < actions.length) actions[i](); }
      );
    } else {
      Alert.alert("Options", undefined, [
        ...options.slice(0, -1).map((label, i) => ({ text: label, onPress: actions[i] })),
        { text: "Annuler", style: "cancel" },
      ]);
    }
  };

  // ── Liste ────────────────────────────────────────────────────
  type ListItem =
    | { type: "sep"; label: string; key: string }
    | { type: "msg"; msg: Message };

  const listItems: ListItem[] = [];
  let lastDay = "";
  for (const msg of messages) {
    const day = fmtDay(msg.created_at);
    if (day !== lastDay) {
      lastDay = day;
      listItems.push({ type: "sep", label: day, key: `sep-${day}` });
    }
    listItems.push({ type: "msg", msg });
  }

  // ─────────────────────────────────────────────────────────
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>

      {viewingImage && (
        <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
      )}

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerAvatar}>
            <Ionicons name="shield-checkmark" size={20} color={C.gold} />
          </View>
          <View>
            <Text style={s.headerTitle}>Équipe RHAZN</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }} />
              <Text style={s.headerSub}>Support officiel</Text>
            </View>
          </View>
        </View>
      </View>

      {/* BODY */}
      <View style={{ flex: 1 }}>
        {/* Welcome */}
        {!loading && messages.length === 0 && (
          <View style={s.welcome}>
            <View style={s.welcomeIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={C.gold} />
            </View>
            <Text style={s.welcomeTitle}>Bienvenue dans Dialog</Text>
            <Text style={s.welcomeSub}>
              Posez vos questions à l'équipe RHAZN.{"\n"}
              Un administrateur vous répondra dans les meilleurs délais.
            </Text>
          </View>
        )}

        {/* Messages */}
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={C.gold} size="large" />
          </View>
        ) : messages.length > 0 ? (
          <FlatList
            ref={listRef}
            data={listItems}
            keyExtractor={item => item.type === "sep" ? item.key : item.msg.id}
            renderItem={({ item }) => {
              if (item.type === "sep") return <DaySep label={item.label} />;
              return (
                <Bubble
                  msg={item.msg}
                  myUid={myUid ?? ""}
                  onImagePress={setViewingImage}
                  onLongPress={handleLongPress}
                />
              );
            }}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        ) : null}

        {/* Conversation clôturée */}
        {status === "CLOSED" && (
          <View style={s.closedBar}>
            <Ionicons name="lock-closed-outline" size={14} color={C.muted} />
            <Text style={s.closedTxt}>Cette conversation a été clôturée par l'administration.</Text>
          </View>
        )}

        {/* INPUT BAR */}
        {status !== "CLOSED" && (
          <View style={[s.inputWrap, {
            marginBottom: kbHeight > 0 ? kbHeight + 4 : FOOTER_H + INPUT_MARGIN_FOOTER,
          }]}>
            {/* Preview image avant envoi */}
            {pendingUri && (
              <ImagePreviewBar uri={pendingUri} onRemove={() => setPendingUri(null)} />
            )}

            <View style={s.inputBar}>
              {/* ✅ Bouton galerie */}
              <Pressable
                style={s.galleryBtn}
                onPress={pickImage}
                disabled={sending || uploadingImage}
                hitSlop={8}
              >
                {uploadingImage
                  ? <ActivityIndicator color={C.gold} size="small" />
                  : <Ionicons name="image-outline" size={24} color={C.gold} />
                }
              </Pressable>

              <TextInput
                style={s.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Écrire à l'équipe RHAZN…"
                placeholderTextColor={C.muted}
                multiline
                maxLength={2000}
              />

              <TouchableOpacity
                style={[
                  s.sendBtn,
                  ((!draft.trim() && !pendingUri) || sending) && s.sendBtnOff,
                ]}
                onPress={send}
                disabled={(!draft.trim() && !pendingUri) || sending}
                activeOpacity={0.80}
              >
                {sending
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={s.sendIcon}>🕊️</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: "#F2F2F7" },
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 35, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E5EA", gap: 10 },
  backBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F2F2F7", borderWidth: 1, borderColor: "#E5E5EA", alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1, borderColor: "rgba(212,175,55,0.30)", alignItems: "center", justifyContent: "center" },
  headerTitle:  { color: "#0A0A0A", fontWeight: "900", fontSize: 15 },
  headerSub:    { color: "#8E8E93", fontSize: 11, fontWeight: "600" },
  welcome:      { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 14 },
  welcomeIcon:  { width: 76, height: 76, borderRadius: 24, backgroundColor: "rgba(212,175,55,0.10)", borderWidth: 1, borderColor: "rgba(212,175,55,0.25)", alignItems: "center", justifyContent: "center" },
  welcomeTitle: { color: "#0A0A0A", fontWeight: "900", fontSize: 20, textAlign: "center" },
  welcomeSub:   { color: "#8E8E93", fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 22 },
  closedBar:    { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, backgroundColor: "#E5E5EA", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  closedTxt:    { flex: 1, color: "#8E8E93", fontSize: 12, fontWeight: "600" },
  inputWrap:    { backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E5E5EA" },
  inputBar:     { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 10, paddingVertical: 10 },
  galleryBtn:   { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(212,175,55,0.10)", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.30)", alignItems: "center", justifyContent: "center" },
  input:        { flex: 1, backgroundColor: "#F2F2F7", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: "#0A0A0A", fontSize: 15, fontWeight: "500", borderWidth: 1, borderColor: "#E5E5EA", maxHeight: 120 },
  sendBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", shadowColor: "#D4AF37", shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  sendBtnOff:   { opacity: 0.38 },
  sendIcon:     { fontSize: 22 },
});