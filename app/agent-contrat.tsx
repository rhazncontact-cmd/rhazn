// app/agent-contrat.tsx

import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useEffect, useRef, useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { supabase } from "../lib/supabase";

/* 🍎 Palette Apple-like */
const COLORS = {
  bg: "#FFFFFF",
  text: "#0A0A0A",
  sub: "#6E6E73",
  border: "#E5E5EA",
  gold: "#D4AF37",
  danger: "#FF3B30",
};

const WHATSAPP_NUMBER = "50947866789";

/* ===================== ARTICLE ===================== */
function Article({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.articleTitle}>
        Article {n} — {title}
      </Text>
      <Text style={styles.p}>{children}</Text>
    </View>
  );
}

/* ===================== MAIN ===================== */
export default function AgentContrat() {
  const scrollRef = useRef<ScrollView>(null);

  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - 24
    ) {
      setAccepted(true);
    }
  };

  /* ===================== ACCEPT CONTRACT ===================== */
  const acceptContract = async () => {
    if (!accepted || saving) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setErrorMsg("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      /* 1️⃣ Récupérer la demande ED ACTIVE */
      const { data: app, error } = await supabase
        .from("agent_applications")
        .select("id, first_name, last_name, email, status")
        .eq("user_uid", auth.user.id)
        .eq("status", "AWAITING_CONTRACT_SIGNATURE")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !app) {
        setErrorMsg("Aucune demande ED active trouvée.");
        return;
      }

      /* 2️⃣ Enregistrer la signature */
      const { error: signErr } = await supabase
        .from("agent_contract_acceptances")
        .insert({
          user_uid: auth.user.id,
          application_id: app.id,
          accepted_at: new Date().toISOString(),
          version: "v1.0",
        });

      if (signErr) throw signErr;

      /* 3️⃣ Mise à jour du statut */
      await supabase
        .from("agent_applications")
        .update({ status: "AWAITING_PAYMENT_PROOF" })
        .eq("id", app.id);

      /* 4️⃣ Notification utilisateur */
      await supabase.from("notifications").insert({
        user_uid: auth.user.id,
        title: "Contrat signé",
        body:
          "Contrat signé avec succès. Envoyez maintenant la preuve de paiement via WhatsApp.",
        type: "SYSTEM",
      });

      /* 5️⃣ Message WhatsApp (ID = Code ED) */
      const message = `
📌 DEMANDE D’ACCRÉDITATION ED — RHAZN

Code / ID : ${app.id}
Nom : ${app.last_name}
Prénom : ${app.first_name}
Email : ${app.email}

📎 Merci d’envoyer la preuve de paiement (photo ou PDF)
en réponse à ce message.

⚠️ Important :
Le traitement commence uniquement après réception ici.

— RHAZN / CADNA
      `.trim();

      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message
      )}`;

      Linking.openURL(url).catch(() => {});
    } catch (e: any) {
      console.log("ACCEPT CONTRACT ERROR =", e);
      setErrorMsg("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  /* ===================== UI ===================== */
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <Text style={styles.title}>Contrat Agent RHAZN (ED)</Text>
      <Text style={styles.subtitle}>
        Lecture complète obligatoire avant acceptation
      </Text>

      <ScrollView
        ref={scrollRef}
        style={styles.contract}
        contentContainerStyle={styles.contractContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Article n="1" title="Objet du contrat">
          Le présent contrat définit les conditions juridiques, économiques et
          opérationnelles selon lesquelles RHAZN accorde au signataire le statut
          d’Agent ED.
        </Article>

        <Article n="2" title="Nature de la relation">
          L’Agent agit en qualité de partenaire indépendant.
        </Article>

        <Article n="3" title="Missions">
          Distribution, promotion et valorisation des services RHAZN.
        </Article>

        <Article n="4" title="Obligations">
          Respect strict des règles et décisions CADNA.
        </Article>

        <Article n="5" title="Rémunération">
          Calcul automatique, aucun paiement externe.
        </Article>

        <Article n="6" title="Confidentialité">
          Confidentialité absolue.
        </Article>

        <Article n="7" title="Sanctions">
          Suspension ou résiliation immédiate.
        </Article>

        <Article n="2" title="Nature de la relation">
          L’Agent agit en qualité de partenaire indépendant.
        </Article>

        <Article n="3" title="Missions">
          Distribution, promotion et valorisation des services RHAZN.
        </Article>

        <Article n="4" title="Obligations">
          Respect strict des règles et décisions CADNA.
        </Article>

        <Article n="5" title="Rémunération">
          Calcul automatique, aucun paiement externe.
        </Article>

        <Article n="6" title="Confidentialité">
          Confidentialité absolue.
        </Article>

        <Article n="7" title="Sanctions">
          Suspension ou résiliation immédiate.
        </Article>

        <Article n="8" title="Acceptation numérique">
          Valeur juridique équivalente à une signature manuscrite.
        </Article>

        <Text style={styles.endNote}>Fin du contrat</Text>
      </ScrollView>

      <TouchableOpacity
        disabled={!accepted || saving}
        onPress={acceptContract}
        style={[styles.acceptBtn, (!accepted || saving) && { opacity: 0.4 }]}
      >
        <Text style={styles.acceptText}>
          {saving ? "Validation…" : "J’accepte le contrat"}
        </Text>
      </TouchableOpacity>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 22 },
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { fontSize: 13, color: COLORS.sub },
  contract: { flex: 1, marginTop: 16 },
  contractContent: { paddingBottom: 40 },
  articleTitle: { fontWeight: "900", marginBottom: 4 },
  p: { fontSize: 14, lineHeight: 22 },
  acceptBtn: {
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  acceptText: { fontWeight: "900" },
  error: {
    color: COLORS.danger,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
  },
  endNote: { textAlign: "center", marginTop: 20, color: COLORS.sub },
});
