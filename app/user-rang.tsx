// app/classement.tsx  (user-rang.tsx)
// ✅ RHAZN — Classement Premium · Hall of Fame
// ✅ Filtres identiques à "Mes Créations"
// ✅ Grande carte : #1 centré en grand + scroll TOP 2-25 horizontal
// ✅ TOUS les utilisateurs rang 26+ affichés en liste verticale en dessous
// ✅ QOB cumulé depuis store_products ET products (les deux tables)
// ✅ TAN généré et QOB affiché sur chaque carte
// ✅ Live via Supabase Realtime

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL      = "https://mxxlchaygarszkygmylo.supabase.co";
const NON_PRODUCT_CODES = ["SUSPENTZ","AUDIO","VIDEO","KOZESANS","TEXT","IMAGES"];
const { width: SW }     = Dimensions.get("window");
const HERO_IMG_H        = 200;
const MINI_CARD_W       = 120;
const AVATAR_HERO_SIZE  = 90;

const C = {
  bg:         "#F2F2F7",
  card:       "#FFFFFF",
  cardInner:  "#F6F7F9",
  dark:       "#0A0A0A",
  darkCard:   "#111111",
  gold:       "#D4AF37",
  goldLight:  "rgba(212,175,55,0.13)",
  goldBorder: "rgba(212,175,55,0.32)",
  text:       "#0A0A0A",
  sub:        "#6E6E73",
  muted:      "#AEAEB2",
  border:     "#E5E5EA",
  white:      "#FFFFFF",
  green:      "#34C759",
  blue:       "#007AFF",
  orange:     "#FF9500",
  purple:     "#AF52DE",
  teal:       "#32ADE6",
  red:        "#FF3B30",
  silver:     "#A8A9AD",
  bronze:     "#CD7F32",
};

// ─────────────────────────────────────────────────────────────
// FILTRES
// ─────────────────────────────────────────────────────────────
type TypeKey = "TOUS"|"SUSPENTZ"|"PRODUCTS"|"AUDIO"|"VIDEO"|"KOZESANS"|"TEXT"|"IMAGES";
type RankMode = "par_createur" | "meilleur_contenu";

const TYPE_FILTERS: { label: string; key: TypeKey; icon: string; color: string }[] = [
  { label: "Tous",     key: "TOUS",     icon: "layers-outline",        color: C.gold   },
  { label: "Suspentz", key: "SUSPENTZ", icon: "play-circle-outline",   color: C.blue   },
  { label: "Produits", key: "PRODUCTS", icon: "cube-outline",          color: C.orange },
  { label: "Audio",    key: "AUDIO",    icon: "musical-notes-outline", color: C.purple },
  { label: "Vidéo",    key: "VIDEO",    icon: "videocam-outline",      color: C.red    },
  { label: "KozeSans", key: "KOZESANS", icon: "mic-outline",           color: C.teal   },
  { label: "Texte",    key: "TEXT",     icon: "document-text-outline", color: C.green  },
  { label: "Images",   key: "IMAGES",   icon: "images-outline",        color: C.gold   },
];

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type ContentItem = {
  id:            string;
  title:         string | null;
  category_code: string | null;
  qob_count:     number;
  tan_earned:    number;   // price_tan pour suspentz, 0 pour produits
  owner_uid:     string | null;
  created_at:    string;
  media_path:    string | null;   // suspentz
  cover_url:     string | null;   // produits
  source:        "suspentz" | "product";
};

type ProfileMap = Record<string, { full_name: string|null; avatar_url: string|null }>;

type UserRankItem = {
  uid:           string;
  creatorName:   string | null;
  creatorAvatar: string | null;
  totalQob:      number;
  totalTan:      number;
  contentCount:  number;
  bestContent:   ContentItem;  // contenu ayant le plus de QOB
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const fmtN = (n: any) => Number(n ?? 0).toLocaleString("fr-FR");
const fmtShort = (n: number): string => {
  if (n >= 1e12) return `${(n/1e12).toFixed(1).replace(".",",")} Tr`;
  if (n >= 1e9)  return `${(n/1e9).toFixed(1).replace(".",",")} Md`;
  if (n >= 1e6)  return `${(n/1e6).toFixed(1).replace(".",",")} M`;
  if (n >= 1e3)  return `${(n/1e3).toFixed(1).replace(".",",")} K`;
  return fmtN(n);
};

function resolveUrl(path?: string|null): string|null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/suspentz/${path}`;
}

function getInitials(name?: string|null): string {
  if (!name) return "?";
  const p = name.trim().split(" ").filter(Boolean);
  return (p.length===1 ? p[0][0] : (p[0][0]||"")+(p[1][0]||"")).toUpperCase();
}

function applyFilter(content: ContentItem[], key: TypeKey): ContentItem[] {
  if (key === "TOUS") return content;
  if (key === "PRODUCTS") return content.filter(c =>
    !NON_PRODUCT_CODES.includes((c.category_code ?? "").toUpperCase()) || c.source === "product"
  );
  return content.filter(c => (c.category_code ?? "").toUpperCase() === key);
}

function buildUserRanking(filtered: ContentItem[], profiles: ProfileMap, mode: RankMode = "par_createur"): UserRankItem[] {
  const map: Record<string,{ items: ContentItem[]; totalQob: number; totalTan: number }> = {};
  filtered.forEach(c => {
    const uid = c.owner_uid ?? "__anon__";
    if (!map[uid]) map[uid] = { items:[], totalQob:0, totalTan:0 };
    map[uid].items.push(c);
    map[uid].totalQob += c.qob_count;
    map[uid].totalTan += c.tan_earned;
  });
  const list = Object.entries(map)
    .map(([uid, { items, totalQob, totalTan }]) => {
      const p = profiles[uid] ?? null;
      const bestContent = [...items].sort((a,b) => b.qob_count - a.qob_count)[0];
      return {
        uid,
        creatorName:   p?.full_name  ?? null,
        creatorAvatar: p?.avatar_url ?? null,
        totalQob,
        totalTan,
        contentCount:  items.length,
        bestContent,
      };
    });
  // Tri selon le mode
  if (mode === "meilleur_contenu") {
    return list.sort((a,b) => (b.bestContent?.qob_count ?? 0) - (a.bestContent?.qob_count ?? 0));
  }
  return list.sort((a,b) => b.totalQob - a.totalQob);
}

function medalBg(rank: number) { return rank===0?C.gold:rank===1?C.silver:rank===2?C.bronze:C.cardInner; }
function medalFg(rank: number) { return rank===0?"#000":rank===1?"#333":rank===2?"#FFF":C.sub; }

function barColor(rank: number) {
  return rank===0?C.gold:rank===1?C.silver:rank===2?C.bronze:rank<10?C.blue:rank<25?C.purple:"#E5E5EA";
}

// ─────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────
function Avatar({ url, name, size=36, borderColor, borderWidth=2 }: {
  url?: string|null; name?: string|null; size?: number;
  borderColor?: string; borderWidth?: number;
}) {
  const r  = Math.round(size * 0.3);
  const bc = borderColor ?? C.goldBorder;
  if (url) return (
    <Image source={{ uri: url }} style={{ width:size, height:size, borderRadius:r, borderWidth, borderColor:bc }} />
  );
  return (
    <View style={{ width:size, height:size, borderRadius:r, backgroundColor:C.goldLight, borderWidth, borderColor:bc, alignItems:"center", justifyContent:"center" }}>
      <Text style={{ color:C.gold, fontWeight:"900", fontSize:Math.round(size*0.36) }}>{getInitials(name)}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ════════════ GRANDE CARTE HERO — TOP 25 ════════════
// ─────────────────────────────────────────────────────────────
// Placeholder card pour remplir jusqu'à 25 slots
const PLACEHOLDER_COUNT = 25;

function HeroTop25({ ranking, mode, setPreviewImage }: {
  ranking: UserRankItem[];
  mode: RankMode;
  setPreviewImage: (img: string) => void;
}) {
  const hero  = ranking[0];
  // TOP 2-25 (max 24 mini-cartes) — complété par des slots vides si < 25 créateurs
  const realRest = ranking.slice(1, 25);
  const emptyCount = Math.max(0, PLACEHOLDER_COUNT - 1 - realRest.length);
  const rest  = realRest; // on affiche les réels + placeholders séparément
  const topQob = mode === "meilleur_contenu"
    ? (hero?.bestContent?.qob_count ?? 1)
    : (hero?.totalQob ?? 1);

  if (!hero) return (
    <View style={hc.emptyHero}>
      <Text style={{ fontSize: 32 }}>🏆</Text>
      <Text style={hc.emptyTxt}>Aucun créateur dans cette catégorie</Text>
    </View>
  );

  // Image de fond = meilleur contenu du #1
  const heroThumb = resolveUrl(hero.bestContent?.media_path ?? hero.bestContent?.cover_url);

  return (
    <View style={hc.outerCard}>

      {/* ══════════════════════════════════
          HERO #1 — PROFIL CENTRÉ EN GRAND
      ══════════════════════════════════ */}
      <View style={hc.heroSection}>

        {/* Fond image du meilleur contenu — flouté */}
        {heroThumb
          ? <Image source={{ uri: heroThumb }} style={hc.heroBg} blurRadius={22} />
          : <View style={[hc.heroBg, { backgroundColor: "#050505" }]} />
        }
        {/* Overlay dégradé sombre */}
        <View style={hc.heroOverlay} />

        {/* ── Badges flottants haut ── */}
        <View style={hc.heroTopRow}>
          <View style={hc.crownBadge}>
            <Text style={{ fontSize: 14 }}>👑</Text>
            <Text style={hc.crownTxt}>#1 LEADER</Text>
          </View>
          <View style={hc.liveBadge}>
            <View style={hc.liveDotView} />
            <Text style={hc.liveTxt}>LIVE</Text>
          </View>
        </View>

        {/* ── AVATAR CENTRÉ EN GRAND ── */}
        <View style={hc.heroAvatarSection}>
          {/* Halo or derrière l'avatar */}
          <TouchableOpacity
  activeOpacity={0.9}
  onPress={() => {
    const img = resolveUrl(hero.creatorAvatar);
    if (img) setPreviewImage(img);
  }}
>
  <Avatar
    url={resolveUrl(hero.creatorAvatar)}
    name={hero.creatorName}
    size={AVATAR_HERO_SIZE}
    borderColor={C.gold}
    borderWidth={3}
  />
</TouchableOpacity>
        </View>

        {/* ── NOM COMPLET centré ── */}
        <Text style={hc.heroName} numberOfLines={2}>
          {hero.creatorName ?? "Créateur RHAZN"}
        </Text>

        {/* ── Stats en row centré ── */}
        <View style={hc.heroStatsRow}>
          {mode === "meilleur_contenu" ? (
            <View style={hc.heroStatPill}>
              <Ionicons name="trophy-outline" size={12} color={C.gold} />
              <Text style={hc.heroStatVal}>{fmtShort(hero.bestContent?.qob_count ?? 0)}</Text>
              <Text style={hc.heroStatUnit}>QOB meilleur</Text>
            </View>
          ) : (
            <View style={hc.heroStatPill}>
              <Ionicons name="glasses-outline" size={12} color={C.gold} />
              <Text style={hc.heroStatVal}>{fmtShort(hero.totalQob)}</Text>
              <Text style={hc.heroStatUnit}>QOB total</Text>
            </View>
          )}
          {mode === "par_createur" && hero.totalTan > 0 && (
            <View style={hc.heroStatPill}>
              <Ionicons name="flash" size={11} color={C.gold} />
              <Text style={hc.heroStatVal}>{fmtShort(hero.totalTan)}</Text>
              <Text style={hc.heroStatUnit}>TAN</Text>
            </View>
          )}
          <View style={hc.heroStatPill}>
            <Ionicons name="layers-outline" size={11} color="rgba(255,255,255,0.55)" />
            <Text style={[hc.heroStatVal, { color: "rgba(255,255,255,0.80)" }]}>{hero.contentCount}</Text>
            <Text style={[hc.heroStatUnit, { color: "rgba(255,255,255,0.45)" }]}>contenus</Text>
          </View>
        </View>

        {/* ── Meilleur contenu (miniature + titre) ── */}
        {heroThumb && (
          <View style={hc.heroContentRow}>
            <Image source={{ uri: heroThumb }} style={hc.heroContentThumb} />
            <View style={{ flex: 1 }}>
              <Text style={hc.heroContentLabel}>🎯 Meilleur contenu</Text>
              <Text style={hc.heroContentTitle} numberOfLines={1}>
                {hero.bestContent?.title ?? "—"}
              </Text>
              <View style={{ flexDirection:"row", alignItems:"center", gap:4, marginTop:3 }}>
                <Ionicons name="glasses-outline" size={10} color={C.gold} />
                <Text style={hc.heroContentQob}>{fmtShort(hero.bestContent?.qob_count ?? 0)} QOB</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ══════════════════════════════════
          SCROLL TOP 2-25
      ══════════════════════════════════ */}
      {rest.length > 0 && (
        <View style={hc.scrollSection}>
          <View style={hc.scrollHead}>
            <Text style={hc.scrollTitle}>
              TOP 2 — {Math.min(25, ranking.length)}
              <Text style={hc.scrollCount}> · {rest.length} créateurs</Text>
            </Text>
            <Text style={hc.scrollHint}>← balayez →</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={hc.scrollContent}
            decelerationRate="fast"
          >
            {rest.map((user, i) => {
              const rank  = i + 1;
              const thumb = resolveUrl(user.bestContent?.media_path ?? user.bestContent?.cover_url);
              const score = mode === "meilleur_contenu"
                ? (user.bestContent?.qob_count ?? 0)
                : user.totalQob;
              const pct   = topQob > 0 ? score / topQob : 0;
              const mbg   = medalBg(rank);
              const mfg   = medalFg(rank);
              const bar   = barColor(rank);

              return (
                <View key={user.uid} style={hc.miniCard}>
                  {thumb
                    ? <Image source={{ uri: thumb }} style={hc.miniThumb} />
                    : <View style={[hc.miniThumb, hc.miniThumbEmpty]}>
                        <Ionicons name="image-outline" size={18} color="rgba(255,255,255,0.20)" />
                      </View>
                  }
                  <View style={[hc.miniRankBadge, { backgroundColor: mbg }]}>
                    <Text style={[hc.miniRankTxt, { color: mfg }]}>#{rank+1}</Text>
                  </View>
                  <View style={hc.miniAvatarWrap}>
                    <TouchableOpacity
  activeOpacity={0.9}
  onPress={() => {
    const img = resolveUrl(user.creatorAvatar);
    if (img) setPreviewImage(img);
  }}
>
  <Avatar
    url={resolveUrl(user.creatorAvatar)}
    name={user.creatorName}
    size={28}
    borderColor={C.gold}
    borderWidth={2}
  />
</TouchableOpacity>
                  </View>
                  <View style={hc.miniBody}>
                    <Text style={hc.miniName} numberOfLines={1}>{user.creatorName ?? "—"}</Text>
                    <View style={{ flexDirection:"row", alignItems:"center", gap:3, marginTop:2 }}>
                      <Ionicons name="glasses-outline" size={9} color={C.gold} />
                      <Text style={hc.miniQob}>{fmtShort(score)}</Text>
                    </View>
                    {mode !== "meilleur_contenu" && user.totalTan > 0 && (
                      <View style={{ flexDirection:"row", alignItems:"center", gap:2, marginTop:1 }}>
                        <Ionicons name="flash" size={9} color={C.gold} />
                        <Text style={[hc.miniQob, { opacity:0.75 }]}>{fmtShort(user.totalTan)} TAN</Text>
                      </View>
                    )}
                    <View style={hc.miniTrack}>
                      <View style={[hc.miniFill, {
                        width: `${Math.max(4, Math.round(pct * 100))}%` as any,
                        backgroundColor: bar,
                      }]} />
                    </View>
                  </View>
                </View>
              );
            })}

            {/* ── Placeholders pour compléter jusqu'à 25 slots ── */}
            {Array.from({ length: emptyCount }).map((_, i) => (
              <View key={`placeholder-${i}`} style={[hc.miniCard, hc.miniCardEmpty]}>
                <View style={[hc.miniThumb, hc.miniThumbEmpty]}>
                  <Ionicons name="person-add-outline" size={18} color="rgba(255,255,255,0.12)" />
                </View>
                <View style={[hc.miniRankBadge, { backgroundColor:"rgba(255,255,255,0.06)" }]}>
                  <Text style={[hc.miniRankTxt, { color:"rgba(255,255,255,0.25)" }]}>
                    #{rest.length + i + 2}
                  </Text>
                </View>
                <View style={hc.miniBody}>
                  <Text style={[hc.miniName, { color:"rgba(255,255,255,0.20)" }]}>—</Text>
                  <Text style={{ color:"rgba(255,255,255,0.14)", fontSize:9, marginTop:3 }}>En attente</Text>
                  <View style={hc.miniTrack}>
                    <View style={[hc.miniFill, { width:"4%", backgroundColor:"rgba(255,255,255,0.08)" }]} />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const hc = StyleSheet.create({
  emptyHero:      { alignItems:"center", paddingVertical:40, gap:10, marginHorizontal:16 },
  emptyTxt:       { color:C.muted, fontWeight:"600", fontSize:14, textAlign:"center" },

  // Carte contenante
  outerCard:      { marginHorizontal:16, marginBottom:20, borderRadius:24, overflow:"hidden", borderWidth:1.5, borderColor:C.goldBorder, shadowColor:C.gold, shadowOpacity:0.15, shadowRadius:24, shadowOffset:{width:0,height:6}, elevation:8 },

  // Fond hero sombre
  heroSection: {
  backgroundColor:"#000", // ← noir pur Apple
  paddingBottom:16
},
  heroBg:         { ...StyleSheet.absoluteFillObject, opacity:0.32 },
  heroOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor:"rgba(0,0,0,0.60)" },

  // Badges haut
  heroTopRow:     { flexDirection:"row", justifyContent:"space-between", padding:14, paddingBottom:0 },
  crownBadge:     { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:C.goldLight, borderRadius:12, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:C.goldBorder },
  crownTxt:       { color:C.gold, fontWeight:"900", fontSize:11, letterSpacing:0.5 },
  liveBadge:      { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(52,199,89,0.18)", borderRadius:10, paddingHorizontal:8, paddingVertical:4, borderWidth:1, borderColor:"rgba(52,199,89,0.38)" },
  liveDotView:    { width:6, height:6, borderRadius:3, backgroundColor:C.green },
  liveTxt:        { color:C.green, fontWeight:"900", fontSize:10, letterSpacing:0.8 },

  // Avatar centré
  heroAvatarSection:{ alignItems:"center", marginTop:16, marginBottom:12, position:"relative" },

  // Nom centré
  heroName:       { color:C.white, fontWeight:"900", fontSize:20, textAlign:"center", paddingHorizontal:24, letterSpacing:-0.3, textShadowColor:"rgba(0,0,0,0.8)", textShadowOffset:{width:0,height:1}, textShadowRadius:4 },

  // Stats row centré
  heroStatsRow:   { flexDirection:"row", justifyContent:"center", gap:8, marginTop:10, marginBottom:12, paddingHorizontal:16, flexWrap:"wrap" },
  heroStatPill:   { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(212,175,55,0.15)", borderRadius:10, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:"rgba(212,175,55,0.30)" },
  heroStatVal:    { color:C.gold, fontWeight:"900", fontSize:13 },
  heroStatUnit:   { color:"rgba(212,175,55,0.65)", fontWeight:"700", fontSize:9, letterSpacing:0.5 },

  // Meilleur contenu row
  heroContentRow: { flexDirection:"row", alignItems:"center", gap:10, marginHorizontal:14, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:14, padding:10, borderWidth:1, borderColor:"rgba(255,255,255,0.10)" },
  heroContentThumb:{ width:50, height:50, borderRadius:10, flexShrink:0 },
  heroContentLabel:{ color:"rgba(255,255,255,0.45)", fontWeight:"700", fontSize:9, letterSpacing:0.3, marginBottom:2 },
  heroContentTitle:{ color:C.white, fontWeight:"800", fontSize:12, textShadowColor:"rgba(0,0,0,0.6)", textShadowOffset:{width:0,height:1}, textShadowRadius:3 },
  heroContentQob:  { color:C.gold, fontWeight:"800", fontSize:11 },

  // Scroll section
  scrollSection:  { backgroundColor:"#0E0E0E", borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.06)" },
  scrollHead:     { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:14, paddingTop:12, paddingBottom:4 },
  scrollTitle:    { color:C.white, fontWeight:"900", fontSize:13 },
  scrollCount:    { color:"rgba(255,255,255,0.40)", fontWeight:"600", fontSize:11 },
  scrollHint:     { color:"rgba(255,255,255,0.28)", fontWeight:"600", fontSize:10 },
  scrollContent:  { paddingHorizontal:14, paddingBottom:14, gap:10 },

  // Mini cartes TOP 2-25
  miniCard:       { width:MINI_CARD_W, backgroundColor:"rgba(255,255,255,0.05)", borderRadius:16, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.09)" },
  miniCardEmpty:  { backgroundColor:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.05)", borderStyle:"dashed" as any },
  miniThumb:      { width:"100%", height:80, resizeMode:"cover" },
  miniThumbEmpty: { backgroundColor:"rgba(255,255,255,0.03)", alignItems:"center", justifyContent:"center" },
  miniRankBadge:  { position:"absolute", top:6, left:6, borderRadius:8, paddingHorizontal:6, paddingVertical:3 },
  miniRankTxt:    { fontWeight:"900", fontSize:10 },
  miniAvatarWrap: { position:"absolute", top:56, left:7 },
  miniBody:       { paddingHorizontal:7, paddingBottom:8, marginTop:16 },
  miniName:       { color:C.white, fontWeight:"800", fontSize:10 },
  miniQob:        { color:C.gold, fontWeight:"900", fontSize:10 },
  miniTrack:      { height:3, backgroundColor:"rgba(255,255,255,0.10)", borderRadius:99, overflow:"hidden", marginTop:5 },
  miniFill:       { height:3, borderRadius:99 },
});

// ─────────────────────────────────────────────────────────────
// CARTE UTILISATEUR — liste verticale (rang 26+)
// ─────────────────────────────────────────────────────────────
function UserRankCard({ item, rank, topQob, setPreviewImage }: {
  item: UserRankItem;
  rank: number;
  topQob: number;
  setPreviewImage: (img: string) => void;
}) {
  const thumb  = resolveUrl(item.bestContent?.media_path ?? item.bestContent?.cover_url);
  const pct    = topQob > 0 ? item.totalQob / topQob : 0;
  const isTop3 = rank < 3;
  const mbg    = medalBg(rank);
  const mfg    = medalFg(rank);
  const bar    = barColor(rank);

  return (
    <View style={[uc.card, isTop3 && uc.cardTop3]}>

      {/* Rang */}
      <View style={[uc.rankBadge, { backgroundColor: mbg }]}>
        {rank === 0
          ? <Text style={{ fontSize:14 }}>👑</Text>
          : <Text style={[uc.rankNum, { color: mfg }]}>{rank + 1}</Text>
        }
      </View>

      {/* ← Miniature du meilleur contenu */}
      {thumb
        ? <Image source={{ uri: thumb }} style={uc.thumb} />
        : <View style={[uc.thumb, uc.thumbEmpty]}>
            <Ionicons name="image-outline" size={18} color={C.muted} />
          </View>
      }

      {/* Infos créateur */}
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
          <TouchableOpacity
  activeOpacity={0.9}
  onPress={() => {
    const img = resolveUrl(item.creatorAvatar);
    if (img) setPreviewImage(img);
  }}
>
  <Avatar
    url={resolveUrl(item.creatorAvatar)}
    name={item.creatorName}
    size={20}
  />
</TouchableOpacity>
          <Text style={uc.name} numberOfLines={1}>{item.creatorName ?? "Créateur"}</Text>
        </View>
        <Text style={uc.bestTitle} numberOfLines={1}>🎯 {item.bestContent?.title ?? "—"}</Text>
        {/* Compteurs QOB + TAN */}
        <View style={{ flexDirection:"row", gap:8, marginTop:2, flexWrap:"wrap" }}>
          <View style={{ flexDirection:"row", alignItems:"center", gap:3 }}>
            <Ionicons name="glasses-outline" size={10} color={C.gold} />
            <Text style={uc.statTxt}>{fmtShort(item.totalQob)} QOB</Text>
          </View>
          {item.totalTan > 0 && (
            <View style={{ flexDirection:"row", alignItems:"center", gap:3 }}>
              <Ionicons name="flash" size={10} color={C.gold} />
              <Text style={uc.statTxt}>{fmtShort(item.totalTan)} TAN</Text>
            </View>
          )}
          <Text style={uc.count}>{item.contentCount} contenu{item.contentCount>1?"s":""}</Text>
        </View>
        {/* Barre progression */}
        <View style={uc.track}>
          <View style={[uc.fill, {
            width: `${Math.max(2, Math.round(pct * 100))}%` as any,
            backgroundColor: bar,
          }]} />
        </View>
      </View>

      {/* QOB total mis en avant à droite */}
      <View style={uc.qobWrap}>
        <Ionicons name="glasses-outline" size={11} color={C.gold} />
        <Text style={uc.qobVal}>{fmtShort(item.totalQob)}</Text>
        <Text style={uc.qobUnit}>QOB</Text>
      </View>
    </View>
  );
}

const uc = StyleSheet.create({
  card:      { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:C.card, marginHorizontal:16, marginBottom:8, borderRadius:18, padding:10, paddingRight:12, borderWidth:1, borderColor:C.border },
  cardTop3:  { borderColor:C.goldBorder, shadowColor:C.gold, shadowOpacity:0.12, shadowRadius:12, shadowOffset:{width:0,height:2}, elevation:3 },
  rankBadge: { width:34, height:34, borderRadius:10, alignItems:"center", justifyContent:"center", flexShrink:0 },
  rankNum:   { fontWeight:"900", fontSize:14 },
  thumb:     { width:62, height:62, borderRadius:12, flexShrink:0 },
  thumbEmpty:{ backgroundColor:C.cardInner, alignItems:"center", justifyContent:"center" },
  name:      { color:C.text, fontWeight:"900", fontSize:12, flex:1 },
  bestTitle: { color:C.sub, fontWeight:"600", fontSize:10 },
  statTxt:   { color:C.gold, fontWeight:"800", fontSize:10 },
  count:     { color:C.muted, fontWeight:"600", fontSize:9 },
  track:     { height:3, borderRadius:99, backgroundColor:C.cardInner, marginTop:4, overflow:"hidden" },
  fill:      { height:3, borderRadius:99 },
  qobWrap:   { alignItems:"center", gap:2, flexShrink:0, minWidth:52 },
  qobVal:    { color:C.gold, fontWeight:"900", fontSize:15 },
  qobUnit:   { color:C.muted, fontWeight:"700", fontSize:8, letterSpacing:0.4 },
});

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function Classement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [typeFilter,  setTypeFilter]  = useState<TypeKey>("TOUS");
  const [rankMode,    setRankMode]    = useState<RankMode>("par_createur");
  const [allContent,  setAllContent]  = useState<ContentItem[]>([]);
  const [profiles,    setProfiles]    = useState<ProfileMap>({});
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date|null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const liveDot = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const p = Animated.loop(Animated.sequence([
      Animated.timing(liveDot, { toValue:0.2, duration:650, useNativeDriver:true }),
      Animated.timing(liveDot, { toValue:1,   duration:650, useNativeDriver:true }),
    ]));
    p.start();
    return () => p.stop();
  }, []);

  // ── Chargement — DEUX tables : store_products + products ───
  const load = useCallback(async (mode: "first"|"refresh" = "first") => {
    if (mode === "first") setLoading(true);
    else                  setRefreshing(true);
    try {

      // ── 1. Suspentz (store_products) ─────────────────────
      const { data: spData } = await supabase
        .from("store_products")
        .select("id, title, category_code, qob_count, price_tan, owner_uid, created_at, media_path")
        .eq("cadna_status", "approved")
        .is("deleted_at", null)
        .order("qob_count", { ascending: false })
        .limit(1000);

      // ── 2. Produits (products) ────────────────────────────
      const { data: prodData } = await supabase
        .from("products")
        .select("id, title, category_label, qob_count, user_id, created_at, cover_url")
        .eq("cadna_status", "approved")
        .is("deleted_at", null)
        .order("qob_count", { ascending: false })
        .limit(1000);

      // ── Fusionner les deux sources ────────────────────────
      const fromSuspentz: ContentItem[] = (spData ?? []).map((c: any) => ({
        id:            c.id,
        title:         c.title ?? null,
        category_code: (c.category_code ?? "SUSPENTZ").toUpperCase(),
        qob_count:     Number(c.qob_count ?? 0),
        tan_earned:    Number(c.price_tan  ?? 0),
        owner_uid:     c.owner_uid ?? null,
        created_at:    c.created_at,
        media_path:    c.media_path ?? null,
        cover_url:     null,
        source:        "suspentz" as const,
      }));

      const fromProducts: ContentItem[] = (prodData ?? []).map((c: any) => ({
        id:            c.id,
        title:         c.title ?? null,
        category_code: "PRODUCTS",
        qob_count:     Number(c.qob_count ?? 0),
        tan_earned:    0,  // les produits HTG n'ont pas de TAN direct
        owner_uid:     c.user_id ?? null,
        created_at:    c.created_at,
        media_path:    null,
        cover_url:     c.cover_url ?? null,
        source:        "product" as const,
      }));

      const merged = [...fromSuspentz, ...fromProducts];
      setAllContent(merged);

      // ── Profils des créateurs ─────────────────────────────
      const ownerIds = [
        ...new Set([
          ...fromSuspentz.map(c => c.owner_uid),
          ...fromProducts.map(c => c.owner_uid),
        ].filter(Boolean)),
      ];

      if (ownerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ownerIds);
        const pMap: ProfileMap = {};
        (profs ?? []).forEach((p: any) => {
          pMap[p.id] = { full_name: p.full_name ?? null, avatar_url: p.avatar_url ?? null };
        });
        setProfiles(pMap);
      }

      setLastUpdated(new Date());
    } catch (e) {
      console.warn("classement load error:", e);
    } finally {
      if (mode === "first") setLoading(false);
      else                  setRefreshing(false);
    }
  }, []);

  useEffect(() => { load("first"); }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("classement-live")
      .on("postgres_changes", { event:"*", schema:"public", table:"store_products" }, () => load("refresh"))
      .on("postgres_changes", { event:"*", schema:"public", table:"products"        }, () => load("refresh"))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // ── Calculs ────────────────────────────────────────────────
  const filtered    = useMemo(() => applyFilter(allContent, typeFilter), [allContent, typeFilter]);
  const userRanking = useMemo(() => buildUserRanking(filtered, profiles, rankMode), [filtered, profiles, rankMode]);

  // TOP 25 → grande carte hero
  // rang 26+ → liste verticale en dessous
  const top25     = userRanking.slice(0, 25);
  const restUsers = userRanking.slice(25);      // rang 26, 27, 28...
  const topQob    = userRanking[0]?.totalQob ?? 1;

  const filterInfo = TYPE_FILTERS.find(f => f.key === typeFilter)!;

  const fmtTime = (d: Date|null) =>
    d ? d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit", second:"2-digit" }) : "—";

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.loadCenter}>
          <View style={s.loadIcon}><Text style={{ fontSize:28 }}>🏆</Text></View>
          <ActivityIndicator color={C.gold} size="large" />
          <Text style={s.loadTxt}>Chargement du classement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
  <SafeAreaView style={s.screen}>

    {/* ✅ MODAL PREVIEW IMAGE */}
    {previewImage && (
      <View style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}>
        <TouchableOpacity
          style={{ position:"absolute", top:50, right:20, zIndex:10 }}
          onPress={() => setPreviewImage(null)}
        >
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>

        <Image
          source={{ uri: previewImage }}
          style={{
            width: "90%",
            height: "60%",
            borderRadius: 20,
            resizeMode: "cover"
          }}
        />
      </View>
    )}

    {/* ══ ZONE FIXE HEADER + FILTRES ══ */}
    <View style={s.topZone}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color={C.gold} />
          </TouchableOpacity>
          <View style={{ flex:1 }}>
            <Text style={s.title}>Classement</Text>
            <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
              <Animated.View style={[s.liveDot, { opacity: liveDot }]} />
              <Text style={s.subtitle}>LIVE · MàJ {fmtTime(lastUpdated)}</Text>
            </View>
          </View>
          <View style={s.headerBadge}>
            <Ionicons name="people-outline" size={12} color={C.gold} />
            <Text style={s.headerBadgeTxt}>{fmtN(userRanking.length)} créateurs</Text>
          </View>
        </View>

        {/* ── Boutons mode de classement — AU-DESSUS des filtres catégorie ── */}
        <View style={s.modeRow}>
          <TouchableOpacity
            style={[s.modeBtn, rankMode === "par_createur" && s.modeBtnActive]}
            onPress={() => setRankMode("par_createur")}
            activeOpacity={0.80}
          >
            <Ionicons
              name="people-outline"
              size={13}
              color={rankMode === "par_createur" ? C.white : C.sub}
            />
            <Text style={[s.modeBtnTxt, rankMode === "par_createur" && s.modeBtnTxtActive]}>
              Par créateur
            </Text>
            <Text style={[s.modeBtnSub, rankMode === "par_createur" && { color:"rgba(255,255,255,0.65)" }]}>
              QOB total cumulé
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modeBtn, rankMode === "meilleur_contenu" && s.modeBtnActive]}
            onPress={() => setRankMode("meilleur_contenu")}
            activeOpacity={0.80}
          >
            <Ionicons
              name="trophy-outline"
              size={13}
              color={rankMode === "meilleur_contenu" ? C.white : C.sub}
            />
            <Text style={[s.modeBtnTxt, rankMode === "meilleur_contenu" && s.modeBtnTxtActive]}>
              Meilleur contenu
            </Text>
            <Text style={[s.modeBtnSub, rankMode === "meilleur_contenu" && { color:"rgba(255,255,255,0.65)" }]}>
              QOB du top contenu
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filtres scrollables — identiques à Mes Créations */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
          {TYPE_FILTERS.map(f => {
            const on  = typeFilter === f.key;
            // Compte les créateurs dans cette catégorie (rapide)
            const catFiltered = applyFilter(allContent, f.key);
            const cnt = buildUserRanking(catFiltered, profiles, rankMode).length;
            return (
              <TouchableOpacity key={f.key}
                style={[s.pill, on && { backgroundColor:f.color, borderColor:f.color }]}
                onPress={() => setTypeFilter(f.key)} activeOpacity={0.80}
              >
                <Ionicons name={f.icon as any} size={12} color={on ? "#FFF" : C.sub} />
                <Text style={[s.pillTxt, on && { color:"#FFF", fontWeight:"900" }]}>{f.label}</Text>
                <View style={[s.pillCount, on && { backgroundColor:"rgba(255,255,255,0.25)" }]}>
                  <Text style={[s.pillCountTxt, on && { color:"#FFF" }]}>{cnt}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══ LISTE PRINCIPALE ══
          FlatList avec :
          - ListHeaderComponent = grande carte TOP 25
          - data = restUsers (rang 26 et +)
          Ainsi TOUS les utilisateurs sont visibles en scrollant
      */}
      <FlatList
        data={restUsers}
        keyExtractor={u => u.uid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={C.gold} />
        }
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingTop: 8 }}
        ListHeaderComponent={
          <>
            {/* GRANDE CARTE TOP 25 */}
            {top25.length > 0 && <HeroTop25
  ranking={top25}
  mode={rankMode}
  setPreviewImage={setPreviewImage}
/>}

            {/* ── En-tête section liste rang 26+ ── */}
            {restUsers.length > 0 && (
              <>
                <View style={s.sectionHeader}>
                  <View style={s.sectionLeft}>
                    <View style={[s.sectionIcon, { backgroundColor:`${filterInfo.color}15` }]}>
                      <Ionicons name="podium-outline" size={13} color={filterInfo.color} />
                    </View>
                    <View>
                      <Text style={s.sectionTitle}>Classement complet</Text>
                      <Text style={s.sectionSub}>Rang 26 → {fmtN(userRanking.length)}</Text>
                    </View>
                  </View>
                  <View style={[s.sectionBadge, { borderColor:`${filterInfo.color}35`, backgroundColor:`${filterInfo.color}10` }]}>
                    <Text style={[s.sectionBadgeTxt, { color: filterInfo.color }]}>
                      {fmtN(restUsers.length)} créateurs
                    </Text>
                  </View>
                </View>

                {/* Note explicative */}
                <View style={s.noteCard}>
                  <Ionicons name="information-circle-outline" size={13} color={C.blue} />
                  <Text style={s.noteTxt}>
                    Classement basé sur le total QOB cumulé de tous les contenus publiés par chaque créateur.
                  </Text>
                </View>
              </>
            )}

            {/* État vide */}
            {userRanking.length === 0 && (
              <View style={s.emptyWrap}>
                <Text style={{ fontSize:48 }}>🏆</Text>
                <Text style={s.emptyTitle}>Aucun créateur</Text>
                <Text style={s.emptySub}>
                  Aucun contenu publié dans cette catégorie pour le moment.
                </Text>
              </View>
            )}
          </>
        }
        // Chaque item = 1 utilisateur rang 26+
        renderItem={({ item, index }) => (
  <UserRankCard
    item={item}
    rank={index + 25}
    topQob={topQob}
    setPreviewImage={setPreviewImage}
  />
)}
      />

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES GLOBAUX
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex:1, backgroundColor:C.bg },

  topZone:  { backgroundColor:C.bg, borderBottomWidth:1, borderBottomColor:C.border, paddingBottom:10, zIndex:10 },
  header:   { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:50, paddingBottom:10, gap:12 },
  backBtn:  { width:38, height:38, borderRadius:12, backgroundColor:C.card, borderWidth:1, borderColor:C.border, alignItems:"center", justifyContent:"center" },
  title:    { color:C.text, fontWeight:"900", fontSize:22 },
  subtitle: { color:C.muted, fontWeight:"600", fontSize:11, marginTop:2 },
  liveDot:  { width:7, height:7, borderRadius:4, backgroundColor:C.green },

  headerBadge:   { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:C.goldLight, borderRadius:12, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:C.goldBorder },
  headerBadgeTxt:{ color:C.gold, fontWeight:"900", fontSize:11 },

  // Mode boutons (au-dessus des filtres)
  modeRow:        { flexDirection:"row", paddingHorizontal:16, paddingBottom:10, gap:10 },
  modeBtn:        { flex:1, flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2,
                    paddingVertical:10, borderRadius:14, backgroundColor:C.card,
                    borderWidth:1.5, borderColor:C.border },
  modeBtnActive:  { backgroundColor:C.dark, borderColor:C.goldBorder },
  modeBtnTxt:     { color:C.sub, fontWeight:"800", fontSize:12 },
  modeBtnTxtActive:{ color:C.white, fontWeight:"900", fontSize:12 },
  modeBtnSub:     { color:C.muted, fontWeight:"600", fontSize:9 },

  pillsRow:    { paddingHorizontal:16, gap:8, flexDirection:"row" },
  pill:        { flexDirection:"row", alignItems:"center", gap:5, borderWidth:1, borderColor:C.border, paddingVertical:6, paddingHorizontal:11, borderRadius:999, backgroundColor:C.card },
  pillTxt:     { fontWeight:"700", color:C.sub, fontSize:12 },
  pillCount:   { backgroundColor:C.cardInner, borderRadius:8, paddingHorizontal:5, paddingVertical:2, minWidth:20, alignItems:"center" },
  pillCountTxt:{ color:C.muted, fontWeight:"900", fontSize:9 },

  sectionHeader:   { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:16, marginBottom:8, marginTop:4 },
  sectionLeft:     { flexDirection:"row", alignItems:"center", gap:8 },
  sectionIcon:     { width:28, height:28, borderRadius:8, alignItems:"center", justifyContent:"center" },
  sectionTitle:    { color:C.text, fontWeight:"900", fontSize:15 },
  sectionSub:      { color:C.muted, fontWeight:"600", fontSize:10, marginTop:1 },
  sectionBadge:    { borderRadius:10, paddingHorizontal:10, paddingVertical:5, borderWidth:1 },
  sectionBadgeTxt: { fontWeight:"800", fontSize:11 },

  noteCard: { flexDirection:"row", alignItems:"flex-start", gap:7, marginHorizontal:16, marginBottom:10, backgroundColor:C.blueLight, borderRadius:12, padding:10, borderWidth:1, borderColor:"rgba(0,122,255,0.18)" },
  noteTxt:  { flex:1, color:C.blue, fontWeight:"600", fontSize:11, lineHeight:16 },

  emptyWrap:  { alignItems:"center", paddingVertical:48, gap:12 },
  emptyTitle: { color:C.text, fontWeight:"900", fontSize:18 },
  emptySub:   { color:C.sub, fontWeight:"600", fontSize:14, textAlign:"center", paddingHorizontal:40, lineHeight:20 },

  loadCenter: { flex:1, alignItems:"center", justifyContent:"center", gap:18 },
  loadIcon:   { width:68, height:68, borderRadius:22, backgroundColor:C.goldLight, borderWidth:1.5, borderColor:C.goldBorder, alignItems:"center", justifyContent:"center" },
  loadTxt:    { color:C.muted, fontWeight:"600", fontSize:14 },
});

// Correction d'une constante manquante utilisée dans noteCard
const blueLight = "rgba(0,122,255,0.08)";
Object.assign(C, { blueLight });