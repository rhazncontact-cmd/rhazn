import { Feather, Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, BackHandler, Easing, PanResponder, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WithdrawTAN() {
  const router = useRouter();

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: ["#D4AF37", "#FFF3A1"] });

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15,
    onPanResponderMove: (_, g) => {
      if (g.dx < -80) router.back();
      if (g.dy < -80) BackHandler.exitApp();
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-circle" size={46} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={styles.title}>Retrait TAN</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 140, alignItems: "center", paddingHorizontal: 20 }}>
        <Animated.Text style={[styles.iconGlow, { color: glowColor }]}>
          🏦
        </Animated.Text>

        <Text style={styles.main}>
          Retrait via <Text style={{ color: "#FFD700" }}>Agent RZ</Text>
        </Text>

        <Text style={styles.info}>
          ✅ Système sécurisé  
          ✅ Validation par Agent RZ agréé  
          ⏳ Fonction active au lancement
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/agents")}
          style={styles.button}
        >
          <Feather name="map-pin" size={22} color="#000" />
          <Text style={styles.buttonText}>Trouver un Agent RZ</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000" },
  header:{
    position:"absolute", top:20, left:0, right:0,
    paddingTop:60, paddingHorizontal:20, paddingBottom:10,
    flexDirection:"row", justifyContent:"space-between", alignItems:"center"
  },
  title:{ fontSize:26, fontWeight:"700", color:"#D4AF37" },
  iconGlow:{ fontSize:72, fontWeight:"900", marginBottom:20 },
  main:{ color:"#FFD700", fontSize:22, fontWeight:"700", textAlign:"center" },
  info:{
    color:"#bbb", fontSize:14, textAlign:"center",
    marginTop:10, lineHeight:20
  },
  button:{
    flexDirection:"row", alignItems:"center", backgroundColor:"#D4AF37",
    paddingVertical:14, paddingHorizontal:26, borderRadius:12, marginTop:30
  },
  buttonText:{ fontSize:16, fontWeight:"700", marginLeft:8, color:"#000" }
});
