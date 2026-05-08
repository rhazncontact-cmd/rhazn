/**
 * /app/rz-channel/archive.tsx
 * Archives officielles RHAZN — contenus publiés par Supreme
 *
 * ✅ Texte : 1500 mots max, lecteur fullscreen premium Apple-like
 * ✅ Image : lightbox fullscreen + défilement entre images sans quitter
 * ✅ Vidéo : agrandissement fullscreen natif
 */

import { Ionicons } from "@expo/vector-icons";
// En haut du fichier, ajoutez l'import
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

const { width: SW, height: SH } = Dimensions.get("window");

const C = {
  bg:         "#F2F2F7",
  card:       "#FFFFFF",
  text:       "#0A0A0A",
  sub:        "#6E6E73",
  muted:      "#AEAEB2",
  border:     "#E5E5EA",
  gold:       "#D4AF37",
  goldLight:  "rgba(212,175,55,0.10)",
  goldBorder: "rgba(212,175,55,0.30)",
  dark:       "#000000",
  darkCard:   "#111111",
  blue:       "#0A84FF",
  red:        "#FF453A",
};

// ✅ Limites
const MAX_WORDS       = 1500;
const MAX_PREVIEW_CHR = 320;

type MediaTab = "text" | "image" | "video";

interface NewsItem {
  id:          string;
  title:       string;
  content:     string;
  image_url:   string | null;
  video_url:   string | null;
  media_type:  MediaTab | null;
  is_featured: boolean;
  created_at:  string;
}

// ─── Helpers ───────────────────────────────────────────────
function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─────────────────────────────────────────────────────────
// ✅ LECTEUR TEXTE FULLSCREEN PREMIUM
// ─────────────────────────────────────────────────────────
function TextReaderModal({ item, visible, onClose }: {
  item:    NewsItem | null;
  visible: boolean;
  onClose: () => void;
}) {
  const slideY = useRef(new Animated.Value(SH)).current;
  const op     = useRef(new Animated.Value(0)).current;
  const [fontSize, setFontSize] = useState(17);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, damping: 28, stiffness: 220, useNativeDriver: true }),
        Animated.timing(op,     { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: SH, duration: 260, useNativeDriver: true }),
        Animated.timing(op,     { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!item) return null;

  const fullText  = truncateWords(item.content ?? "", MAX_WORDS);
  const wc        = wordCount(fullText);
  const readMinutes = Math.max(1, Math.ceil(wc / 200));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[tr.backdrop, { opacity: op }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[tr.sheet, { transform: [{ translateY: slideY }] }]}>
        {/* ── Barre de contrôles ── */}
        <View style={tr.topBar}>
          <TouchableOpacity style={tr.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="chevron-down" size={22} color={C.sub} />
          </TouchableOpacity>

          <View style={tr.topMeta}>
            <View style={tr.readTimeBadge}>
              <Ionicons name="time-outline" size={12} color={C.gold} />
              <Text style={tr.readTimeTxt}>{readMinutes} min</Text>
            </View>
            <Text style={tr.wordCountTxt}>{wc} mots</Text>
          </View>

          {/* Contrôle taille police */}
          <View style={tr.fontControls}>
            <TouchableOpacity
              style={tr.fontBtn}
              onPress={() => setFontSize(f => Math.max(13, f - 1))}
              activeOpacity={0.7}
            >
              <Text style={tr.fontBtnTxt}>A−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tr.fontBtn}
              onPress={() => setFontSize(f => Math.min(24, f + 1))}
              activeOpacity={0.7}
            >
              <Text style={[tr.fontBtnTxt, { fontSize: 16 }]}>A+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Handle ── */}
        <View style={tr.handle} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={tr.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Badge RHAZN */}
          <View style={tr.sourceBadge}>
            <View style={tr.sourceDot} />
            <Text style={tr.sourceTxt}>RHAZN OFFICIEL</Text>
          </View>

          {/* Date */}
          <Text style={tr.dateText}>{fmtDate(item.created_at)}</Text>

          {/* Titre */}
          {!!item.title && (
            <Text style={tr.title}>{item.title}</Text>
          )}

          {/* Ligne décorative */}
          <View style={tr.titleUnderline} />

          {/* Corps du texte */}
          <Text style={[tr.body, { fontSize, lineHeight: fontSize * 1.75 }]}>
            {fullText}
          </Text>

          {/* Note limite 1500 mots */}
          {wordCount(item.content ?? "") > MAX_WORDS && (
            <View style={tr.limitNote}>
              <Ionicons name="information-circle-outline" size={14} color={C.gold} />
              <Text style={tr.limitNoteTxt}>Affichage limité à {MAX_WORDS} mots</Text>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const tr = StyleSheet.create({
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: SH * 0.93,
    backgroundColor: C.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 }, elevation: 20,
  },
  handle:      { width: 44, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 10 },
  topBar:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 10 },
  closeBtn:    { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  topMeta:     { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  readTimeBadge:{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.goldLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.goldBorder },
  readTimeTxt: { color: C.gold, fontWeight: "800", fontSize: 11 },
  wordCountTxt:{ color: C.muted, fontWeight: "600", fontSize: 11 },
  fontControls:{ flexDirection: "row", gap: 6 },
  fontBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  fontBtnTxt:  { color: C.sub, fontWeight: "900", fontSize: 13 },
  scrollContent:{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 40 },
  sourceBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.goldLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.goldBorder, alignSelf: "flex-start", marginBottom: 10 },
  sourceDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  sourceTxt:   { color: C.gold, fontWeight: "900", fontSize: 10, letterSpacing: 1.2 },
  dateText:    { color: C.muted, fontWeight: "600", fontSize: 12, marginBottom: 14 },
  title:       { color: C.text, fontWeight: "900", fontSize: 24, lineHeight: 32, letterSpacing: -0.3, marginBottom: 16 },
  titleUnderline:{ height: 2, width: 48, backgroundColor: C.gold, borderRadius: 1, marginBottom: 22 },
  body:        { color: C.text, fontWeight: "400", letterSpacing: 0.1 },
  limitNote:   { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 24, backgroundColor: C.goldLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.goldBorder },
  limitNoteTxt:{ color: C.gold, fontSize: 12, fontWeight: "600" },
});

// ─────────────────────────────────────────────────────────
// ✅ LIGHTBOX IMAGES — fullscreen + swipe entre images
// ─────────────────────────────────────────────────────────
function ImageLightbox({ images, startIndex, visible, onClose }: {
  images:     string[];
  startIndex: number;
  visible:    boolean;
  onClose:    () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const flatRef = useRef<FlatList>(null);
  const op      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCurrentIdx(startIndex);
    if (visible) {
      Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      setTimeout(() => {
        flatRef.current?.scrollToIndex({ index: startIndex, animated: false });
      }, 50);
    } else {
      Animated.timing(op, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [visible, startIndex]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[lb.container, { opacity: op }]}>
        <StatusBar hidden />

        {/* Compteur */}
        <View style={lb.topBar}>
          <TouchableOpacity style={lb.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={lb.counter}>{currentIdx + 1} / {images.length}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Carrousel horizontal */}
        <FlatList
          ref={flatRef}
          data={images}
          horizontal
          pagingEnabled
          keyExtractor={(_, i) => String(i)}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: SW, offset: SW * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
            setCurrentIdx(idx);
          }}
          renderItem={({ item: url }) => (
            <Pressable style={lb.imgWrap} onPress={onClose}>
              <Image
                source={{ uri: url }}
                style={lb.img}
                contentFit="contain"
              />
            </Pressable>
          )}
        />

        {/* Indicateurs de page */}
        {images.length > 1 && (
          <View style={lb.dotsRow}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[lb.dot, i === currentIdx && lb.dotActive]}
              />
            ))}
          </View>
        )}

        {/* Flèches navigation */}
        {images.length > 1 && (
          <>
            {currentIdx > 0 && (
              <TouchableOpacity
                style={[lb.navBtn, lb.navLeft]}
                onPress={() => {
                  const next = currentIdx - 1;
                  flatRef.current?.scrollToIndex({ index: next, animated: true });
                  setCurrentIdx(next);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
            {currentIdx < images.length - 1 && (
              <TouchableOpacity
                style={[lb.navBtn, lb.navRight]}
                onPress={() => {
                  const next = currentIdx + 1;
                  flatRef.current?.scrollToIndex({ index: next, animated: true });
                  setCurrentIdx(next);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-forward" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const lb = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgba(0,0,0,0.97)", justifyContent: "center" },
  topBar:    { position: "absolute", top: Platform.OS === "ios" ? 56 : 30, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, zIndex: 10 },
  closeBtn:  { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  counter:   { color: "#FFF", fontWeight: "800", fontSize: 14 },
  imgWrap:   { width: SW, height: SH, alignItems: "center", justifyContent: "center" },
  img:       { width: SW, height: SH * 0.75 },
  dotsRow:   { position: "absolute", bottom: Platform.OS === "ios" ? 50 : 30, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { width: 20, backgroundColor: C.gold },
  navBtn:    { position: "absolute", top: "50%", marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  navLeft:   { left: 12 },
  navRight:  { right: 12 },
});

// ─────────────────────────────────────────────────────────
// ✅ VIDÉO FULLSCREEN — player natif
// ─────────────────────────────────────────────────────────
function InlineVideo({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(url, (p) => { p.loop = false; });
  useEffect(() => () => { try { player.pause?.(); } catch {} }, []);

  const toggle = () => {
    if (playing) { try { player.pause?.(); } catch {} setPlaying(false); }
    else         { try { player.play?.();  } catch {} setPlaying(true);  }
  };

  return (
    <View style={vd.outer}>
      <VideoView
        player={player}
        style={vd.vid}
        contentFit="cover"
        // ✅ Fullscreen natif activé
        allowsFullscreen
        allowsPictureInPicture={Platform.OS === "ios"}
        nativeControls={false}
      />
      <Pressable style={vd.overlay} onPress={toggle}>
        <View style={vd.playBtn}>
          <Ionicons name={playing ? "pause" : "play"} size={26} color="#000" />
        </View>
      </Pressable>
      {/* Bouton fullscreen explicite */}
      <TouchableOpacity
        style={vd.fullscreenBtn}
        onPress={() => { try { (player as any).enterFullscreen?.(); } catch {} }}
        activeOpacity={0.8}
      >
        <Ionicons name="expand-outline" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const vd = StyleSheet.create({
  outer:        { position: "relative", height: 230, backgroundColor: C.dark, borderRadius: 0 },
  vid:          { width: "100%", height: 230 },
  overlay:      { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  playBtn:      { width: 58, height: 58, borderRadius: 18, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", shadowColor: C.gold, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fullscreenBtn:{ position: "absolute", bottom: 12, right: 12, width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
});

// ─────────────────────────────────────────────────────────
// ✅ CARTE TEXTE
// ─────────────────────────────────────────────────────────
function TextCard({ item, onExpand }: { item: NewsItem; onExpand: () => void }) {
  const preview = item.content?.slice(0, MAX_PREVIEW_CHR) ?? "";
  const hasMore = (item.content?.length ?? 0) > MAX_PREVIEW_CHR;

  return (
    <View style={tc.card}>
      <View style={tc.topRow}>
        <View style={tc.iconWrap}>
          <Ionicons name="document-text" size={18} color={C.gold} />
        </View>
        <View style={{ flex: 1 }}>
          {!!item.title && <Text style={tc.title}>{item.title}</Text>}
          <Text style={tc.date}>{fmtDate(item.created_at)}</Text>
        </View>
      </View>

      <Text style={tc.content}>{preview}{hasMore ? "…" : ""}</Text>

      {hasMore && (
        <TouchableOpacity style={tc.readMoreBtn} onPress={onExpand} activeOpacity={0.8}>
          <Text style={tc.readMoreTxt}>Lire l'article complet</Text>
          <Ionicons name="arrow-forward" size={14} color="#000" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const tc = StyleSheet.create({
  card:       { backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 40, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  topRow:     { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 40 },
  iconWrap:   { width: 40, height: 40, borderRadius: 12, backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  title:      { color: C.text, fontWeight: "800", fontSize: 15, lineHeight: 21, marginBottom: 3 },
  date:       { color: C.muted, fontWeight: "600", fontSize: 11 },
  content:    { color: C.sub, fontWeight: "500", fontSize: 14, lineHeight: 23 },
  readMoreBtn:{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14, alignSelf: "flex-start", backgroundColor: C.gold, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  readMoreTxt:{ color: "#000", fontWeight: "900", fontSize: 13 },
});

// ─────────────────────────────────────────────────────────
// ✅ CARTE IMAGE — tap pour lightbox
// ─────────────────────────────────────────────────────────
function ImageCard({ item, allImages, myIndex, onTap }: {
  item:      NewsItem;
  allImages: string[];
  myIndex:   number;
  onTap:     (idx: number) => void;
}) {
  return (
    <View style={mc.card}>
      <TouchableOpacity
        style={mc.imgWrap}
        onPress={() => onTap(myIndex)}
        activeOpacity={0.92}
      >
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={mc.img} contentFit="cover" />
          : <View style={[mc.img, mc.placeholder]}><Ionicons name="image-outline" size={32} color={C.muted} /></View>
        }
        {/* Badge zoom */}
        <View style={mc.zoomBadge}>
          <Ionicons name="expand-outline" size={14} color="#FFF" />
        </View>
      </TouchableOpacity>

      {(item.title || item.content) && (
        <View style={mc.body}>
          {!!item.title   && <Text style={mc.title} numberOfLines={2}>{item.title}</Text>}
          {!!item.content && <Text style={mc.content} numberOfLines={3}>{item.content}</Text>}
          <Text style={mc.date}>{fmtDate(item.created_at)}</Text>
        </View>
      )}
      {!item.title && !item.content && (
        <View style={mc.dateBadge}>
          <Text style={mc.dateBadgeTxt}>{fmtDate(item.created_at)}</Text>
        </View>
      )}
    </View>
  );
}

const mc = StyleSheet.create({
  card:        { backgroundColor: C.card, borderRadius: 18, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  imgWrap:     { position: "relative" },
  img:         { width: "100%", height: 240 },
  placeholder: { backgroundColor: C.border, alignItems: "center", justifyContent: "center" },
  zoomBadge:   { position: "absolute", bottom: 10, right: 10, width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  body:        { padding: 16, gap: 5 },
  title:       { color: C.text, fontWeight: "800", fontSize: 15 },
  content:     { color: C.sub, fontWeight: "500", fontSize: 13, lineHeight: 19 },
  date:        { color: C.muted, fontWeight: "600", fontSize: 11, marginTop: 4 },
  dateBadge:   { position: "absolute", bottom: 10, left: 12, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  dateBadgeTxt:{ color: "#FFF", fontWeight: "700", fontSize: 11 },
});

// ─────────────────────────────────────────────────────────
// ✅ CARTE VIDÉO
// ─────────────────────────────────────────────────────────
function VideoCard({ item }: { item: NewsItem }) {
  return (
    <View style={vc.card}>
      {item.video_url
        ? <InlineVideo url={item.video_url} />
        : <View style={vc.noVideo}><Ionicons name="videocam-off-outline" size={32} color={C.muted} /></View>
      }
      {(item.title || item.content) && (
        <View style={vc.body}>
          {!!item.title   && <Text style={vc.title} numberOfLines={2}>{item.title}</Text>}
          {!!item.content && <Text style={vc.content} numberOfLines={2}>{item.content}</Text>}
          <Text style={vc.date}>{fmtDate(item.created_at)}</Text>
        </View>
      )}
    </View>
  );
}

const vc = StyleSheet.create({
  card:   { backgroundColor: C.card, borderRadius: 18, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  noVideo:{ height: 180, backgroundColor: C.border, alignItems: "center", justifyContent: "center" },
  body:   { padding: 16, gap: 5 },
  title:  { color: C.text, fontWeight: "800", fontSize: 15 },
  content:{ color: C.sub, fontWeight: "500", fontSize: 13, lineHeight: 19 },
  date:   { color: C.muted, fontWeight: "600", fontSize: 11, marginTop: 4 },
});

// ─────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────
export default function Archive() {
  const router = useRouter();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<MediaTab>((initialTab as MediaTab) ?? "video");
  const [items,     setItems]     = useState<NewsItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [counts,    setCounts]    = useState<Record<MediaTab, number>>({ text: 0, image: 0, video: 0 });

  // ✅ Lecteur texte
  const [readerItem,    setReaderItem]    = useState<NewsItem | null>(null);
  const [readerVisible, setReaderVisible] = useState(false);

  // ✅ Lightbox images
  const [lightboxImages,  setLightboxImages]  = useState<string[]>([]);
  const [lightboxIdx,     setLightboxIdx]     = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("channel_news")
      .select("id, title, content, image_url, video_url, media_type, is_featured, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const all = (data ?? []) as NewsItem[];
    setItems(all);
    setCounts({
      text:  all.filter((n) => n.media_type === "text").length,
      image: all.filter((n) => n.media_type === "image").length,
      video: all.filter((n) => n.media_type === "video").length,
    });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = items.filter((n) => n.media_type === activeTab);

  // Toutes les URLs d'images pour le lightbox
  const allImageUrls = items
    .filter((n) => n.media_type === "image" && !!n.image_url)
    .map((n) => n.image_url as string);

  const openLightbox = (imageUrl: string) => {
    const idx = allImageUrls.indexOf(imageUrl);
    setLightboxIdx(idx >= 0 ? idx : 0);
    setLightboxImages(allImageUrls);
    setLightboxVisible(true);
  };

  const TABS: { key: MediaTab; label: string; icon: any; color: string }[] = [
    { key: "text",  label: "Texte",  icon: "document-text", color: C.gold },
    { key: "image", label: "Image",  icon: "image",         color: C.blue },
    { key: "video", label: "Vidéo",  icon: "videocam",      color: C.red  },
  ];

  return (
    <View style={s.screen}>

      {/* ══ HEADER ══ */}
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={C.text} />
          </Pressable>
          <View style={s.hCenter}>
            <Text style={s.hTitle}>Archives</Text>
            <View style={s.badge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeTxt}>RHAZN OFFICIEL</Text>
            </View>
          </View>
          <Pressable style={s.refreshBtn} onPress={fetchAll}>
            <Ionicons name="refresh-outline" size={20} color={C.gold} />
          </Pressable>
        </View>

        {/* ══ ONGLETS ══ */}
        <View style={s.tabBar}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[s.tab, active && { borderBottomColor: t.color, borderBottomWidth: 2.5 }]}
                onPress={() => setActiveTab(t.key)}
              >
                <View style={[s.tabIconCircle, active && { backgroundColor: `${t.color}18` }]}>
                  <Ionicons name={t.icon} size={22} color={active ? t.color : C.muted} />
                </View>
                <Text style={[s.tabLabel, active && { color: t.color, fontWeight: "800" }]}>
                  {t.label}
                </Text>
                {counts[t.key] > 0 && (
                  <View style={[s.tabBubble, active && { backgroundColor: t.color }]}>
                    <Text style={[s.tabBubbleTxt, active && { color: "#FFF" }]}>
                      {counts[t.key]}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      {/* ══ CONTENU ══ */}
      {loading ? (
        <View style={s.center}>
          <View style={s.loaderRing}>
            <Ionicons name="library-outline" size={30} color={C.gold} />
          </View>
          <Text style={s.loadTxt}>Chargement des archives…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons
              name={activeTab === "text" ? "document-text-outline" : activeTab === "image" ? "image-outline" : "videocam-outline"}
              size={40} color={C.muted}
            />
          </View>
          <Text style={s.emptyTitle}>Aucun contenu</Text>
          <Text style={s.emptySub}>
            {activeTab === "text"  ? "Aucun texte publié pour le moment."   :
             activeTab === "image" ? "Aucune image publiée pour le moment." :
                                     "Aucune vidéo publiée pour le moment."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={[s.list, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={s.listHeader}>
              <Text style={s.listCount}>
                {filtered.length}{" "}
                {activeTab === "text"  ? "texte"  :
                 activeTab === "image" ? "image"  : "vidéo"}
                {filtered.length > 1 ? "s" : ""}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            if (activeTab === "text") {
              return (
                <TextCard
                  item={item}
                  onExpand={() => { setReaderItem(item); setReaderVisible(true); }}
                />
              );
            }
            if (activeTab === "image") {
              return (
                <ImageCard
                  item={item}
                  allImages={allImageUrls}
                  myIndex={allImageUrls.indexOf(item.image_url ?? "")}
                  onTap={(idx) => {
                    setLightboxIdx(idx >= 0 ? idx : 0);
                    setLightboxImages(allImageUrls);
                    setLightboxVisible(true);
                  }}
                />
              );
            }
            return <VideoCard item={item} />;
          }}
        />
      )}

      {/* ✅ Lecteur texte fullscreen */}
      <TextReaderModal
        item={readerItem}
        visible={readerVisible}
        onClose={() => setReaderVisible(false)}
      />

      {/* ✅ Lightbox images avec swipe */}
      <ImageLightbox
        images={lightboxImages}
        startIndex={lightboxIdx}
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
      />

    </View>
  );
}

// ─── Styles principaux ─────────────────────────────────────
const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  safe:    { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },

  header:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 50, paddingBottom: 10 },
  backBtn:    { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  refreshBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  hCenter:    { flex: 1, alignItems: "center", gap: 4 },
  hTitle:     { color: C.text, fontWeight: "900", fontSize: 17 },
  badge:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.goldLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.goldBorder },
  badgeDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold },
  badgeTxt:   { color: C.gold, fontWeight: "900", fontSize: 9, letterSpacing: 1 },

  tabBar:        { flexDirection: "row" },
  tab:           { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3, borderBottomWidth: 2.5, borderBottomColor: "transparent" },
  tabIconCircle: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  tabLabel:      { color: C.muted, fontWeight: "600", fontSize: 11 },
  tabBubble:     { backgroundColor: C.border, borderRadius: 8, minWidth: 22, paddingHorizontal: 5, paddingVertical: 1, alignItems: "center" },
  tabBubbleTxt:  { color: C.sub, fontWeight: "800", fontSize: 10 },

  center:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loaderRing:{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.goldLight, borderWidth: 1.5, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  loadTxt:   { color: C.muted, fontWeight: "600", fontSize: 14 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: C.border, alignItems: "center", justifyContent: "center" },
  emptyTitle:{ color: C.text, fontWeight: "900", fontSize: 18 },
  emptySub:  { color: C.sub, fontWeight: "500", fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 40 },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 150 },
  listHeader: { marginBottom: 12 },
  listCount:  { color: C.muted, fontWeight: "700", fontSize: 12 },
});