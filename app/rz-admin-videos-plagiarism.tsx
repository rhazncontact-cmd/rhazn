import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function RZAdminAntiPlagiat() {
  const router = useRouter();

  const [progress, setProgress] = useState(85);
  const [scanning, setScanning] = useState(true);

  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const startScan = () => {
    setScanning(true);
    setProgress(0);
    let count = 0;

    const timer = setInterval(() => {
      count += Math.random() * 15;
      if (count >= 100) {
        count = 85;
        clearInterval(timer);
        setScanning(false);
      }
      setProgress(count);
    }, 500);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.row}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.icon}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanBtn} onPress={startScan}>
            <Text style={styles.scanTxt}>🔍 Nouveau Scan</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Anti-Plagiat & Originalité</Text>
        <Text style={styles.subtitle}>Détection IA de similitudes</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ padding:20 }}>

        {/* Scan Animation */}
        <View style={styles.scanBox}>
          <Text style={styles.scanIcon}>🔍</Text>
          <Text style={styles.scanTitle}>{scanning ? "Analyse en cours..." : "Analyse terminée"}</Text>
          <Text style={styles.scanText}>
            Intelligence artificielle RHAZN Vision±{"\n"}Comparaison avec 1.2M contenus
          </Text>
          {scanning && <View style={styles.loader} />}
        </View>

        {/* Stats */}
        <View style={styles.grid}>
          <Stat label="Contenus sûrs" value="892" icon="✅" color="#4ade80" />
          <Stat label="Suspects" value="23" icon="⚠️" color="#fbbf24" />
          <Stat label="Bloqués" value="5" icon="🚫" color="#ef4444" />
          <Stat label="Précision IA" value="98.5%" icon="📊" color="#3b82f6" />
        </View>

        <Text style={styles.section}>🎯 Détections Récentes</Text>

        {/* Detection list */}
        <Detect user="PACT_Vanessa_#1247" type="Vidéo" time="2 min" length="45s" score="2% similaire" level="good" />
        <Detect user="PACT_User892_#1246" type="Audio" time="15 min" length="38s" score="65% similaire" level="warn" />
        <Detect user="PACT_User445_#1245" type="Vidéo" time="1h" length="52s" score="92% copie" level="bad" />

        {/* AI details */}
        <View style={styles.aiCard}>
          <View style={styles.aiRow}>
            <View style={styles.aiIcon}><Text style={{ fontSize:18 }}>🤖</Text></View>
            <Text style={styles.aiTitle}>Analyse IA RHAZN Vision</Text>
          </View>

          <Text style={styles.aiText}>
            Analyse : empreinte audio + signature visuelle + mouvements + métadonnées
          </Text>

          <Text style={styles.aiMeta}>
            Base scannée : <Text style={{ color:"#fff" }}>1.2M contenus</Text>
          </Text>

          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  transform: [
                    {
                      translateX: shimmerAnim.interpolate({
                        inputRange:[0,1],
                        outputRange:[-50, 50]
                      })
                    }
                  ]
                }
              ]}
            />
          </View>
        </View>

        {/* Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => alert("📄 Rapport complet bientôt disponible 🚀")}>
          <Text style={styles.actionTxt}>📄 Voir Rapport Complet</Text>
        </TouchableOpacity>

        <View style={{ height:40 }} />
      </ScrollView>
    </View>
  );
}

/* COMPONENTS */

const Stat = ({ label, value, icon, color }) => (
  <View style={[styles.statBox, { borderTopColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Detect = ({ user, type, time, length, score, level }) => {
  const colors = {
    good: "#4ade80",
    warn: "#fbbf24",
    bad: "#ef4444",
  };

  return (
    <View style={styles.detectRow}>
      <View style={[styles.detectTag, { borderColor: colors[level], backgroundColor: colors[level] + "33" }]}>
        <Text style={{ color: colors[level] }}>{level === "good" ? "✓" : level === "warn" ? "⚠" : "✗"}</Text>
      </View>

      <View style={{ flex:1 }}>
        <Text style={styles.detectUser}>{user}</Text>
        <Text style={styles.detectMeta}>🎬 {type} · {length} · ⏱ {time}</Text>
      </View>

      <Text style={[styles.detectScore, { color: colors[level] }]}>{score}</Text>
    </View>
  );
};

/* STYLES */
const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000" },
  header:{ paddingTop:60,paddingBottom:18,paddingHorizontal:20,backgroundColor:"rgba(255,215,0,0.08)" },
  row:{ flexDirection:"row",justifyContent:"space-between",marginBottom:12 },
  back:{ width:40,height:40,borderRadius:12,borderColor:"#FFD70099",borderWidth:1,justifyContent:"center",alignItems:"center" },
  icon:{ color:"#FFD700",fontSize:20 },
  scanBtn:{ paddingHorizontal:18,paddingVertical:8,borderRadius:10,backgroundColor:"#FFD700" },
  scanTxt:{ fontWeight:"700",color:"#000" },
  title:{ color:"#FFD700",fontSize:20,fontWeight:"700" },
  subtitle:{ color:"#888",fontSize:12 },

  scanBox:{ borderWidth:1,borderColor:"#333",backgroundColor:"#111",borderRadius:20,padding:32,alignItems:"center",marginBottom:20 },
  scanIcon:{ fontSize:70,opacity:0.85 },
  scanTitle:{ color:"#FFD700",fontSize:17,fontWeight:"700",marginTop:10 },
  scanText:{ textAlign:"center",color:"#aaa",fontSize:13,marginBottom:20 },
  loader:{ width:45,height:45,borderRadius:50,borderWidth:4,borderColor:"#FFD70022",borderTopColor:"#FFD700",marginTop:8, alignSelf:"center" },

  grid:{ flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",marginBottom:22 },
  statBox:{ width:"48%",backgroundColor:"#111",borderRadius:16,padding:16,borderWidth:1,borderColor:"#333" },
  statIcon:{ fontSize:30,marginBottom:6 },
  statValue:{ color:"#fff",fontSize:24,fontWeight:"700" },
  statLabel:{ color:"#777",fontSize:11 },

  section:{ fontSize:16,color:"#FFD700",fontWeight:"700",marginBottom:14 },

  detectRow:{ flexDirection:"row",alignItems:"center",padding:14,borderRadius:14,backgroundColor:"#111",borderWidth:1,borderColor:"#222",marginBottom:10 },
  detectTag:{ width:40,height:40,borderRadius:10,justifyContent:"center",alignItems:"center",borderWidth:2,marginRight:12 },
  detectUser:{ color:"#fff",fontWeight:"600",marginBottom:2 },
  detectMeta:{ color:"#aaa",fontSize:11 },
  detectScore:{ fontWeight:"700",fontSize:12 },

  aiCard:{ backgroundColor:"#0a0a15",padding:18,borderRadius:16,borderColor:"#2563eb88",borderWidth:1,marginBottom:20 },
  aiRow:{ flexDirection:"row",alignItems:"center",marginBottom:12 },
  aiIcon:{ width:38,height:38,borderRadius:8,backgroundColor:"#2563eb",justifyContent:"center",alignItems:"center" },
  aiTitle:{ fontSize:16,color:"#3b82f6",fontWeight:"700",marginLeft:10 },
  aiText:{ color:"#ccc",fontSize:13,lineHeight:18 },
  aiMeta:{ color:"#888",fontSize:11,marginTop:10,marginBottom:4 },
  progressBar:{ height:8,backgroundColor:"#1a1a2a",borderRadius:8,overflow:"hidden" },
  progressFill:{ height:"100%",backgroundColor:"#2563eb" },

  actionBtn:{ marginVertical:18,padding:18,borderRadius:14,backgroundColor:"#FFD700",alignItems:"center" },
  actionTxt:{ fontWeight:"700",color:"#000" },
});
