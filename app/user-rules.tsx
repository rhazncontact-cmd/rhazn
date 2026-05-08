// app/cadna/rules.tsx
// ======================================================
// RHAZN — PACT RULES (PAGE OBLIGATOIRE AVANT SOUMISSION)
// Apple-like • Noir/Or • Scroll-gate + Checkbox-gate
// ✅ Continue activé seulement si:
//    1) l’utilisateur a scrollé jusqu’en bas
//    2) a coché “J’ai lu et j’accepte”
// ======================================================

import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
    Animated,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const COLORS = {
  bg: "#000000",
  card: "#0B0B0B",
  card2: "#101010",
  border: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.72)",
  gold: "#D4AF37",
  red: "#FF453A",
  green: "#34C759",
};

function useRzToast() {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState("");
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(10)).current;

  const show = (m: string) => {
    setMsg(m);
    setVisible(true);
    opacity.setValue(0);
    ty.setValue(10);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(ty, { toValue: 10, duration: 220, useNativeDriver: true }),
        ]).start(() => setVisible(false));
      }, 1400);
    });
  };

  const Toast = () =>
    visible ? (
      <Animated.View style={[styles.toast, { opacity, transform: [{ translateY: ty }] }]}>
        <Text style={styles.toastText}>{msg}</Text>
      </Animated.View>
    ) : null;

  return { show, Toast };
}

function Quote({ children }: { children: string }) {
  return (
    <View style={styles.quoteWrap}>
      <Text style={styles.quoteText}>“{children}”</Text>
      <Text style={styles.quoteSign}>— CVSO</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}

export default function PactRulesPage() {
  const router = useRouter();
  const { show, Toast } = useRzToast();

  const [accepted, setAccepted] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const canContinue = useMemo(() => accepted && scrolledToEnd, [accepted, scrolledToEnd]);

  const onContinue = async () => {
    if (!scrolledToEnd) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      show("Descends jusqu’en bas pour terminer la lecture.");
      return;
    }
    if (!accepted) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      show("Coche l’acceptation pour continuer.");
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // ✅ Ici tu rediriges vers ta page de soumission PACT
    // (remplace l’URL selon ton app)
    router.replace("/user-publish-pact");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RHAZN — Règlements PACT</Text>
        <Text style={styles.headerSub}>
          Lecture obligatoire avant soumission • CADNA = décision binaire (Approuvé/Rejeté)
        </Text>
      </View>

      {/* CONTENT */}
      <ScrollView
  style={{ flex: 1 }}
  contentContainerStyle={{
    padding: 16,
    paddingBottom: 250, // 🔥 espace pour scroll sous le footer
  }}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 40;
          const reached =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

          if (reached && !scrolledToEnd) {
            setScrolledToEnd(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            show("Lecture terminée ✅");
          }
        }}
        scrollEventThrottle={16}
      >
        {/* PREAMBULE */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>La Vigne RHAZN</Text>
          <Text style={styles.heroText}>
            RHAZN symbolise une <Text style={{ color: COLORS.gold, fontWeight: "900" }}>Vigne</Text>.
            Une vigne se cultive, se discipline, et ne produit que du fruit de qualité.
            Publier est un <Text style={{ fontWeight: "900" }}>privilège moral</Text>.
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✔ Excellence</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✔ Pureté</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✔ Cohérence</Text>
            </View>
          </View>
        </View>

        <Section title="1) Loi de la simplicité">
          <Text style={styles.p}>
            La simplicité est proche de la perfection. Le PACT doit éviter les artifices et rester
            sobre, vrai, propre et digne.
          </Text>
          <Text style={styles.listItem}>• Présentation simple, naturelle, non trompeuse</Text>
          <Text style={styles.listItem}>• Sobriété, authenticité, vérité</Text>
          <Quote>L’artifice crie. La vérité murmure. Seuls les esprits nobles entendent le murmure.</Quote>
        </Section>

        <Section title="2) Noblesse & modestie">
          <Text style={styles.p}>
            Le PACT doit refléter la dignité et la modestie : style noble, sobre, respectueux du corps
            et du public.
          </Text>
          <Text style={styles.listItem}>• Tenue décente et raffinée</Text>
          <Text style={styles.listItem}>• Interdit : provocation, suggestion, indécence</Text>
          <Quote>Qui se présente avec noblesse impose le respect sans l’exiger.</Quote>
        </Section>

        <Section title="3) Qualité visuelle">
          <Text style={styles.p}>
            Un PACT doit être clair et propre : image nette, stable, bien éclairée, et de bonne
            qualité.
          </Text>
          <Text style={styles.listItem}>• Refus : flou, négligence, désordre volontaire</Text>
          <Text style={styles.listItem}>• Respect du temps d’autrui (TAN)</Text>
          <Quote>La clarté visuelle est déjà une morale.</Quote>
        </Section>

        <Section title="4) Pureté verbale & morale">
          <Text style={styles.p}>
            Les paroles doivent être respectueuses, constructives et éducatives. Sont interdits :
            violence, insultes, vulgarité, insinuations sexuelles, propos impurs ou dégradants.
          </Text>

          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>Règle immuable</Text>
            <Text style={styles.calloutText}>
              Dans RHAZN, l’Amour est toujours positif, bienveillant, patient, ne fait aucun mal.
              L’Amour est la vérité incontestable.
            </Text>
          </View>

          <Quote>Si tes mots blessent, ils ne viennent pas de la vérité. La vérité élève toujours.</Quote>
        </Section>

        <Section title="5) Structure d’or du PACT (obligatoire)">
          <Text style={styles.p}>
            Un PACT n’est pas un bavardage. Il doit être logique, utile et structuré :
          </Text>
          <Text style={styles.listItem}>1. Identifier un problème réel</Text>
          <Text style={styles.listItem}>2. Proposer une solution / piste / réflexion</Text>
          <Text style={styles.listItem}>3. Respecter : Intro → Transition → Développement → Conclusion</Text>

          <View style={styles.callout2}>
            <Text style={styles.calloutTitle}>Interdiction absolue</Text>
            <Text style={styles.calloutText}>
              Aucun créateur ne peut publier des contenus contradictoires. La cohérence morale est
              obligatoire.
            </Text>
          </View>

          <Quote>L’esprit contradictoire disperse. L’esprit cohérent construit.</Quote>
        </Section>

        <Section title="6) Interdiction du vide">
          <Text style={styles.p}>
            Sont refusés : contenu sans valeur, imitation stérile, distraction vide, absence de message.
            Chaque seconde doit apporter quelque chose d’utile.
          </Text>
          <Quote>Occuper le temps des autres sans valeur est une forme invisible de vol.</Quote>
        </Section>

        <Section title="7) Destin & absence de hasard">
          <Text style={styles.p}>
            Dans la Vigne RHAZN, rien n’est “au hasard”. Si le hasard existait, sa définition serait :
          </Text>
          <View style={styles.callout3}>
            <Text style={styles.calloutTextBig}>“DIEU qui se promène incognito.”</Text>
          </View>
          <Quote>Le hasard n’existe pas : seules existent des responsabilités que l’on refuse de voir.</Quote>
        </Section>

        <Section title="8) Propriété exclusive & loyauté">
          <Text style={styles.p}>
            Tout PACT publié sur RHAZN devient la propriété exclusive de RHAZN. Toute republication du
            même PACT sur une autre plateforme entraîne :
          </Text>
          <Text style={styles.listItemDanger}>• Bannissement immédiat</Text>
          <Text style={styles.listItemDanger}>• Blocage du compte</Text>
          <Text style={styles.listItemDanger}>• Sans avertissement</Text>
          <Quote>Qui plante dans la Vigne ne récolte pas ailleurs. La loyauté est la première des richesses.</Quote>
        </Section>

        <Section title="9) CADNA & ACSET (non récupérables)">
          <Text style={styles.p}>
            CADNA est un filtre moral binaire : <Text style={{ fontWeight: "900" }}>Approuvé</Text>{" "}
            ou <Text style={{ fontWeight: "900" }}>Rejeté</Text>. Aucun motif spécifique n’est fourni.
          </Text>
          <View style={styles.calloutDanger}>
            <Text style={styles.calloutTitleDanger}>ACSET</Text>
            <Text style={styles.calloutDangerText}>
              Les ACSET consommés lors d’une soumission sont définitivement perdus, même en cas de rejet.
              Aucun remboursement.
            </Text>
          </View>
          <Quote>Chaque tentative coûte : c’est le prix de la responsabilité.</Quote>
        </Section>

        {/* END MARK */}
        <View style={styles.endMark}>
          <Text style={styles.endMarkTitle}>Fin des règlements</Text>
          <Text style={styles.endMarkText}>
            Tu peux maintenant cocher l’acceptation et continuer.
          </Text>
        </View>
      </ScrollView>

      {/* FOOTER (GATE) */}
      <View style={styles.footer}>
        <Pressable
          onPress={async () => {
            setAccepted((v) => !v);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[
            styles.checkRow,
            accepted && { borderColor: COLORS.gold, backgroundColor: COLORS.card2 },
          ]}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
            {accepted ? <Text style={styles.checkboxTick}>✓</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkTitle}>J’ai lu et j’accepte les règlements PACT</Text>
            <Text style={styles.checkSub}>
              Je comprends que les ACSET consommés sont non récupérables.
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={onContinue}
          style={[
            styles.continueBtn,
            !canContinue && { opacity: 0.45 },
          ]}
        >
          <Text style={styles.continueText}>
            Continuer {scrolledToEnd ? "✅" : "↓"}
          </Text>
        </Pressable>

        <Text style={styles.footerHint}>
          {scrolledToEnd
            ? "Coche l’acceptation pour continuer."
            : "Fais défiler jusqu’en bas pour terminer la lecture."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

/* ───────── STYLES ───────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
  color: COLORS.text,
  fontWeight: "900",
  fontSize: 16,
  marginTop: 30,   // ⬅️ descend le titre (2 espaces visuels)
},

  headerSub: { marginTop: 4, color: COLORS.muted, fontWeight: "700", fontSize: 12 },

  hero: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  heroTitle: { color: COLORS.gold, fontWeight: "900", fontSize: 18 },
  heroText: { marginTop: 8, color: COLORS.text, lineHeight: 19, fontWeight: "700" },

  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  badgeText: { color: COLORS.muted, fontWeight: "900", fontSize: 12 },

  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  sectionTitle: { color: COLORS.gold, fontWeight: "900", fontSize: 15 },

  p: { color: COLORS.text, lineHeight: 19, fontWeight: "700" },
  listItem: { marginTop: 8, color: COLORS.muted, fontWeight: "800", lineHeight: 18 },
  listItemDanger: { marginTop: 8, color: COLORS.red, fontWeight: "900", lineHeight: 18 },

  quoteWrap: {
    marginTop: 14,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.gold,
    paddingLeft: 12,
  },
  quoteText: { color: COLORS.text, fontWeight: "800", lineHeight: 19 },
  quoteSign: { marginTop: 6, color: COLORS.muted, fontWeight: "900" },

  callout: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  callout2: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  callout3: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },
  calloutTextBig: { color: COLORS.gold, fontWeight: "900", fontSize: 15, textAlign: "center" },

  calloutTitle: { color: COLORS.gold, fontWeight: "900", marginBottom: 6 },
  calloutText: { color: COLORS.text, fontWeight: "800", lineHeight: 18 },

  calloutDanger: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.35)",
    backgroundColor: "rgba(255,69,58,0.08)",
  },
  calloutTitleDanger: { color: COLORS.red, fontWeight: "900", marginBottom: 6 },
  calloutDangerText: { color: COLORS.text, fontWeight: "800", lineHeight: 18 },

  endMark: {
    marginTop: 6,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card2,
    alignItems: "center",
  },
  endMarkTitle: { color: COLORS.gold, fontWeight: "900" },
  endMarkText: { marginTop: 6, color: COLORS.muted, fontWeight: "800", textAlign: "center" },

  footer: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 40,   // 🔼 MONTE de 2 espaces
  padding: 14,
  paddingBottom: 14,
  backgroundColor: COLORS.bg,
  borderTopWidth: 1,
  borderTopColor: COLORS.border,
},

  checkRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    borderColor: COLORS.gold,
    backgroundColor: "rgba(212,175,55,0.18)",
  },
  checkboxTick: { color: COLORS.gold, fontWeight: "900" },

  checkTitle: { color: COLORS.text, fontWeight: "900", fontSize: 13 },
  checkSub: { marginTop: 2, color: COLORS.muted, fontWeight: "800", fontSize: 12 },

  continueBtn: {
    marginTop: 12,
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  continueText: { color: "#000", fontWeight: "900" },

  footerHint: {
    marginTop: 8,
    textAlign: "center",
    color: COLORS.muted,
    fontWeight: "800",
    fontSize: 12,
  },

  toast: {
    position: "absolute",
    top: 58,
    alignSelf: "center",
    zIndex: 999,
    backgroundColor: "rgba(15,15,15,0.92)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  toastText: { color: COLORS.text, fontWeight: "900" },
});

