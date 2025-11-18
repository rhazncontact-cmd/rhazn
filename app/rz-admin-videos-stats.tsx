import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

export default function RZAdminVideoStats() {
  const router = useRouter();

  // rotation refresh btn
  const rotate = useRef(new Animated.Value(0)).current;

  const startRotate = () => {
    Animated.timing(rotate, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start(() => rotate.setValue(0));
  };

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });

  // progress bars animation
  const [bars, setBars] = useState([95, 78, 60, 45]);

  const barAnim = bars.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    barAnim.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: bars[i],
        duration: 800,
        delay: i * 250,
        useNativeDriver: false
      }).start();
    });
  }, []);

  const days = [
    { label: "Lun", value: 80 },
    { label: "Mar", value: 65 },
    { label: "Mer", value: 90 },
    { label: "Jeu", value: 75 },
    { label: "Ven", value: 100 },
    { label: "Sam", value: 55 },
    { label: "Dim", value: 45 },
  ];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <TouchableOpacity
              style={styles.refresh}
              onPress={() => startRotate()}
            >
              <Text style={{ fontSize: 18, color: "#4ADE80" }}>🔄</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={styles.headerTitle}>Statistiques Vidéos</Text>
        <Text style={styles.headerSub}>
          Dernière mise à jour: <Text style={styles.pulse}>●</Text> En temps réel
        </Text>
      </View>

      {/* CONTENT */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* OVERVIEW CARDS */}
        <View style={styles.grid}>
          <StatsCard icon="🎬" val="1,247" label="Total PACT" trend="+12%" trendColor="#4ADE80" />
          <StatsCard icon="✅" val="892" label="Validés" trend="+8%" trendColor="#4ADE80" />
          <StatsCard icon="👁️" val="45.2K" label="Vues Totales" trend="+15%" trendColor="#4ADE80" />
          <StatsCard icon="⏱️" val="2.8M" label="TAN Générés" trend="+23%" trendColor="#4ADE80" />
        </View>

        {/* PERFORMANCE CHART */}
        <Text style={styles.section}>📊 Performance Hebdomadaire</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vidéos publiées par jour</Text>
          <View style={styles.chartRow}>
            {days.map((d, idx) => (
              <View key={idx} style={styles.barWrap}>
                <Animated.View style={[styles.bar, { height: `${d.value}%` }]} />
                <Text style={styles.barLabel}>{d.label}</Text>
                <Text style={styles.barValue}>{Math.floor(d.value * 0.6)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* TOP CREATORS */}
        <Text style={styles.section}>👑 Top Créateurs (QOB)</Text>

        <View style={styles.card}>
          {["Vanessalurbina","Emole Fuea","Andren Neris","TerenzoPhoto"].map((name, i) => (
            <View key={i} style={{ marginBottom:18 }}>
              <View style={styles.progRow}>
                <Text style={styles.progLabel}>{["🥇","🥈","🥉","4️⃣"][i]} {name}</Text>
                <Text style={styles.progValue}>
                  {["12.5K","9.8K","7.2K","5.4K"][i]} QOB
                </Text>
              </View>
              <View style={styles.progBG}>
                <Animated.View
                  style={[
                    styles.progFill,
                    {
                      width: barAnim[i].interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", bars[i] + "%"],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* TIMELINE */}
        <Text style={styles.section}>📅 Activité Récente</Text>
        <View style={styles.card}>
          {[
            "52 nouvelles vidéos validées — Aujourd'hui, 14:32",
            "Challenge du mois lancé — Hier, 09:15",
            "3 créateurs certifiés — Il y a 2 jours",
            "Pic d'engagement: +150% — Il y a 3 jours"
          ].map((e, i) => (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.dot}/>
              <Text style={styles.timelineTxt}>{e}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const StatsCard = ({ icon, val, label, trend, trendColor }) => (
  <View style={styles.overCard}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.overVal}>{val}</Text>
    <Text style={styles.overLabel}>{label}</Text>
    <Text style={[styles.overTrend,{color:trendColor}]}>{trend}</Text>
  </View>
);

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000" },
  header:{
    paddingTop:60, paddingHorizontal:20, paddingBottom:20,
    backgroundColor:"rgba(255,215,0,.08)", borderBottomWidth:1, borderBottomColor:"#222"
  },
  headerTop:{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:10 },
  back:{ width:40, height:40, borderWidth:1, borderColor:"#FFD70088", borderRadius:12, justifyContent:"center", alignItems:"center" },
  backTxt:{ color:"#FFD700", fontSize:20 },
  refresh:{ width:40, height:40, borderWidth:1, borderColor:"#4ADE8088", borderRadius:12, justifyContent:"center", alignItems:"center" },

  headerTitle:{ color:"#FFD700", fontSize:22, fontWeight:"700" },
  headerSub:{ color:"#888", fontSize:12 },
  pulse:{ color:"#4ADE80", fontSize:14 },

  scroll:{ padding:20 },
  section:{ color:"#FFD700", fontSize:16, fontWeight:"700", marginBottom:10 },

  grid:{ flexDirection:"row", flexWrap:"wrap", gap:12, marginBottom:20 },
  overCard:{ width:"47%", backgroundColor:"#111", borderWidth:1, borderColor:"#333", padding:16, borderRadius:14 },
  icon:{ fontSize:26, marginBottom:8 },
  overVal:{ color:"#fff", fontSize:24, fontWeight:"700" },
  overLabel:{ color:"#888", fontSize:11, marginTop:2, marginBottom:8 },
  overTrend:{ fontSize:12, fontWeight:"700" },

  card:{ backgroundColor:"#111", padding:16, borderRadius:16, borderWidth:1, borderColor:"#222", marginBottom:20 },

  chartRow:{ flexDirection:"row", justifyContent:"space-between", alignItems:"flex-end", height:180 },
  barWrap:{ alignItems:"center", flex:1 },
  bar:{ width:20, borderRadius:6, backgroundColor:"#FFD700" },
  barLabel:{ color:"#777", fontSize:10, marginTop:4 },
  barValue:{ color:"#FFD700", fontSize:11, marginTop:2 },

  progRow:{ flexDirection:"row", justifyContent:"space-between", marginBottom:4 },
  progLabel:{ color:"#fff", fontSize:13, fontWeight:"600" },
  progValue:{ color:"#FFD700", fontSize:13, fontWeight:"700" },
  progBG:{ height:8, backgroundColor:"#222", borderRadius:8, overflow:"hidden" },
  progFill:{ height:"100%", backgroundColor:"#FFD700" },

  timelineItem:{ paddingVertical:10, borderBottomWidth:1, borderBottomColor:"#222", paddingLeft:20 },
  dot:{ width:8, height:8, backgroundColor:"#FFD700", borderRadius:50, position:"absolute", left:4, top:16 },
  timelineTxt:{ color:"#ddd", fontSize:12, paddingRight:10 }
});
