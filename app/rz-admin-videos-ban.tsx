import { StyleSheet, Text, View } from "react-native";

export default function BanVideos() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sanctions / Suppression</Text>
      <Text style={styles.text}>⚠️ Panel de sanctions en cours d’intégration.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000", padding:20 },
  title:{ color:"#FFD700", fontSize:20, marginBottom:10 },
  text:{ color:"#aaa" }
});
