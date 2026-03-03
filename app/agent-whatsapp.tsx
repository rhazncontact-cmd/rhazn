import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const WHATSAPP_NUMBER = "+50946866789";

export default function AgentWhatsapp() {
  const message = `
Bonjour CADNA,

Je vous transmets ma fiche de dépôt (PDF) dans le cadre de ma demande Agent RHAZN (ED).

Merci pour l’analyse de mon dossier.
`;

  const openWhatsapp = async () => {
    await Haptics.selectionAsync();
    const url = `https://wa.me/50947866789?text=${encodeURIComponent(message)}`;
    await Linking.openURL(url);
  };

  const copyNumber = async () => {
    await Clipboard.setStringAsync(WHATSAPP_NUMBER);
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finalisation du dossier ED</Text>

      <Text style={styles.text}>
        Pour finaliser votre demande, veuillez envoyer votre{" "}
        <Text style={styles.bold}>fiche de dépôt (PDF)</Text> par WhatsApp au
        numéro officiel RHAZN.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>WhatsApp RHAZN</Text>
        <Text style={styles.number}>{WHATSAPP_NUMBER}</Text>

        <TouchableOpacity style={styles.copy} onPress={copyNumber}>
          <Text style={styles.copyText}>Copier le numéro</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.open} onPress={openWhatsapp}>
        <Text style={styles.openText}>Ouvrir WhatsApp</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        📎 Une fois WhatsApp ouvert, veuillez joindre le PDF de votre fiche de
        dépôt avant d’envoyer le message.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 22,
    paddingTop: 90,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 14,
  },
  text: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  bold: { fontWeight: "900" },

  card: {
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
  },
  label: { fontSize: 12, color: "#6E6E73" },
  number: {
    fontSize: 20,
    fontWeight: "900",
    marginVertical: 8,
  },
  copy: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#F5F5F7",
  },
  copyText: { fontWeight: "800" },

  open: {
    marginTop: 24,
    backgroundColor: "#25D366",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },
  openText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
  },

  note: {
    marginTop: 16,
    fontSize: 12,
    color: "#6E6E73",
    textAlign: "center",
  },
});
