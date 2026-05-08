// ─────────────────────────────────────────────────────────────
// RHAZN — IDENTITY WARNING
// Apple-like Premium • Vrai contrat • Logo RHAZN
// ─────────────────────────────────────────────────────────────

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

// ── Palette ────────────────────────────────────────────────────
const C = {
  bg:         "#000000",
  card:       "#0E0E0E",
  surface:    "#161616",
  white:      "#FFFFFF",
  sub:        "rgba(255,255,255,0.55)",
  muted:      "rgba(255,255,255,0.30)",
  border:     "rgba(255,255,255,0.09)",
  gold:       "#D4AF37",
  goldLight:  "rgba(212,175,55,0.12)",
  goldBorder: "rgba(212,175,55,0.30)",
  red:        "#FF453A",
  redLight:   "rgba(255,69,58,0.10)",
  redBorder:  "rgba(255,69,58,0.30)",
  green:      "#30D158",
};

const FOOTER_H = 95;

// ─────────────────────────────────────────────────────────────
// CLAUSE — composant pour chaque article du contrat
// ─────────────────────────────────────────────────────────────
function Clause({
  number, title, children, danger = false,
}: {
  number: string; title: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <View style={cl.wrap}>
      {/* Numéro + titre */}
      <View style={cl.titleRow}>
        <View style={[cl.numBadge, danger && { backgroundColor: C.redLight, borderColor: C.redBorder }]}>
          <Text style={[cl.num, danger && { color: C.red }]}>{number}</Text>
        </View>
        <Text style={[cl.title, danger && { color: C.red }]}>{title}</Text>
      </View>
      {/* Contenu */}
      <View style={cl.body}>{children}</View>
    </View>
  );
}

function ClauseText({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <Text style={[cl.text, danger && { color: C.red, fontWeight: "700" }]}>
      {children}
    </Text>
  );
}

function ClauseItem({ icon = "•", children, danger = false }: {
  icon?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <View style={cl.itemRow}>
      <Text style={[cl.itemIcon, danger && { color: C.red }]}>{icon}</Text>
      <Text style={[cl.itemTxt, danger && { color: C.red, fontWeight: "700" }]}>
        {children}
      </Text>
    </View>
  );
}

const cl = StyleSheet.create({
  wrap:     { marginBottom: 24 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  numBadge: { backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  num:      { color: C.gold, fontWeight: "900", fontSize: 11, letterSpacing: 0.5 },
  title:    { color: C.white, fontWeight: "900", fontSize: 14, flex: 1, letterSpacing: 0.2 },
  body:     { paddingLeft: 4 },
  text:     { color: C.sub, fontSize: 13, lineHeight: 20, marginBottom: 8, fontWeight: "500" },
  itemRow:  { flexDirection: "row", gap: 8, marginBottom: 6 },
  itemIcon: { color: C.gold, fontSize: 13, fontWeight: "900", marginTop: 2, width: 14 },
  itemTxt:  { color: C.sub, fontSize: 13, lineHeight: 20, flex: 1, fontWeight: "500" },
});

// ─────────────────────────────────────────────────────────────
// SÉPARATEUR
// ─────────────────────────────────────────────────────────────
function Divider() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />;
}

// ─────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function IdentityWarning() {
  const router    = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [progress, setProgress] = useState(0);

  // Animation bouton
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return router.replace("/auth/login");

      const { data } = await supabase
        .from("profiles")
        .select("profile_completed_at")
        .eq("id", auth.user.id)
        .single();

      if (data?.profile_completed_at) {
        router.replace({ pathname: "/user-profile-edit", params: { validated: "1" } } as any);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  // Suivi de lecture
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const scrollable = contentSize.height - layoutMeasurement.height;
    if (scrollable <= 0) { setProgress(100); setHasReachedEnd(true); return; }
    const pct = Math.min(100, Math.round((contentOffset.y / scrollable) * 100));
    setProgress(pct);
    if (pct >= 90) setHasReachedEnd(true);
  };

  const handleContinue = async () => {
    // Animation press
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    await supabase
      .from("profiles")
      .update({ identity_warning_seen: true })
      .eq("id", auth.user.id);

    router.replace({
      pathname: "/user-profile-edit",
      params: { validated: "1" },
    } as any);
  };

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color={C.gold} size="large" />
      </View>
    );
  }

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2,"0")}/${String(today.getMonth()+1).padStart(2,"0")}/${today.getFullYear()}`;

  return (
    <View style={s.screen}>

      {/* ── Barre de progression latérale ── */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { height: `${progress}%` as any }]} />
      </View>

      {/* ════════════════════════════════════════
          HEADER FIXE — Logo + titre
      ════════════════════════════════════════ */}
      <View style={s.header}>

        {/* Logo RHAZN */}
        <View style={s.logoRow}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={s.logo}
            resizeMode="contain"
          />
          <View style={s.logoTextCol}>
            <Text style={s.logoName}>RHAZN</Text>
            <Text style={s.logoSub}>Document officiel</Text>
          </View>
          {/* Badge document */}
          <View style={s.docBadge}>
            <Ionicons name="shield-checkmark" size={12} color={C.gold} />
            <Text style={s.docBadgeTxt}>OFFICIEL</Text>
          </View>
        </View>

        {/* Titre — descendu sous le logo */}
        <View style={s.titleWrap}>
          <Text style={s.titleMain}>Entente d'Identité</Text>
          <Text style={s.titleSub}>RHAZN® — Document exécutoire · {dateStr}</Text>
        </View>

        {/* Indicateur lecture */}
        <View style={s.readRow}>
          <View style={[s.readDot, hasReachedEnd && s.readDotDone]} />
          <Text style={[s.readTxt, hasReachedEnd && { color: C.gold }]}>
            {hasReachedEnd
              ? "✓ Lu jusqu'au bout — vous pouvez continuer"
              : "Lisez l'intégralité avant de continuer"}
          </Text>
        </View>

        {/* Ligne dorée */}
        <View style={s.headerLine} />
      </View>

      {/* ════════════════════════════════════════
          CONTENU SCROLLABLE — dépasse au-dessus du footer
      ════════════════════════════════════════ */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: FOOTER_H + 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* ── Préambule ── */}
        <View style={s.preamble}>
          <Text style={s.preambleTxt}>
            En poursuivant vers votre profil RHAZN, vous reconnaissez avoir pris connaissance et accepté
            sans réserve les dispositions ci-dessous. Ces dispositions ont force obligatoire et
            constituent un engagement juridique dès la validation.
          </Text>
        </View>

        <Divider />
        <View style={{ height: 20 }} />

        {/* ── Article 1 ── */}
        <Clause number="ART. 1" title="EXACTITUDE DES INFORMATIONS">
          <ClauseText>
            Toutes les informations que vous vous apprêtez à fournir doivent être strictement
            conformes à votre identité réelle, telle qu'elle figure sur une pièce d'identité
            officielle en cours de validité.
          </ClauseText>
          <ClauseItem icon="✦">Nom et prénom exacts</ClauseItem>
          <ClauseItem icon="✦">Date de naissance vérifiable</ClauseItem>
          <ClauseItem icon="✦">Lieu de naissance authentique</ClauseItem>
          <ClauseItem icon="✦">Numéro NIF valide et personnel</ClauseItem>
        </Clause>

        <Divider />
        <View style={{ height: 20 }} />

        {/* ── Article 2 ── */}
        <Clause number="ART. 2" title="IRRÉVERSIBILITÉ DES DONNÉES">
          <ClauseText>
            Certaines informations enregistrées dans votre profil RHAZN deviendront
            <Text style={{ color: C.white, fontWeight: "800" }}> définitivement immuables</Text> après
            la première validation et ne pourront plus être modifiées sous aucun prétexte,
            ni par vous, ni par l'assistance RHAZN.
          </ClauseText>
          <ClauseItem icon="🔒">Sexe et date de naissance</ClauseItem>
          <ClauseItem icon="🔒">Lieu de naissance complet</ClauseItem>
          <ClauseItem icon="🔒">Premier souvenir mémoriel</ClauseItem>
          <ClauseItem icon="🔒">Profession déclarée</ClauseItem>
          <ClauseText>
            Vous êtes seul responsable de l'exactitude de ces informations avant leur scellement définitif.
          </ClauseText>
        </Clause>

        <Divider />
        <View style={{ height: 20 }} />

        {/* ── Article 3 ── */}
        <Clause number="ART. 3" title="SANCTIONS EN CAS DE VIOLATION" danger>
          <ClauseText danger>
            Toute falsification, erreur délibérée, usurpation d'identité ou non-conformité
            de vos informations avec votre identité réelle entraînera automatiquement et
            sans possibilité de recours :
          </ClauseText>
          <ClauseItem icon="❌" danger>Bannissement définitif du compte RHAZN</ClauseItem>
          <ClauseItem icon="❌" danger>Blocage irréversible du wallet et des soldes</ClauseItem>
          <ClauseItem icon="❌" danger>Perte définitive de la totalité des gains</ClauseItem>
          <ClauseItem icon="❌" danger>Interdiction permanente de réintégration</ClauseItem>
          <ClauseItem icon="❌" danger>Possibilité de poursuites civiles et/ou pénales</ClauseItem>
          <View style={s.dangerNote}>
            <Ionicons name="warning" size={14} color={C.red} />
            <Text style={s.dangerNoteTxt}>
              Aucune contestation ne sera acceptée. Aucun appel ne sera possible.
              Les décisions sont exécutoires et immédiates.
            </Text>
          </View>
        </Clause>

        <Divider />
        <View style={{ height: 20 }} />

        {/* ── Article 4 ── */}
        <Clause number="ART. 4" title="ENGAGEMENT DE CONFORMITÉ">
          <ClauseText>
            En cliquant sur "Je comprends et je poursuis", vous confirmez expressément :
          </ClauseText>
          <ClauseItem icon="✔">Avoir lu et compris l'intégralité des présentes dispositions</ClauseItem>
          <ClauseItem icon="✔">Fournir exclusivement des informations réelles et vérifiables</ClauseItem>
          <ClauseItem icon="✔">Disposer d'une pièce d'identité officielle valide</ClauseItem>
          <ClauseItem icon="✔">Comprendre le caractère irréversible de certaines données</ClauseItem>
          <ClauseItem icon="✔">Accepter toutes les conséquences en cas de violation</ClauseItem>
          <ClauseItem icon="✔">Reconnaître l'autorité suprême et souveraine de RHAZN ADMIN</ClauseItem>
        </Clause>

        <Divider />
        <View style={{ height: 20 }} />

        {/* ── Mention légale ── */}
        <View style={s.legalNote}>
          <Text style={s.legalNoteTxt}>
            RHAZN® — Entente d'Identité Officielle{"\n"}
            © RHAZN — Tous droits réservés — {today.getFullYear()}{"\n"}
            Document généré le {dateStr}
          </Text>
        </View>

        {/* ── Bouton continuer ── */}
        <View style={{ marginTop: 28 }}>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.btn, !hasReachedEnd && s.btnDisabled]}
              onPress={hasReachedEnd ? handleContinue : undefined}
              activeOpacity={0.88}
            >
              {hasReachedEnd
                ? (
                  <View style={s.btnInner}>
                    <Ionicons name="checkmark-circle" size={18} color="#000" />
                    <Text style={s.btnTxt}>Je comprends et je poursuis</Text>
                  </View>
                ) : (
                  <Text style={s.btnTxtDisabled}>Lisez jusqu'à la fin pour continuer…</Text>
                )
              }
            </TouchableOpacity>
          </Animated.View>

          <Text style={s.disclaimer}>
            Ce document constitue un engagement juridique dès validation.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },

  // Barre de progression latérale
  progressTrack: { position: "absolute", right: 0, top: 0, bottom: 0, width: 3, backgroundColor: "rgba(255,255,255,0.06)", zIndex: 10 },
  progressFill:  { width: "100%", backgroundColor: C.gold, borderRadius: 2 },

  // Header fixe
  header: {
    paddingTop: 56,
    paddingHorizontal: 22,
    paddingBottom: 16,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // Logo
  logoRow:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  logo:       { width: 44, height: 44 },
  logoTextCol:{ flex: 1 },
  logoName:   { color: C.gold, fontWeight: "900", fontSize: 18, letterSpacing: 2 },
  logoSub:    { color: C.muted, fontWeight: "600", fontSize: 11, marginTop: 1 },
  docBadge:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.goldLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.goldBorder },
  docBadgeTxt:{ color: C.gold, fontWeight: "900", fontSize: 9, letterSpacing: 1 },

  // Titre — descendu sous le logo
  titleWrap:  { marginBottom: 16 },
  titleMain:  { color: C.white, fontWeight: "900", fontSize: 24, letterSpacing: 0.3, marginBottom: 6 },
  titleSub:   { color: C.muted, fontWeight: "600", fontSize: 12, letterSpacing: 0.2 },

  // Indicateur lecture
  readRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  readDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.20)" },
  readDotDone:{ backgroundColor: C.gold },
  readTxt:    { color: C.muted, fontSize: 12, fontWeight: "700" },

  headerLine: { height: 1, backgroundColor: C.goldBorder, opacity: 0.5 },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingTop: 24 },

  // Préambule
  preamble: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 24,
    borderLeftWidth: 3, borderLeftColor: C.gold,
  },
  preambleTxt: { color: C.sub, fontSize: 13, lineHeight: 21, fontWeight: "500", fontStyle: "italic" },

  // Note danger
  dangerNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(255,69,58,0.08)", borderRadius: 12,
    padding: 12, marginTop: 10, borderWidth: 1, borderColor: C.redBorder,
  },
  dangerNoteTxt: { color: C.red, fontSize: 12, fontWeight: "700", flex: 1, lineHeight: 18 },

  // Mention légale
  legalNote:    { alignItems: "center", paddingVertical: 20, borderTopWidth: 1, borderTopColor: C.border },
  legalNoteTxt: { color: C.muted, fontSize: 11, fontWeight: "600", textAlign: "center", lineHeight: 18 },

  // Bouton
  btn: {
    backgroundColor: C.gold, borderRadius: 18,
    paddingVertical: 16, alignItems: "center",
    shadowColor: C.gold, shadowOpacity: 0.35,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  btnDisabled: { backgroundColor: C.surface, shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: C.border },
  btnInner:    { flexDirection: "row", alignItems: "center", gap: 8 },
  btnTxt:      { color: "#000", fontWeight: "900", fontSize: 15, letterSpacing: 0.3 },
  btnTxtDisabled: { color: C.muted, fontWeight: "700", fontSize: 14 },

  disclaimer: { color: C.muted, fontSize: 11, fontWeight: "600", textAlign: "center", marginTop: 12 },
});