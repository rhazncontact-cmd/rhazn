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

  // ✅ Blocage du bouton retour Android
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

  // ============================================================================
  // ✅ ACCEPTATION JURIDIQUE FINALE — 100 % CONFORME `public.users`
  // ============================================================================
  const handleAccept = async () => {
    if (loading) return;

    if (!checked) {
      showAlert("Veuillez cocher la case pour accepter le contrat.");
      return;
    }

    setLoading(true);

    try {
      // ✅ 1. Session Auth obligatoire
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showAlert("Session expirée. Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }

      // ✅ 2. Vérification utilisateur existant (RLS SAFE)
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("uid")
        .eq("uid", user.id)
        .maybeSingle();

      if (fetchError || !existingUser) {
        console.log("FETCH_USER_ERROR:", fetchError);
        showAlert("Compte introuvable. Réessayez.");
        setLoading(false);
        return;
      }

      // ✅ 3. UPDATE CONTRAT — NOMS DE COLONNES EXACTS
      const { error: updateError } = await supabase
        .from("users")
        .update({
          contract_accepted: true,
          contract_accepted_at: new Date().toISOString(),
        })
        .eq("uid", user.id);

      if (updateError) {
        console.log("CONTRACT_UPDATE_ERROR:", updateError);
        showAlert("Impossible d’enregistrer votre acceptation.");
        setLoading(false);
        return;
      }

      showAlert("Contrat accepté avec succès.");

      // ✅ 4. Redirection vers l’étape suivante
      setTimeout(() => {
        router.replace("/legal/signature");
      }, 900);
    } catch (e) {
      console.log("CONTRACT_FATAL:", e);
      showAlert("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefuse = () => {
    router.replace("/auth/login");
  };

  return (
    <View style={styles.full}>
      {/* ✅ EN-TÊTE FLOTTANT */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Conditions Générales d’Utilisation – RHAZN
        </Text>
        <Text style={styles.headerLogo}>RHAZN</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ========================= */}
        {/* ✅ TEXTE JURIDIQUE FINAL */}
        {/* ========================= */}

        <Text style={styles.articleTitle}>
          ARTICLE 1 — ACCEPTATION OBLIGATOIRE
        </Text>
        <Text style={styles.articleText}>
          L’accès, l’inscription et l’utilisation de la plateforme RHAZN sont
          strictement subordonnés à l’acceptation expresse du présent contrat.
          Toute utilisation sans acceptation est juridiquement nulle et non
          autorisée.
        </Text>

        <Text style={styles.articleTitle}>
          ARTICLE 2 — NATURE DES ACSET
        </Text>
        <Text style={styles.articleText}>
          Les ACSET sont des unités internes de valeur propres à RHAZN. Ils sont
          strictement non remboursables, non convertibles en monnaie légale et
          n’ont aucune valeur fiduciaire externe.
        </Text>

        <Text style={styles.articleTitle}>
          ARTICLE 3 — MONÉTISATION AUTOMATIQUE
        </Text>
        <Text style={styles.articleText}>
          Tout compte créé sur RHAZN est automatiquement intégré dans le système
          économique interne. Des flux de valeur peuvent être générés sans
          intervention directe de l’utilisateur.
        </Text>

        <Text style={styles.articleTitle}>
          ARTICLE 4 — CONTENUS & CONTRÔLE
        </Text>
        <Text style={styles.articleText}>
          Tous les contenus publiés sur RHAZN sont soumis à contrôle automatisé
          et humain. RHAZN se réserve le droit de refuser, modifier ou supprimer
          tout contenu sans justification préalable.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 5 — EXCLUSIVITÉ</Text>
        <Text style={styles.articleText}>
          Toute œuvre publiée sur RHAZN est exploitée sous licence exclusive de
          la plateforme. Toute diffusion externe non autorisée est strictement
          interdite.
        </Text>

        {/* ✅ CHECKBOX JURIDIQUE */}
        <View style={styles.checkboxRow}>
          <CheckBox
            value={checked}
            onValueChange={setChecked}
            color={checked ? COLORS.green : undefined}
          />
          <Text style={styles.checkboxText}>
            Je reconnais avoir lu, compris et accepté, sans réserve, les
            Conditions Générales d’Utilisation de RHAZN.
          </Text>
        </View>
      </ScrollView>

      {/* ✅ NOTIFICATION */}
      {alert && (
        <View style={styles.alertCard}>
          <Text style={styles.alertText}>{alert}</Text>
        </View>
      )}

      {/* ✅ BOUTON FINAL */}
      <View style={styles.footer}>
        {loading ? (
          <LoaderRhazn />
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: checked ? COLORS.green : COLORS.dark },
              ]}
              onPress={checked ? handleAccept : handleRefuse}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>
                {checked ? "REJOINDRE RHAZN" : "REFUSER ET QUITTER"}
              </Text>
            </TouchableOpacity>
          </>
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
    fontSize: 17,
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
