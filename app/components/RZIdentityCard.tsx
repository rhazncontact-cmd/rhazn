import { Image, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

export function RZIdentityCard({ profile }: { profile: any }) {
  return (
    <View style={styles.card}>
      <Text style={styles.brand}>RHAZN</Text>

      <Image
        source={{ uri: profile.avatar_url }}
        style={styles.avatar}
      />

      <Text style={styles.name}>{profile.full_name}</Text>
      <Text style={styles.code}>{profile.user_code}</Text>

      <Text style={styles.badge}>
        {profile.cadna_status === "approved"
          ? "✔ Identité vérifiée CADNA"
          : "Identité en cours de validation"}
      </Text>

      {profile.is_creator && (
        <Text style={styles.creator}>Créateur RHAZN</Text>
      )}

      <View style={styles.qrBox}>
        <QRCode
          value={`https://rhazn.com/u/${profile.user_code}`}
          size={110}
        />
      </View>

      <Text style={styles.link}>
        rhazn.com/u/{profile.user_code}
      </Text>
    </View>
  );
}
