import CheckBox from "expo-checkbox";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    BackHandler,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

// 🎨 PALETTE APPLE-TYPE RHAZN
const COLORS = {
  black: "#000000",
  dark: "#0E0E0E",
  white: "#FFFFFF",
  gray: "#AAAAAA",
  green: "#00C853",
  crimson: "#B00020",
  card: "#101010",
};

export default function ContractScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  // ✅ Blocage du bouton "Retour" Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [])
  );

  const showAlert = (msg: string) => {
    setAlert(msg);
    setTimeout(() => setAlert(null), 3000);
  };

  // ✅ ACCEPTATION JURIDIQUE SÉCURISÉE
  const handleAccept = async () => {
    if (loading) return;

    if (!checked) {
      showAlert("Veuillez cocher la case pour accepter le contrat.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showAlert("Session expirée. Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("uid")
        .eq("uid", user.id)
        .maybeSingle();

      if (!existingUser) {
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            uid: user.id,
            email: user.email,
            tan: 0,
            role: "user",
            contract_accepted: false,
          });

        if (insertError) {
          showAlert("Erreur d'initialisation du compte.");
          setLoading(false);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          contract_accepted: true,
          contract_accepted_at: new Date().toISOString(),
        })
        .eq("uid", user.id);

      if (updateError) {
        showAlert("Impossible d’enregistrer votre acceptation.");
        setLoading(false);
        return;
      }

      showAlert("Contrat accepté avec succès.");

      setTimeout(() => {
        router.replace("/flux-intro");
      }, 900);
    } catch {
      showAlert("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.full}>
      {/* ✅ EN-TÊTE FLOTTANT */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conditions Générales d’Utilisation – RHAZN</Text>
        <Text style={styles.headerLogo}>RHAZN</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ========================= */}
        {/* ✅ TEXTE JURIDIQUE FINAL */}
        {/* ========================= */}

        <Text style={styles.articleTitle}>ARTICLE 1 — ACCEPTATION OBLIGATOIRE</Text>
        <Text style={styles.articleText}>
          L’accès, l’inscription et l’utilisation de la plateforme RHAZN sont
          strictement subordonnés à l’acceptation expresse du présent contrat.
          Toute utilisation sans acceptation est juridiquement nulle et non
          autorisée.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 2 — NATURE DES ACSET</Text>
        <Text style={styles.articleText}>
          Les ACSET sont des unités internes de valeur propres à RHAZN. Ils sont
          strictement non remboursables, non convertibles en monnaie légale et
          n’ont aucune valeur fiduciaire externe. Toute utilisation est
          définitive.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 3 — MONÉTISATION AUTOMATIQUE</Text>
        <Text style={styles.articleText}>
          Tout compte créé sur RHAZN est automatiquement intégré dans le système
          économique interne. Des flux de valeur peuvent être générés sans
          intervention directe de l’utilisateur.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 4 — CONTENUS & CONTRÔLE (CADNA)</Text>
        <Text style={styles.articleText}>
          Tous les contenus publiés sur RHAZN sont soumis à un contrôle
          automatisé et humain. RHAZN se réserve le droit de refuser, modifier ou
          supprimer tout contenu sans justification préalable.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 5 — EXCLUSIVITÉ DES ŒUVRES</Text>
        <Text style={styles.articleText}>
          Toute œuvre publiée sur RHAZN devient une œuvre sous licence
          d’exploitation exclusive de la plateforme. Toute diffusion externe
          non autorisée est strictement interdite.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 6 — STOCKAGE & HÉBERGEMENT</Text>
        <Text style={styles.articleText}>
          Tous les contenus sont stockés sur l’infrastructure RHAZN Studio.
          RHAZN n’assume aucune obligation de restitution des données en cas de
          suppression de compte.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 7 — TRANSACTIONS</Text>
        <Text style={styles.articleText}>
          Toutes les transactions sont exclusivement opérées par des Agents
          RHAZN officiellement reconnus (ED). Toute tentative de transaction
          externe est strictement prohibée.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 8 — RESPONSABILITÉ UTILISATEUR</Text>
        <Text style={styles.articleText}>
          L’utilisateur est seul responsable des données qu’il fournit, des
          contenus qu’il publie et des conséquences juridiques de ses actions.
          RHAZN décline toute responsabilité en cas de préjudice lié aux
          contenus.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 9 — ABSENCE DE PROPRIÉTÉ DU COMPTE</Text>
        <Text style={styles.articleText}>
          Le compte utilisateur constitue une licence d’accès révocable à tout
          moment. Aucun droit de propriété n’est reconnu à l’utilisateur sur son
          compte.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 10 — ABSENCE DE REMBOURSEMENT</Text>
        <Text style={styles.articleText}>
          Aucun remboursement, total ou partiel, n’est garanti, quelle que soit
          la cause invoquée.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 11 — LIMITATION DE RESPONSABILITÉ</Text>
        <Text style={styles.articleText}>
          RHAZN n’est ni une banque, ni un établissement financier, ni un
          prestataire d’investissement. L’utilisateur agit sous sa seule et
          entière responsabilité.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 12 — SUSPENSION & RÉSILIATION</Text>
        <Text style={styles.articleText}>
          RHAZN se réserve le droit de suspendre ou résilier tout compte sans
          préavis en cas de violation des présentes conditions.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 13 — DROIT APPLICABLE</Text>
        <Text style={styles.articleText}>
          Le présent contrat est soumis au droit privé désigné unilatéralement
          par RHAZN. Tout litige relève de la compétence exclusive définie par
          RHAZN.
        </Text>

        {/* ✅ CHECKBOX JURIDIQUE */}
        <View style={styles.checkboxRow}>
          <CheckBox
            value={checked}
            onValueChange={setChecked}
            color={checked ? COLORS.green : undefined}
          />
          <Text style={styles.checkboxText}>
            Je reconnais expressément avoir lu, compris et accepté, sans réserve,
            l’intégralité des Conditions Générales d’Utilisation de RHAZN.
          </Text>
        </View>
      </ScrollView>

      {/* ✅ NOTIFICATION PREMIUM */}
      {alert && (
        <View style={styles.alertCard}>
          <Text style={styles.alertText}>{alert}</Text>
        </View>
      )}

      {/* ✅ BOUTON FLOTTANT APPLE-TYPE */}
      <View style={styles.footer}>
        {loading ? (
          <LoaderRhazn />
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: checked ? COLORS.green : COLORS.dark },
            ]}
            onPress={checked ? handleAccept : () => router.replace("/legal/signature")}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {checked ? "REJOINDRE L’ÉCOSYSTÈME RHAZN" : "RENONCER À L’INSCRIPTION"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: COLORS.black },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: COLORS.dark,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
  },

  headerLogo: {
    color: COLORS.white,
    fontWeight: "800",
  },

  content: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 160,
  },

  articleTitle: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 15,
    marginTop: 22,
    marginBottom: 6,
  },

  articleText: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 22,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
  },

  checkboxText: {
    color: COLORS.gray,
    marginLeft: 12,
    flex: 1,
  },

  alertCard: {
    position: "absolute",
    bottom: 130,
    left: 20,
    right: 20,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },

  alertText: {
    color: COLORS.white,
    fontSize: 13,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },

  button: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    elevation: 8,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 15,
  },
});
