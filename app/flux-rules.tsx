// app/flux-rules.tsx
import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

export default function FluxRules() {
  const router = useRouter();

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Règles du Flux-Vidéo</Text>

        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={{ width: 50, height: 50, resizeMode: "contain" }}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>🎬 Publicité du Flux-Vidéo</Text>
        <Text style={styles.text}>
          Chaque vidéo publiée sur RHAZN est un **PACT du Mérite**.  
          Elle doit refléter :
        </Text>

        <View style={styles.bulletBlock}>
          <Text style={styles.bullet}>• Beauté naturelle</Text>
          <Text style={styles.bullet}>• Valeurs morales et saines</Text>
          <Text style={styles.bullet}>• Authenticité</Text>
          <Text style={styles.bullet}>• Simplicité</Text>
          <Text style={styles.bullet}>• Respect du CODE hebdomadaire</Text>
        </View>

        <Text style={styles.sectionTitle}>⏱ Durée Max</Text>
        <Text style={styles.text}>
          <Text style={styles.gold}>125 secondes max</Text> (2 minutes 05)
        </Text>

        <Text style={styles.sectionTitle}>🛑 Contenu Interdit</Text>
        <View style={styles.bulletBlock}>
          <Text style={styles.bullet}>• Violence, haine, provocation</Text>
          <Text style={styles.bullet}>• Attaques personnelles</Text>
          <Text style={styles.bullet}>• Vulgarité ou immoralité</Text>
          <Text style={styles.bullet}>• Drogues, alcool, nudité</Text>
          <Text style={styles.bullet}>• Mensonges, manipulation</Text>
          <Text style={styles.bullet}>• Toute forme de “fake life”</Text>
        </View>

        <Text style={styles.sectionTitle}>🧠 Vérification</Text>
        <Text style={styles.text}>
          Chaque Flux-Vidéo passe par :
        </Text>

        <View style={styles.bulletBlock}>
          <Text style={styles.bullet}>• IA RHAZN — conformité, qualité, morale</Text>
          <Text style={styles.bullet}>• Administration RZ — validation finale</Text>
        </View>

        <Text style={styles.note}>
          🔒 Si un doute ou suspicion de fraude apparaît,  
          la vidéo est envoyée à l'administration pour enquête.
        </Text>

        <Text style={styles.final}>
          RHAZN protège l’humain, le mérite, la vérité.  
          <Text style={styles.gold}>“La simplicité est à un pas de la perfection.”</Text>
        </Text>
      </ScrollView>

      {/* Retour */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back-circle" size={52} color="#D4AF37" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000" },
  header:{
    position:"absolute", top:40, left:20, right:20,
    flexDirection:"row", justifyContent:"space-between", alignItems:"center"
  },
  scroll:{ paddingTop:120, paddingBottom:120, paddingHorizontal:20 },
  title:{ fontSize:24, fontWeight:"800", color:"#FFD700" },
  sectionTitle:{ fontSize:18, color:"#FFD700", fontWeight:"700", marginTop:25 },
  text:{ color:"#fff", fontSize:14, marginTop:8, lineHeight:20 },
  bulletBlock:{ marginTop:10 },
  bullet:{ color:"#ddd", fontSize:14, marginBottom:5 },
  gold:{ color:"#FFD700", fontWeight:"700" },
  note:{ color:"#aaa", marginTop:20, fontSize:13, lineHeight:18, fontStyle:"italic" },
  final:{ color:"#fff", marginTop:30, textAlign:"center", fontSize:14, lineHeight:22 },
  back:{ position:"absolute", bottom:40, right:30 }
});
