// app/legal/a-propos.tsx
// ✅ À propos RHAZN — Apple-like Premium
// ✅ TEAM RHAZN — membres depuis Supabase, ajout Supreme uniquement via TeamRhaznModal
// ✅ CADNA + Membres Fondateurs cliquables

import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TeamRhaznModal from "../../components/TeamRhaznModal";
import { supabase } from "../../lib/supabase";

const C = {
  bg:      "#F2F2F7",
  card:    "#FFFFFF",
  text:    "#111111",
  sub:     "#6E6E73",
  border:  "#E5E5EA",
  gold:    "#D4AF37",
  goldDim: "rgba(212,175,55,0.12)",
  goldBd:  "rgba(212,175,55,0.30)",
  green:   "#34C759",
  blue:    "#007AFF",
  purple:  "#AF52DE",
  red:     "#FF3B30",
  dark:    "#0A0A0A",
};

const APP_VERSION = (
  Constants.expoConfig?.version ?? (Constants as any).manifest?.version ?? "1.2.9"
) as string;

const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";
const SCREEN_W = Dimensions.get("window").width;

type Fondateur = {
  name: string; title: string; function: string;
  detail: string; image: any; color: string;
};

const VALEURS = [
  { icon: "diamond-outline"          as const, color: C.gold,   label: "Excellence",  detail: "Des contenus de qualité, validés et authentiques." },
  { icon: "people-outline"           as const, color: C.blue,   label: "Communauté",  detail: "Un réseau de créateurs et de membres engagés." },
  { icon: "shield-checkmark-outline" as const, color: C.green,  label: "Confiance",   detail: "Identité vérifiée CADNA pour chaque membre." },
  { icon: "trending-up-outline"      as const, color: C.gold,   label: "Croissance",  detail: "Monétisation réelle des talents haïtiens." },
];

const STATS = [
  { value: "5",     label: "Membres fondateurs" },
  { value: "TAN",   label: "Monnaie virtuelle"  },
  { value: "CADNA", label: "Vérification"       },
  { value: "Haïti", label: "Pays d'origine"     },
];

const LIENS = [
  { icon: "globe-outline"  as const, label: "Site web",  url: "https://rhazn.com"           },
  { icon: "logo-instagram" as const, label: "Instagram", url: "https://instagram.com/rhazn" },
  { icon: "mail-outline"   as const, label: "Support",   url: "mailto:support@rhazn.com"    },
];

const SLOGAN = "L'avenir n'attend pas. Il se construit ici — ou nulle part.";

const FONDATEURS: Fondateur[] = [
  {
    name:     "HACHEM",
    title:    "Le DIEU de l'Univers",
    function: "Source Absolue · Fondation Suprême · Lumière de l'Écosystème",
    detail:   "Avant RHAZN, il y avait HACHEM.\n\n« C'est Lui qui change les temps et les circonstances, qui renverse et établit les rois, qui donne la sagesse aux sages et la connaissance à ceux qui ont de l'intelligence. »\n\n« C'est Lui qui révèle ce qui est profond et caché. Il connaît ce qui est dans les ténèbres, et la lumière demeure auprès de Lui. »\n\nHACHEM n'est pas un titre. C'est une présence. Non pas une institution — une vérité au-delà de toute institution humaine. Chaque ligne de code, chaque vision, chaque décision dans RHAZN n'est que le reflet d'une volonté infiniment plus grande.\n\nL'écosystème RHAZN est bâti sur cette fondation inébranlable.\n\n« La sagesse de ce système ne vient pas des hommes. Elle vient de plus loin. »",
    image:    null,
    color:    C.gold,
  },
  {
    name:     "Badimy ACCILIEN",
    title:    "CVSO",
    function: "Chief Vision & Strategy Officer                         (Directeur de la Vision & de la Stratégie)\n\nEntrepreneur",
    detail:   "🎯 MISSION PRINCIPALE\n\nBadimy ACCILIEN définit, porte et protège la vision globale de RHAZN. Il assure la cohérence stratégique du système, oriente son évolution à long terme et prend les décisions majeures qui déterminent sa direction, son expansion et son équilibre. Il agit comme le centre de gravité de RHAZN, garantissant l’alignement entre vision, structure et réalité.\n\n🧠 POSITION DANS L’ORGANISATION :\n\nFondateur principal - Autorité stratégique suprême - Décideur final sur les orientations majeures - Supervise l’ensemble des pôles sans exécution directe.\n\n🌍 NATURE DU RÔLE\n\nCe rôle est fondamentalement :\n\nStratégique - Visionnaire - Décisionnel - Transversal - Structurant - Badimy ACCILIEN n’est pas un exécutant opérationnel. Il agit comme le chef d’orchestre du système RHAZN, orientant l’ensemble sans intervenir dans chaque détail.\n\n🔥 RESPONSABILITÉS PRINCIPALES\n\n🧭 Vision globale :\n\nDéfinir la direction et l’identité de RHAZN - Fixer les objectifs à long terme - Maintenir une vision claire et stable\n\n🎯 Stratégie :\n\nDéterminer les axes de développement - Prioriser les actions majeures - Arbitrer les décisions critiques\n\n⚖️ Décision finale :\n\nValider ou refuser les propositions stratégiques - Assumer la responsabilité des choix majeurs - Garantir la cohérence globale\n\n🌐 Expansion & positionnement :\n\nOrienter la croissance internationale - Valider les partenariats stratégiques - Positionner RHAZN dans l’écosystème mondial\n\n🧩 Coordination des pôles :\n\nAssurer l’alignement entre les rôles clés - Éviter les conflits structurels - Maintenir l’équilibre organisationnel\n\n💱 Supervision du système économique - Valider les principes fondamentaux du système TAN - Garantir l’équilibre économique global - Orienter les évolutions du modèle\n\n⚖️ RELATIONS FONCTIONNELLES :\n\nReçoit les analyses de Nelcie (systèmes & innovation) -  Travaille avec Mea pour aligner l’image sur la vision - Collabore avec Sindinie pour assurer la cohérence de la communication\n\n💎 VALEUR AJOUTÉE UNIQUE\n\nBadimy ACCILIEN apporte à RHAZN : Une vision structurée et stable - Une capacité de décision claire - Une cohérence stratégique globale - Une orientation durable du système\n\n✍️ CITATIONS OFFICIELLES\n\n« Une vision sans structure s’efface, une structure sans vision s’effondre. ».\n\n« Diriger, ce n’est pas tout faire, c’est donner une direction que rien ne contredit. ».\n\n« La force d’un système ne dépend pas de sa taille, mais de la clarté de celui qui le guide. ».\n\n🖋️ SIGNATURE OFFICIELLE\n\nBadimy ACCILIEN\n\nChief Vision & Strategy Officer (CVSO)\n\nRHAZN Global System",
    image:    require("../../assets/images/ba.png"),
    color:    C.gold,
  },
  {
    name:     "Marie Mea Foodnerlyne MICHEL",
    title:    "CBO",
    function: "Chief Brand Officer & Global Ambassador    (Directrice de l’Image & Ambassadrice Mondiale)\n\nÉtudiante en Chirurgie Dentaire · Entrepreneur",
    detail:   "🎯 MISSION PRINCIPALE\n\nMarie Mea Foodnerlyne MICHEL incarne, protège et projette l’image de RHAZN à l’échelle mondiale. Elle ne se limite pas à représenter la marque : elle lui donne une présence vivante, une identité ressentie et une force émotionnelle durable. À travers son image, son attitude et son influence, elle transforme RHAZN en une référence universelle de simplicité, d’élégance et de puissance maîtrisée.\n\n🧠 POSITION DANS L’ORGANISATION\n\nMembre fondatrice - Représentation officielle de RHAZN à l’international - Porteuse de l’identité visuelle et émotionnelle du système - Indépendante des opérations techniques et internes.\n\n🌍 NATURE DU RÔLE\n\nCe rôle est fondamentalement : Représentatif - Symbolique - Émotionnel - Influenceur - Inspirant - Marie Mea Foodnerlyne MICHEL n’est pas une exécutante. Elle est l’image vivante de RHAZN, un repère visuel et émotionnel pour le monde.\n\n🔥 RESPONSABILITÉS PRINCIPALES\n\nIncarnation de la marque\n\nReprésenter RHAZN avec élégance et authenticité - Maintenir une image cohérente, pure et reconnaissable - Devenir un symbole visuel fort associé à RHAZN\n\n🌟 Ambassadrice mondiale\n\nReprésenter RHAZN lors d’événements internationaux - Porter la vision RHAZN dans des environnements stratégiques - Inspirer confiance, admiration et reconnaissance.\n\n🎯 Direction de l’image\n\nVeiller à la cohérence esthétique et symbolique de RHAZN - Orienter les choix visuels majeurs (style, ton, présence) - Garantir une identité simple, forte et intemporelle.\n\n💎 Influence & perception\n\nInfluencer la manière dont RHAZN est perçu dans le monde - Créer une connexion émotionnelle avec le public - Donner une dimension humaine et accessible au système.\n\n🕊️ Modèle de valeurs\n\nReprésenter la simplicité, la douceur et la maîtrise - Incarner des valeurs saines, stables et universelles - Être un repère de cohérence entre image et réalité.\n\n⚖️ RELATIONS FONCTIONNELLES\n\nTravaille en harmonie avec le CVSO pour aligner l’image sur la vision - N’intervient pas dans les systèmes et l’innovation (rôle de Nelcie) - Ne gère pas les relations publiques opérationnelles (rôle de Sindinie).\n\n💎 VALEUR AJOUTÉE UNIQUE\n\nMarie Mea Foodnerlyne MICHEL apporte à RHAZN : Une identité visuelle incarnée - Une influence naturelle et authentique - Une puissance émotionnelle durable - Une reconnaissance immédiate à l’échelle mondiale\n\n✍️ CITATIONS OFFICIELLES :\n\n«Une marque devient réelle lorsque quelqu’un peut la ressentir avant même de la comprendre.»\n\n«L’image n’est pas ce que l’on montre, mais ce que le monde retient sans effort.»\n\n«La véritable influence ne s’impose pas ; elle s’imprime silencieusement dans l’esprit.»\n\n🖋️ SIGNATURE OFFICIELLE\n\nMarie Mea Foodnerlyne MICHEL\n\nChief Brand Officer & Global Ambassador (CBO)\n\nRHAZN Global System",
    image:    require("../../assets/images/mea.png"),
    color:    C.blue,
  },
  {
    name:     "Marie Nelcie Kerlinda MICHEL",
    title:    "CSAE",
    function: "Chief Systems Architect & Innovation Explorer (Architecte des Systèmes & Exploratrice de l’Innovation)\n\n Étudiante en Sciences Informatiques · Entrepreneur",
    detail:   "🎯 MISSION PRINCIPALE\n\nMarie Nelcie Kerlinda MICHEL conçoit, observe et guide l’intelligence profonde du système RHAZN. Elle ne se limite pas à la technologie visible : elle structure les logiques invisibles, anticipe les évolutions et veille à la cohérence globale du système. Elle agit comme une exploratrice stratégique, capable de transformer la complexité en clarté et d’orienter RHAZN vers des architectures durables, intelligentes et évolutives.\n\n🧠 POSITION DANS L’ORGANISATION\n\nMembre fondatrice - Rôle stratégique transversal - Indépendante des opérations quotidiennes - Connectée à l’ensemble des pôles sans dépendance hiérarchique directe.\n\n🌍 NATURE DU RÔLE\n\nCe rôle est fondamentalement : Libre - Exploratoire - Systémique - Créatif - Prospectif. Marie Nelcie Kerlinda MICHEL n’est pas enfermée dans un cadre d’exécution technique. Elle évolue comme une architecte de l’intelligence globale du système.\n\n🔥 RESPONSABILITÉS PRINCIPALES\n\n🧩 Architecture des systèmes\n\nConcevoir des structures logiques robustes et évolutives - Simplifier des systèmes complexes - Garantir la cohérence technique globale.\n\n🔍 Exploration & innovation\n\nIdentifier les tendances technologiques émergentes - Expérimenter de nouveaux concepts - Proposer des innovations applicables à RHAZN.\n\n🧠 Intelligence structurelle\n\nComprendre les interactions profondes entre les composants du système - Détecter les failles invisibles - Optimiser la stabilité et la fluidité globale.\n\n🌐 Interconnexion des systèmes\n\nAssurer l’harmonie entre technologie, économie et expérience utilisateur - Maintenir l’équilibre entre les différents piliers du système RHAZN.\n\n🔮 Anticipation stratégique\n\nPrévoir les évolutions futures - Identifier les risques structurels - Orienter les décisions à long terme.\n\n⚖️ RELATIONS FONCTIONNELLES\n\nCollabore avec le CVSO pour orienter les décisions stratégiques - N’intervient pas dans l’image de marque (rôle de Mea) - N’intervient pas dans la communication et les relations publiques (rôle de Sindinie)\n\n💎 VALEUR AJOUTÉE UNIQUE\n\nMarie Nelcie Kerlinda MICHEL apporte à RHAZN : Une vision systémique profonde -  Une capacité d’anticipation stratégique - Une intelligence de structuration invisible - Une innovation durable et maîtrisée.\n\n✍️ CITATIONS OFFICIELLES\n\n«Ce qui est visible n’est que la surface ; la véritable puissance réside dans les structures que personne ne voit.»\n\n«Un grand système ne se construit pas par accumulation, mais par compréhension des liens invisibles qui unissent chaque élément.»\n\n«L’innovation véritable ne consiste pas à créer davantage, mais à révéler ce qui doit exister.»\n\n🖋️ SIGNATURE OFFICIELLE\n\nMarie Nelcie Kerlinda MICHEL\n\nChief Systems Architect & Innovation Explorer (CSAE)\n\nRHAZN Global System",
    image:    require("../../assets/images/nel.png"),
    color:    C.purple,
  },
  {
    name:     "Sindinie FRANÇOIS",
    title:    "CPRHEO",
    function: "Chief Public Relations & Human Engagement Officer Directrice des Relations Publiques & Engagement Humain\n\n Mémorante en Psychologie · Diplômée en Gestion des Affaires · Entrepreneur",
    detail:   "🎯 MISSION PRINCIPALE.\n\nSindinie FRANÇOIS développe, structure et protège les relations humaines de RHAZN à l’échelle nationale et internationale. Elle ne se limite pas à communiquer : elle établit des connexions réelles, crée des ponts entre la plateforme et le monde, et assure une interaction claire, respectueuse et stratégique avec tous les publics. Elle est la voix structurée de RHAZN et le lien vivant entre le système et les êtres humains.\n\n🧠 POSITION DANS L’ORGANISATION\n\nMembre fondatrice - Responsable des relations publiques et des interactions humaines - Connectée à tous les pôles sans dépendance technique ou visuelle - Interface entre RHAZN et ses publics.\n\n🌍 NATURE DU RÔLE\n\nCe rôle est fondamentalement : Relationnel - Communicationnel - Stratégique -  Humain - Institutionnel -  Sindinie FRANÇOIS n’est pas une représentante visuelle de la marque. Elle est la structure de communication et de relation humaine de RHAZN.\n\n🔥 RESPONSABILITÉS PRINCIPALES.\n\nRelations humaines :\n\nDévelopper des relations solides avec les utilisateurs, partenaires et institutions - Comprendre les besoins, attentes et perceptions du public - Maintenir une proximité humaine authentique\n\nCommunication officielle :\n\nStructurer et valider les messages publics de RHAZN - Garantir une communication claire, cohérente et professionnelle - Adapter les messages aux différents contextes et audiences.\n\n🌍 Relations publiques :\n\nGérer les relations avec les médias, partenaires et institutions - Représenter RHAZN dans les échanges formels - Développer l’image institutionnelle de la plateforme.\n\n🧠 Gestion de la perception :\n\nObserver et analyser la perception publique de RHAZN - Remonter les retours et signaux faibles.\n\n⚠️ Gestion de crise : \n\nIntervenir en cas de tension ou de conflit - Protéger la réputation de RHAZN - Maintenir la confiance du public.\n\n⚖️ RELATIONS FONCTIONNELLES :\n\nSindinie FRANÇOIS apporte à RHAZN : Une communication maîtrisée et structurée - Une relation humaine authentique et durable - Une gestion intelligente de la perception publique - Une stabilité relationnelle dans toutes les situations.\n\n✍️ CITATIONS OFFICIELLES :\n\n« Une organisation ne grandit pas seulement par ce qu’elle construit, mais par les liens qu’elle entretient.»\n\n\« Communiquer, ce n’est pas parler ; c’est être compris avec justesse.»\n\n«La confiance se gagne dans la clarté, se maintient dans la cohérence et se protège dans les moments critiques.»\n\n 🖋️ SIGNATURE OFFICIELLE\n\nSindinie FRANÇOIS\n\nChief Public Relations & Human Engagement Officer (CPRHEO)\n\nRHAZN Global System",
    image:    require("../../assets/images/sinsin.png"),
    color:    C.green,
  },
];


const FONDATEUR_EMAILS = [
  "meyounbauniklovegodstory@gmail.com",
  "badimyaccilien@gmail.com",
  "michelnerlyne@gmail.com",
  "mmarienelcie@gmail.com",
  "francoissindinie27@gmail.com",
];

function getInitials(name: string): string {
  const p = name.trim().split(" ").filter(Boolean);
  if (p.length === 0) return "?";
  return p.length === 1
    ? (p[0][0] || "?").toUpperCase()
    : ((p[0][0] || "") + (p[p.length - 1][0] || "")).toUpperCase();
}

// ═════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═════════════════════════════════════════════════════════════
export default function AProposScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatRef   = useRef<FlatList>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const [showTeam,       setShowTeam]       = useState(false);
  const [showCadna,      setShowCadna]      = useState(false);
  const [showFondateurs, setShowFondateurs] = useState(false);
  const [selectedFond,   setSelectedFond]   = useState<Fondateur | null>(null);
  const [fondIndex,      setFondIndex]      = useState(0);
  const [showPhoto,      setShowPhoto]      = useState(false);
  const [fullPhotoSrc,   setFullPhotoSrc]   = useState<any>(null);

  const [userRole,         setUserRole]         = useState("user");
  const [userEmail,        setUserEmail]         = useState("");
  const [fondateursPublic, setFondateursPublic] = useState(false);
  const [togglingAccess,   setTogglingAccess]   = useState(false);
  const [accessChecked,    setAccessChecked]    = useState(false);
  const isSupreme        = userRole === "supreme" || userEmail === SUPREME_EMAIL;
  const isFondateur      = FONDATEUR_EMAILS.includes(userEmail);
  const canSeeFondateurs = isSupreme || isFondateur || fondateursPublic;

  const [teamCount, setTeamCount] = useState(0);

  const refreshTeamCount = () => {
    supabase
      .from("team_rhazn")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => setTeamCount(count ?? 0));
  };

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid   = auth?.user?.id;
      const email = auth?.user?.email?.toLowerCase() ?? "";
      setUserEmail(email);
      if (!uid) { setAccessChecked(true); return; }
      const { data: prof } = await supabase
        .from("profiles").select("role").eq("id", uid).maybeSingle();
      setUserRole(prof?.role?.toLowerCase() ?? "user");
      const { data: cfg } = await supabase
        .from("app_config").select("fondateurs_public").eq("app", "rhazn").maybeSingle();
      setFondateursPublic(!!(cfg as any)?.fondateurs_public);
      setAccessChecked(true);
    })();
    refreshTeamCount();
  }, []);

  const toggleFondateursAccess = async () => {
    if (!isSupreme || togglingAccess) return;
    setTogglingAccess(true);
    const newVal = !fondateursPublic;
    try {
      await supabase
        .from("app_config")
        .update({ fondateurs_public: newVal } as any)
        .eq("app", "rhazn");
      setFondateursPublic(newVal);
      Haptics.notificationAsync(
        newVal
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      ).catch(() => {});
    } catch {}
    setTogglingAccess(false);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color={C.gold} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>À propos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.logoWrap}>
            <Image source={require("../../assets/images/rhazn-logo.png")} style={s.logo} resizeMode="contain" />
          </View>
          <Text style={s.appName}>RHAZN</Text>
          <Text style={s.appTagline}>La plateforme numérique haïtienne</Text>
          <View style={s.versionPill}><Text style={s.versionTxt}>Version {APP_VERSION}</Text></View>
        </View>

        {/* Mission */}
        <View style={s.missionCard}>
          <View style={s.missionHeader}>
            <Ionicons name="rocket-outline" size={20} color={C.gold} />
            <Text style={s.missionTitle}>Notre Mission</Text>
          </View>
          <Text style={s.missionBody}>
            RHAZN est la première plateforme numérique haïtienne dédiée à la création de contenus, au commerce et à la monétisation des talents. Nous offrons un écosystème complet où chaque membre peut publier, consommer et générer des revenus réels en TAN.
          </Text>
        </View>

        {/* Stats */}
        <View style={s.statsCard}>
          {STATS.map((st, i) => (
            <View key={i} style={[s.statItem, i < STATS.length - 1 && s.statBorder]}>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Valeurs */}
        <Text style={s.sectionLabel}>NOS VALEURS</Text>
        <View style={s.valeursGrid}>
          {VALEURS.map((v, i) => (
            <View key={i} style={[s.valeurCard, { borderColor: v.color + "30" }]}>
              <View style={[s.valeurIcon, { backgroundColor: v.color + "15" }]}>
                <Ionicons name={v.icon} size={22} color={v.color} />
              </View>
              <Text style={s.valeurLabel}>{v.label}</Text>
              <Text style={s.valeurDetail}>{v.detail}</Text>
            </View>
          ))}
        </View>

        {/* Organisation */}
        <Text style={s.sectionLabel}>ORGANISATION</Text>

        {/* ── Carte Fondateurs PREMIUM ── */}
        <TouchableOpacity
          style={s.foundersCard}
          onPress={() => {
            if (!accessChecked || !canSeeFondateurs) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setShowFondateurs(true);
          }}
          activeOpacity={0.80}
        >
          <View style={s.foundersCardBg} />
          <View style={s.foundersCardTop}>
            <View style={s.foundersCardLeft}>
              <View style={s.foundersIconWrap}>
                <Ionicons name="ribbon" size={26} color={C.gold} />
              </View>
              <View>
                <View style={s.foundersNewBadge}><Text style={s.foundersNewTxt}>FONDATEURS</Text></View>
                <Text style={s.foundersCardTitle}>Les Bâtisseurs</Text>
                <Text style={s.foundersCardSub}>de l'écosystème RHAZN</Text>
              </View>
            </View>
            <View style={s.foundersBadgeNum}>
              <Text style={s.foundersBadgeNumTxt}>{FONDATEURS.length}</Text>
            </View>
          </View>
          <View style={s.foundersAvatarRow}>
            {FONDATEURS.slice(1).map((f, i) => (
              <View key={i} style={[s.foundersAvatar, { marginLeft: i > 0 ? -14 : 0, zIndex: 10 - i, borderColor: f.color }]}>
                {f.image
                  ? <Image source={f.image} style={{ width: "100%", height: "100%", borderRadius: 20 }} />
                  : <View style={[{ flex: 1, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: f.color + "20" }]}><Text style={{ fontSize: 16 }}>✦</Text></View>
                }
              </View>
            ))}
            <View style={s.foundersAvatarMore}><Text style={s.foundersAvatarMoreTxt}>+1</Text></View>
          </View>
          <View style={s.foundersSlogan}>
            <Ionicons name="sparkles" size={12} color={C.gold} />
            <Text style={s.foundersSloganTxt} numberOfLines={2}>{SLOGAN}</Text>
          </View>
          {isSupreme && (
            <TouchableOpacity
              style={[s.foundersToggleBtn, fondateursPublic && s.foundersToggleBtnOn]}
              onPress={(e) => { e.stopPropagation?.(); toggleFondateursAccess(); }}
              activeOpacity={0.85}
            >
              <Ionicons name={fondateursPublic ? "eye" : "eye-off"} size={14} color={fondateursPublic ? "#000" : C.gold} />
              <Text style={[s.foundersToggleTxt, fondateursPublic && { color: "#000" }]}>
                {togglingAccess ? "…" : fondateursPublic ? "Accès public activé" : "Accès restreint"}
              </Text>
            </TouchableOpacity>
          )}
          {!canSeeFondateurs && accessChecked && (
            <View style={s.foundersLockedBadge}>
              <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.40)" />
              <Text style={s.foundersLockedTxt}>Réservé aux fondateurs</Text>
            </View>
          )}
          <View style={s.foundersCardArrow}>
            <Text style={[s.foundersCardArrowTxt, { opacity: canSeeFondateurs ? 1 : 0.3 }]}>
              {canSeeFondateurs ? "Découvrir →" : "Accès restreint"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Carte TEAM RHAZN ── */}
        <TouchableOpacity
          style={s.orgCard}
          onPress={() => { Haptics.selectionAsync(); setShowTeam(true); }}
          activeOpacity={0.80}
        >
          <View style={[s.orgIcon, { backgroundColor: C.gold + "18" }]}>
            <Ionicons name="people" size={24} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.orgTitle}>TEAM RHAZN</Text>
            <Text style={s.orgSub}>
              {`${teamCount} membre${teamCount > 1 ? "s" : ""} · L'équipe qui bâtit l'écosystème`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.sub} />
        </TouchableOpacity>

        {/* Carte CADNA */}
        <TouchableOpacity
          style={[s.orgCard, { borderColor: C.gold + "30" }]}
          onPress={() => { Haptics.selectionAsync(); setShowCadna(true); }}
          activeOpacity={0.80}
        >
          <View style={[s.orgIcon, { backgroundColor: C.gold + "18" }]}>
            <Ionicons name="shield-checkmark" size={24} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.orgTitle}>CADNA</Text>
            <Text style={s.orgSub}>Analyse · Censure · Garant de la moralité RHAZN</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.sub} />
        </TouchableOpacity>

        {/* Liens */}
        <Text style={s.sectionLabel}>NOUS REJOINDRE</Text>
        <View style={s.liensCard}>
          {LIENS.map((l, i) => (
            <TouchableOpacity
              key={i}
              style={[s.lienRow, i < LIENS.length - 1 && s.lienBorder]}
              onPress={() => { Haptics.selectionAsync(); Linking.openURL(l.url); }}
              activeOpacity={0.75}
            >
              <View style={s.lienIcon}><Ionicons name={l.icon} size={18} color={C.gold} /></View>
              <Text style={s.lienLabel}>{l.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.sub} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerTitle}>RHAZN</Text>
          <Text style={s.footerSub}>Fait avec ❤️ en Haïti</Text>
          <Text style={s.footerCopy}>© 2026 RHAZN Technologies · Tous droits réservés</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ══ MODAL TEAM RHAZN ══ */}
      <TeamRhaznModal
        visible={showTeam}
        isSupreme={isSupreme}
        onClose={() => {
          setShowTeam(false);
          refreshTeamCount();
        }}
      />

      {/* ══ MODAL CADNA ══ */}
      <Modal visible={showCadna} transparent animationType="slide" onRequestClose={() => setShowCadna(false)}>
        <Pressable style={m.backdrop} onPress={() => setShowCadna(false)} />
        <View style={m.sheet}>
          <View style={m.handle} />
          <View style={m.sheetHeader}>
            <View style={[m.sheetIcon, { backgroundColor: C.gold + "18" }]}>
              <Ionicons name="shield-checkmark" size={26} color={C.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={m.sheetTitle}>Système CADNA</Text>
              <Text style={m.sheetSub}>Certification d'Authenticité RHAZN</Text>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            <View style={m.cadnaMissionBox}>
              <Text style={m.cadnaMissionTitle}>
                Commission d'Analyse, de Déontologie et de Normalisation des Activités
              </Text>
            </View>
            <View style={m.cadnaQuoteBox}>
              <Ionicons name="shield" size={16} color={C.gold} />
              <Text style={m.cadnaQuoteTxt}>
                CADNA est le gardien absolu de ce que vous consommez sur RHAZN. Aucun contenu n'échappe à son regard.
              </Text>
            </View>
            {[
              { icon: "search",               color: C.gold,  title: "Analyse approfondie",       body: "CADNA examine chaque contenu soumis à publication avant toute mise en ligne." },
              { icon: "checkmark-done-circle", color: C.green, title: "Approbation ou Rejet",       body: "CADNA approuve les contenus conformes et rejette tout ce qui contrevient aux règles." },
              { icon: "ban",                  color: C.red,   title: "Censure & Contrôle",         body: "CADNA censure tout contenu incompatible avec les valeurs RHAZN." },
              { icon: "ribbon",               color: C.gold,  title: "Garant de la qualité",       body: "Tout contenu disponible a été examiné et validé par CADNA." },
              { icon: "shield-checkmark",     color: C.blue,  title: "Protection de la communauté",body: "CADNA protège chaque membre contre les contenus nuisibles ou trompeurs." },
            ].map((item, i) => (
              <View key={i} style={m.cadnaRow}>
                <View style={[m.cadnaIcon, { backgroundColor: item.color + "15" }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={m.cadnaRowTitle}>{item.title}</Text>
                  <Text style={m.cadnaRowBody}>{item.body}</Text>
                </View>
              </View>
            ))}
            <View style={m.cadnaFoundingBox}>
              <Text style={m.cadnaFoundingTxt}>
                « Ce n'est pas l'utilisateur qui décide ce qui est acceptable. C'est CADNA. »
              </Text>
            </View>
          </ScrollView>
          <TouchableOpacity style={m.closeBtn} onPress={() => setShowCadna(false)}>
            <Text style={m.closeTxt}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ══ MODAL MEMBRES FONDATEURS ══ */}
      <Modal
        visible={showFondateurs}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowFondateurs(false); setSelectedFond(null); }}
      >
        <Pressable style={m.backdrop} onPress={() => { setShowFondateurs(false); setSelectedFond(null); }} />
        <View style={[m.sheet, { paddingBottom: 36 }]}>
          <View style={m.handle} />

          {selectedFond ? (
            <>
              <View style={m.detailHeader}>
                <TouchableOpacity style={m.backRow} onPress={() => setSelectedFond(null)}>
                  <Ionicons name="chevron-back" size={18} color={C.gold} />
                  <Text style={m.backTxt}>Membres Fondateurs</Text>
                </TouchableOpacity>
                <View style={m.dotsRow}>
                  {FONDATEURS.map((_, i) => (
                    <View key={i} style={[m.dot, i === fondIndex && m.dotActive]} />
                  ))}
                </View>
              </View>

              <FlatList
                ref={flatRef}
                data={FONDATEURS}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                initialScrollIndex={fondIndex}
                getItemLayout={(_, index) => ({
                  length: SCREEN_W - 40,
                  offset: (SCREEN_W - 40) * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 40));
                  setFondIndex(idx);
                  setSelectedFond(FONDATEURS[idx]);
                }}
                renderItem={({ item: f }) => (
                  <ScrollView
                    style={{ width: SCREEN_W - 40 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={m.detailWrap}
                  >
                    <TouchableOpacity
                      onPress={() => { if (f.image) { setFullPhotoSrc(f.image); setShowPhoto(true); } }}
                      activeOpacity={f.image ? 0.85 : 1}
                    >
                      {f.image ? (
                        <View>
                          <Image source={f.image} style={m.detailPhoto} />
                          <View style={m.photoZoomHint}>
                            <Ionicons name="expand-outline" size={12} color="#fff" />
                            <Text style={m.photoZoomTxt}>Voir en grand</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={[m.detailPhotoEmpty, { borderColor: f.color }]}>
                          <Text style={{ fontSize: 46 }}>✦</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <Text style={m.detailName}>{f.name}</Text>
                    <View style={[m.detailBadge, { backgroundColor: f.color + "18", borderColor: f.color + "35" }]}>
                      <Text style={[m.detailBadgeTxt, { color: f.color }]}>{f.title}</Text>
                    </View>
                    <Text style={m.detailFunc}>{f.function}</Text>
                    <View style={m.detailDivider} />
                    {f.detail.split("\n\n").map((para, i) => (
                      <Text key={i} style={para.startsWith("«") ? m.detailQuote : m.detailDesc}>
                        {para}
                      </Text>
                    ))}

                    <View style={m.navRow}>
                      {fondIndex > 0 && (
                        <TouchableOpacity
                          style={m.navBtn}
                          onPress={() => {
                            const prev = fondIndex - 1;
                            flatRef.current?.scrollToIndex({ index: prev, animated: true });
                            setFondIndex(prev);
                            setSelectedFond(FONDATEURS[prev]);
                          }}
                        >
                          <Ionicons name="chevron-back" size={16} color={C.gold} />
                          <Text style={m.navBtnTxt} numberOfLines={1}>
                            {FONDATEURS[fondIndex - 1].name.split(" ")[0]}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {fondIndex < FONDATEURS.length - 1 && (
                        <TouchableOpacity
                          style={[m.navBtn, m.navBtnRight]}
                          onPress={() => {
                            const next = fondIndex + 1;
                            flatRef.current?.scrollToIndex({ index: next, animated: true });
                            setFondIndex(next);
                            setSelectedFond(FONDATEURS[next]);
                          }}
                        >
                          <Text style={m.navBtnTxt} numberOfLines={1}>
                            {FONDATEURS[fondIndex + 1].name.split(" ")[0]}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={C.gold} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>
                )}
              />
            </>
          ) : (
            <>
              <View style={m.sheetHeader}>
                <View style={[m.sheetIcon, { backgroundColor: C.gold + "18" }]}>
                  <Ionicons name="ribbon" size={26} color={C.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={m.sheetTitle}>Membres Fondateurs</Text>
                  <Text style={m.sheetSub}>Les bâtisseurs de RHAZN</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m.hScroll}>
                {FONDATEURS.map((f, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[m.fondCard, { borderColor: f.color + "40" }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setFondIndex(i);
                      setSelectedFond(f);
                    }}
                    activeOpacity={0.80}
                  >
                    {f.image
                      ? <Image source={f.image} style={m.fondCardPhoto} />
                      : <View style={[m.fondCardEmpty, { backgroundColor: f.color + "18", borderColor: f.color + "30" }]}>
                          <Text style={{ fontSize: 30 }}>✦</Text>
                        </View>
                    }
                    <Text style={m.fondCardName} numberOfLines={2}>{f.name}</Text>
                    <View style={[m.rolePill, { backgroundColor: f.color + "18", borderColor: f.color + "30" }]}>
                      <Text style={[m.roleText, { color: f.color }]}>{f.title}</Text>
                    </View>
                    <Text style={m.fondCardSee}>Voir la fiche →</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={m.hintTxt}>Appuyez sur un membre pour voir sa fiche</Text>
            </>
          )}

          <TouchableOpacity
            style={[m.closeBtn, { marginTop: 16 }]}
            onPress={() => { setShowFondateurs(false); setSelectedFond(null); }}
          >
            <Text style={m.closeTxt}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ══ PHOTO PLEIN ÉCRAN ══ */}
      <Modal visible={showPhoto} transparent animationType="fade" onRequestClose={() => setShowPhoto(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" }}
          onPress={() => setShowPhoto(false)}
        >
          {fullPhotoSrc && (
            <Image
              source={fullPhotoSrc}
              style={{ width: "90%", height: "70%", borderRadius: 20 }}
              resizeMode="contain"
            />
          )}
          <View style={{ marginTop: 20, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.50)" />
            <Text style={{ color: "rgba(255,255,255,0.50)", fontWeight: "700", fontSize: 13 }}>
              Appuyer pour fermer
            </Text>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  scroll:      { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  hero:        { alignItems: "center", paddingVertical: 32 },
  logoWrap:    { width: 100, height: 100, borderRadius: 28, backgroundColor: "#000", alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  logo:        { width: 70, height: 70 },
  appName:     { fontSize: 28, fontWeight: "900", color: C.text, letterSpacing: 1 },
  appTagline:  { fontSize: 14, color: C.sub, fontWeight: "600", marginTop: 4 },
  versionPill: { marginTop: 10, backgroundColor: C.goldDim, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: C.goldBd },
  versionTxt:  { color: C.gold, fontSize: 12, fontWeight: "800" },
  missionCard:   { backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  missionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  missionTitle:  { fontSize: 15, fontWeight: "900", color: C.text },
  missionBody:   { fontSize: 14, color: C.sub, lineHeight: 22, fontWeight: "600" },
  statsCard:     { backgroundColor: C.card, borderRadius: 18, flexDirection: "row", marginBottom: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  statItem:      { flex: 1, alignItems: "center", paddingVertical: 16 },
  statBorder:    { borderRightWidth: 1, borderRightColor: C.border },
  statValue:     { fontSize: 15, fontWeight: "900", color: C.gold, marginBottom: 3 },
  statLabel:     { fontSize: 10, color: C.sub, fontWeight: "700", textAlign: "center" },
  sectionLabel:  { color: C.sub, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  valeursGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  valeurCard:    { width: "48%", backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1 },
  valeurIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  valeurLabel:   { fontSize: 14, fontWeight: "900", color: C.text, marginBottom: 4 },
  valeurDetail:  { fontSize: 12, color: C.sub, fontWeight: "600", lineHeight: 17 },
  orgCard:       { backgroundColor: C.card, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  orgIcon:       { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  orgTitle:      { fontSize: 15, fontWeight: "900", color: C.text, marginBottom: 3 },
  orgSub:        { fontSize: 12, color: C.sub, fontWeight: "600" },
  liensCard:     { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 20, overflow: "hidden" },
  lienRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  lienBorder:    { borderBottomWidth: 1, borderBottomColor: C.border },
  lienIcon:      { width: 34, height: 34, borderRadius: 10, backgroundColor: C.goldDim, alignItems: "center", justifyContent: "center" },
  lienLabel:     { flex: 1, fontSize: 14, fontWeight: "700", color: C.text },
  footer:        { alignItems: "center", paddingVertical: 20, gap: 4 },
  footerTitle:   { fontSize: 18, fontWeight: "900", color: C.text, letterSpacing: 1 },
  footerSub:     { fontSize: 13, color: C.sub, fontWeight: "600" },
  footerCopy:    { fontSize: 11, color: C.sub, fontWeight: "600", marginTop: 4 },
  foundersCard:          { backgroundColor: C.dark, borderRadius: 22, padding: 18, marginBottom: 10, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.40)", shadowColor: C.gold, shadowOpacity: 0.20, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10, gap: 14 },
  foundersCardBg:        { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(212,175,55,0.06)" },
  foundersCardTop:       { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  foundersCardLeft:      { flexDirection: "row", alignItems: "center", gap: 12 },
  foundersIconWrap:      { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(212,175,55,0.15)", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.35)", alignItems: "center", justifyContent: "center" },
  foundersNewBadge:      { backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 4 },
  foundersNewTxt:        { color: "#000", fontWeight: "900", fontSize: 9, letterSpacing: 1 },
  foundersCardTitle:     { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  foundersCardSub:       { color: "rgba(255,255,255,0.50)", fontSize: 12, fontWeight: "600", marginTop: 2 },
  foundersBadgeNum:      { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(212,175,55,0.15)", borderWidth: 1, borderColor: "rgba(212,175,55,0.35)", alignItems: "center", justifyContent: "center" },
  foundersBadgeNumTxt:   { color: C.gold, fontWeight: "900", fontSize: 15 },
  foundersAvatarRow:     { flexDirection: "row", alignItems: "center" },
  foundersAvatar:        { width: 42, height: 42, borderRadius: 21, borderWidth: 2, overflow: "hidden", backgroundColor: "#1A1A1A" },
  foundersAvatarMore:    { width: 42, height: 42, borderRadius: 21, marginLeft: -14, backgroundColor: "rgba(212,175,55,0.15)", borderWidth: 2, borderColor: "rgba(212,175,55,0.35)", alignItems: "center", justifyContent: "center" },
  foundersAvatarMoreTxt: { color: C.gold, fontWeight: "900", fontSize: 12 },
  foundersSlogan:        { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.18)" },
  foundersSloganTxt:     { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700", fontStyle: "italic", flex: 1, lineHeight: 18 },
  foundersCardArrow:     { alignSelf: "flex-end" },
  foundersCardArrowTxt:  { color: C.gold, fontWeight: "900", fontSize: 13 },
  foundersToggleBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(212,175,55,0.12)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(212,175,55,0.30)", alignSelf: "flex-start" },
  foundersToggleBtnOn:   { backgroundColor: C.gold },
  foundersToggleTxt:     { color: C.gold, fontWeight: "800", fontSize: 11 },
  foundersLockedBadge:   { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  foundersLockedTxt:     { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "700" },
});

const m = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:     { backgroundColor: "#111111", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)", maxHeight: "90%" },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginBottom: 18 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  sheetIcon:   { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sheetTitle:  { fontSize: 18, fontWeight: "900", color: "#FFFFFF" },
  sheetSub:    { fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: "600", marginTop: 2 },
  hScroll:     { paddingBottom: 8, gap: 12, paddingRight: 20 },
  rolePill:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  roleText:    { fontSize: 11, fontWeight: "900" },
  closeBtn:    { backgroundColor: C.gold, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  closeTxt:    { color: "#000", fontWeight: "900", fontSize: 15 },
  cadnaRow:         { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  cadnaIcon:        { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cadnaRowTitle:    { fontSize: 14, fontWeight: "900", color: "#FFFFFF", marginBottom: 3 },
  cadnaRowBody:     { fontSize: 12, color: "rgba(255,255,255,0.50)", fontWeight: "600", lineHeight: 17 },
  cadnaMissionBox:  { backgroundColor: "#000", borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: "rgba(212,175,55,0.35)" },
  cadnaMissionTitle:{ color: C.gold, fontWeight: "900", fontSize: 14, lineHeight: 20, textAlign: "center", letterSpacing: 0.3 },
  cadnaQuoteBox:    { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(212,175,55,0.20)" },
  cadnaQuoteTxt:    { flex: 1, color: "#FFFFFF", fontWeight: "700", fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  cadnaFoundingBox: { backgroundColor: "#000", borderRadius: 14, padding: 18, marginTop: 8, borderLeftWidth: 3, borderLeftColor: C.gold },
  cadnaFoundingTxt: { color: "rgba(255,255,255,0.85)", fontWeight: "800", fontSize: 13, fontStyle: "italic", lineHeight: 22 },
  fondCard:         { width: 130, backgroundColor: "#1A1A1A", borderRadius: 20, padding: 14, alignItems: "center", gap: 10, borderWidth: 1.5, shadowColor: "#000", shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  fondCardPhoto:    { width: 76, height: 76, borderRadius: 38, backgroundColor: "#333" },
  fondCardEmpty:    { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  fondCardName:     { fontSize: 11, fontWeight: "900", color: "#FFFFFF", textAlign: "center", lineHeight: 15 },
  fondCardSee:      { fontSize: 10, color: "rgba(255,255,255,0.40)", fontWeight: "700", marginTop: -2 },
  hintTxt:          { textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: "600", marginTop: 12 },
  backRow:          { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  backTxt:          { color: C.gold, fontWeight: "800", fontSize: 14 },
  detailWrap:       { alignItems: "center", gap: 10, paddingBottom: 16 },
  detailPhoto:      { width: 120, height: 120, borderRadius: 60, marginBottom: 4 },
  detailPhotoEmpty: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", backgroundColor: C.goldDim, borderWidth: 2, marginBottom: 4 },
  detailName:       { fontSize: 20, fontWeight: "900", color: "#FFFFFF", textAlign: "center" },
  detailBadge:      { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1 },
  detailBadgeTxt:   { fontSize: 18, fontWeight: "900" },
  detailFunc:       { fontSize: 14, color: "rgba(255,255,255,0.55)", fontWeight: "700", textAlign: "center" },
  detailDivider:    { height: 1, backgroundColor: "rgba(255,255,255,0.10)", width: "100%", marginVertical: 6 },
  detailDesc:       { fontSize: 14, color: "rgba(255,255,255,0.60)", fontWeight: "600", lineHeight: 22, textAlign: "center", paddingHorizontal: 4, marginBottom: 8 },
  detailQuote:      { fontSize: 13, color: C.gold, fontWeight: "800", fontStyle: "italic", lineHeight: 20, textAlign: "left", paddingHorizontal: 12, marginBottom: 8, borderLeftWidth: 2, borderLeftColor: C.gold, paddingLeft: 14 } as any,
  detailHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  dotsRow:          { flexDirection: "row", gap: 6, alignItems: "center" },
  dot:              { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.20)" },
  dotActive:        { width: 18, height: 6, borderRadius: 3, backgroundColor: C.gold },
  photoZoomHint:    { position: "absolute", bottom: 6, right: 6, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  photoZoomTxt:     { color: "#fff", fontSize: 10, fontWeight: "700" },
  navRow:           { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)" },
  navBtn:           { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.goldDim, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.goldBd, maxWidth: "45%" },
  navBtnRight:      { marginLeft: "auto" },
  navBtnTxt:        { color: C.gold, fontWeight: "800", fontSize: 12 },
});