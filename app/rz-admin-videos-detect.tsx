import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function RZAdminDetectionIllicite() {
  const router = useRouter();

  const radarRotation = useRef(new Animated.Value(0)).current;
  const dotBlink = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(radarRotation, { toValue: 1, duration: 4000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotBlink, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(dotBlink, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotation = radarRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.statusBox}>
            <Animated.View style={[styles.dot,{ opacity: dotBlink }]} />
            <Text style={styles.statusTxt}>IA ACTIVE</Text>
          </View>
        </View>

        <Text style={styles.title}>Détection Contenu Interdit</Text>
        <Text style={styles.subtitle}>Protection Automatique par IA</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal:20 }}>

        {/* SHIELD */}
        <View style={styles.shieldCard}>
          <View style={styles.shieldWrap}>
            <Animated.View style={[styles.radarScan,{ transform:[{ rotate: rotation }] }]} />
            <Text style={styles.shieldEmoji}>🛡️</Text>
          </View>

          <Text style={styles.shieldTitle}>Moteur IA Opérationnel</Text>
          <Text style={styles.shieldText}>
            Analyse en temps réel de tous les contenus{"\n"}
            Détection instantanée des violations
          </Text>
        </View>

        {/* CATEGORIES */}
        <View style={styles.grid}>
          {renderCategory("⚠️","Violence","3","#ef4444")}
          {renderCategory("🔞","Adulte","2","#ec4899")}
          {renderCategory("💊","Drogues","0","#f59e0b")}
          {renderCategory("🔫","Armes","0","#6366f1")}
          {renderCategory("🚫","Haine","1","#a855f7")}
          {renderCategory("📢","Spam","0","#14b8a6")}
        </View>

        {/* ALERTS */}
        <Text style={styles.section}>🚨 Alertes Récentes</Text>

        {renderAlert("⚠️","Contenu violent détecté","Il y a 5 minutes","📹 User782","94%","Bloqué automatiquement")}
        {renderAlert("🔞","Contenu adulte","Il y a 23 minutes","📹 User456","98%","Supprimé + Compte suspendu")}
        {renderAlert("🚫","Discours haineux","Il y a 1 heure","📹 User293","87%","En révision manuelle")}

        {/* ENGINE */}
        <View style={styles.engineCard}>
          <Text style={styles.engineTitle}>🤖 Moteur GPT-Vision</Text>

          <View style={styles.engineStats}>
            {renderEngineStat("1 247","Analysés")}
            {renderEngineStat("6","Bloqués")}
            {renderEngineStat("99.5%","Précision")}
          </View>
        </View>

        {/* BUTTON */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => alert("📊 Rapport complet en préparation…")}>
          <Text style={styles.actionTxt}>📊 Rapport Complet de Sécurité</Text>
        </TouchableOpacity>

        <View style={{ height:50 }} />
      </ScrollView>
    </View>
  );
}

/* RENDER HELPERS */
function renderCategory(icon,label,count,color) {
  return (
    <View style={[styles.catCard,{ borderTopColor:color }]}>
      <Text style={styles.catIcon}>{icon}</Text>
      <Text style={styles.catLabel}>{label}</Text>
      <Text style={[styles.catCount,{ color: count!=="0"?color:"#666" }]}>{count}</Text>
    </View>
  );
}

function renderAlert(icon,title,time,user,confidence,action) {
  return (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={styles.alertIconBox}><Text style={{ fontSize:20 }}>{icon}</Text></View>
        <View style={{ flex:1 }}>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertTime}>{time}</Text>
        </View>
        <View style={styles.alertBadge}><Text style={styles.badgeTxt}>HAUTE</Text></View>
      </View>

      <Text style={styles.alertDetails}>
        {user}{"\n"}
        🔍 Confiance IA: {confidence}{"\n"}
        ✅ {action}
      </Text>
    </View>
  );
}

function renderEngineStat(value,label) {
  return (
    <View style={styles.engineItem}>
      <Text style={styles.engineVal}>{value}</Text>
      <Text style={styles.engineLbl}>{label}</Text>
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000" },
  header:{ paddingTop:60,paddingBottom:22,paddingHorizontal:20, backgroundColor:"rgba(239,68,68,0.09)" },
  rowBetween:{ flexDirection:"row",justifyContent:"space-between",alignItems:"center" },
  back:{ width:40,height:40,borderRadius:12,borderWidth:1,borderColor:"#ef4444aa",justifyContent:"center",alignItems:"center" },
  backIcon:{ color:"#ef4444",fontSize:20 },
  statusBox:{ flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"#4ade8088",backgroundColor:"#4ade8033",paddingHorizontal:12,paddingVertical:6,borderRadius:20 },
  statusTxt:{ fontSize:12,color:"#4ade80",fontWeight:"700" },
  dot:{ width:8,height:8,borderRadius:50,backgroundColor:"#4ade80",marginRight:6 },

  title:{ color:"#ef4444",fontSize:22,fontWeight:"700" },
  subtitle:{ color:"#888",fontSize:12 },

  shieldCard:{ marginTop:16, marginBottom:20, backgroundColor:"#111",borderRadius:20,borderColor:"#ef444455",borderWidth:1,paddingVertical:35,alignItems:"center" },
  shieldWrap:{ width:120,height:120,justifyContent:"center",alignItems:"center" },
  radarScan:{ position:"absolute",width:200,height:200,borderWidth:2,borderColor:"#ef444433",borderRadius:200 },
  shieldEmoji:{ fontSize:60 },
  shieldTitle:{ color:"#ef4444",fontWeight:"700",fontSize:17,marginTop:8 },
  shieldText:{ color:"#aaa",fontSize:13,textAlign:"center",marginTop:4,lineHeight:19 },

  grid:{ flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",marginBottom:22 },
  catCard:{ width:"48%",backgroundColor:"#111",borderRadius:16,borderWidth:1,borderColor:"#333",padding:18 },
  catIcon:{ fontSize:30,marginBottom:6 },
  catLabel:{ color:"#fff",fontSize:13,fontWeight:"600" },
  catCount:{ fontSize:22,fontWeight:"700" },

  section:{ color:"#ef4444",fontWeight:"700",fontSize:16,marginBottom:12 },

  alertCard:{ backgroundColor:"#150000",borderColor:"#ef444455",borderWidth:1,borderRadius:16,padding:14,marginBottom:14 },
  alertHeader:{ flexDirection:"row",alignItems:"center",marginBottom:10 },
  alertIconBox:{ width:40,height:40,borderRadius:10,borderWidth:1,borderColor:"#ef4444aa",justifyContent:"center",alignItems:"center",backgroundColor:"#ef444422" },
  alertTitle:{ color:"#fff",fontWeight:"600" },
  alertTime:{ color:"#777",fontSize:11 },
  alertBadge:{ borderWidth:1,borderColor:"#ef4444aa",backgroundColor:"#ef444444",paddingHorizontal:8,paddingVertical:4,borderRadius:6 },
  badgeTxt:{ color:"#ef4444",fontSize:10,fontWeight:"800" },
  alertDetails:{ color:"#bbb",fontSize:13,marginTop:6,lineHeight:19 },

  engineCard:{ backgroundColor:"#0a0a15",borderWidth:1,borderColor:"#2563eb55",borderRadius:16,padding:16,marginBottom:18 },
  engineTitle:{ fontWeight:"700",fontSize:16,color:"#3b82f6",marginBottom:12 },
  engineStats:{ flexDirection:"row",justifyContent:"space-between" },
  engineItem:{ width:"32%",backgroundColor:"#00000055",paddingVertical:12,borderRadius:10,alignItems:"center" },
  engineVal:{ color:"#3b82f6",fontSize:20,fontWeight:"700" },
  engineLbl:{ color:"#888",fontSize:10 },

  actionBtn:{ marginTop:8,padding:18,borderRadius:14,backgroundColor:"#ef4444",alignItems:"center" },
  actionTxt:{ color:"#fff",fontWeight:"700" },
});
