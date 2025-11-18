import { useRouter } from "expo-router";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AdminGuard from "../../components/admin/AdminGuard";

export default function RZAdminFinanceHome() {
  const router = useRouter();

  return (
    <AdminGuard>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.container}>

        {/* 🔥 Mise à jour doctrinale uniquement */}
        <Text style={styles.title}>RZ-ADMIN · Système Interne</Text>
        <Text style={styles.subtitle}>ACSET / TAN / Ajustements ED</Text>

        <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
          
          {/* 🔥 On ne touche pas aux routes. On change seulement les libellés. */}
          <Card 
            label="Ajustements TAN (ED)" 
            onPress={()=>router.push("/rz-admin-finance/withdraw")} 
          />

          <Card 
            label="Mouvements ACSET (interne)" 
            onPress={()=>router.push("/rz-admin-finance/mouvements")} 
          />

          <Card 
            label="Historique des opérations internes" 
            onPress={()=>router.push("/rz-admin-finance/history")} 
          />

          <Card 
            label="Validation interne (CFO/COO)" 
            onPress={()=>router.push("/rz-admin-finance/accounting")} 
          />

          <Card 
            label="Statistiques du système" 
            onPress={()=>router.push("/rz-admin-finance/stats")} 
          />

        </ScrollView>

        <Text style={styles.footer}>RHAZN — Trésor du Mérite</Text>
      </View>
    </AdminGuard>
  );
}

function Card({label, onPress}:{label:string; onPress:()=>void}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000", paddingTop:70 },
  title:{ color:"#FFD700", fontSize:22, fontWeight:"700", marginLeft:18 },
  subtitle:{ color:"#A1A1A1", fontSize:13, marginLeft:18, marginBottom:14 },
  card:{ backgroundColor:"#0B0B0B", borderRadius:14, padding:18, borderWidth:1, borderColor:"#222" },
  cardText:{ color:"#fff", fontSize:15, fontWeight:"600" },
  footer:{ color:"#6C6C6C", textAlign:"left", marginLeft:18, marginVertical:22, fontSize:11 }
});
