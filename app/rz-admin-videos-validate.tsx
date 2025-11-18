import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Animated,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function RZAdminVideosValidate() {
  const router = useRouter();

  const [videos, setVideos] = useState([
    { id: "1", user: "User001", thumbnail: "https://picsum.photos/200", title: "PACT Créativité Sincère", duration: "45s", views: 0 },
    { id: "2", user: "User002", thumbnail: "https://picsum.photos/201", title: "PACT Authenticité", duration: "38s", views: 0 }
  ]);

  const [modal, setModal] = useState({ visible: false, user: "" });

  const stats = {
    pending: videos.length,
    approved: 0,
    rejected: 0,
  };

  const handleApprove = (id: string) => slideAndRemove(id, "approved");
  const handleReject = (id: string) => slideAndRemove(id, "rejected");

  const slideAndRemove = (id: string, type: "approved" | "rejected") => {
    setVideos(prev => prev.filter(v => v.id !== id));
    stats.pending--;
    stats[type]++;
  };

  const openPreview = (video: any) => {
    setModal({ visible: true, user: video.user });
  };

  const Card = ({ item }: any) => {
    const slideAnim = useRef(new Animated.Value(0)).current;

    const animateOut = (action: () => void) => {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start(() => action());
    };

    return (
      <Animated.View style={[styles.card, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.row}>
          <Image source={{ uri: item.thumbnail }} style={styles.thumb}/>
          <View style={{ flex: 1 }}>
            <Text style={styles.user}>{item.user} <Text style={styles.badge}>PACT</Text></Text>
            <Text style={styles.meta}>⏱ {item.duration}   👁 {item.views}</Text>
            <Text style={styles.title}>{item.title}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.preview} onPress={() => openPreview(item)}>
            <Text style={styles.gold}>👁</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.approve} onPress={() => animateOut(() => handleApprove(item.id))}>
            <Text style={styles.btnText}>✓ Valider</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reject} onPress={() => animateOut(() => handleReject(item.id))}>
            <Text style={styles.btnText}>✗ Rejeter</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={{ fontSize: 22, color: "#FFD700" }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation Vidéos</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Stat label="En attente" value={stats.pending}/>
        <Stat label="Validées" value={stats.approved}/>
        <Stat label="Rejetées" value={stats.rejected}/>
      </View>

      {/* List */}
      {videos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>Tout est validé !</Text>
          <Text style={styles.emptyText}>Aucune vidéo en attente...</Text>
        </View>
      ) : (
        <FlatList data={videos} keyExtractor={i => i.id} renderItem={({ item }) => <Card item={item}/>} />
      )}

      {/* Modal Preview */}
      <Modal visible={modal.visible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModal({ visible: false, user: "" })}>
          <View style={styles.modalBox}>
            <View style={styles.previewBox}>
              <Text style={{ fontSize: 45 }}>🎬</Text>
            </View>
            <Text style={styles.modalUser}>{modal.user}</Text>
            <Text style={styles.modalText}>Prévisualisation du PACT</Text>
            <TouchableOpacity style={styles.closeModal} onPress={() => setModal({ visible: false, user: "" })}>
              <Text style={{ color:"#FFD700", fontWeight:"700" }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const Stat = ({ label, value }: any) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000", paddingTop:70 },
  header:{ flexDirection:"row", alignItems:"center", paddingHorizontal:20, marginBottom:12 },
  headerTitle:{ color:"#FFD700", fontSize:22, fontWeight:"700", flex:1, textAlign:"center" },
  back:{ width:40, height:40, justifyContent:"center" },

  stats:{ flexDirection:"row", gap:10, paddingHorizontal:20, marginBottom:15 },
  statBox:{ flex:1, backgroundColor:"#181818", padding:10, borderRadius:10, borderWidth:1, borderColor:"#333", alignItems:"center" },
  statValue:{ color:"#FFD700", fontSize:20, fontWeight:"800" },
  statLabel:{ color:"#777", fontSize:11 },

  card:{ backgroundColor:"#121212", borderRadius:16, padding:16, marginBottom:12, borderWidth:1, borderColor:"#222" },
  row:{ flexDirection:"row", gap:12, marginBottom:10 },
  thumb:{ width:70, height:70, borderRadius:12 },
  user:{ color:"#fff", fontSize:15, fontWeight:"600" },
  badge:{ backgroundColor:"rgba(74,222,128,.2)", color:"#4ADE80", fontSize:10, paddingHorizontal:6, borderRadius:8 },
  meta:{ color:"#888", fontSize:12, marginTop:3 },
  title:{ color:"#aaa", fontSize:12, marginTop:4 },

  actions:{ flexDirection:"row", gap:8, marginTop:8 },
  preview:{ width:48, justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"#FFD70055", borderRadius:10, backgroundColor:"#1A1A1A" },
  approve:{ flex:1, backgroundColor:"#22c55e", borderRadius:10, justifyContent:"center", alignItems:"center" },
  reject:{ flex:1, backgroundColor:"#ef4444", borderRadius:10, justifyContent:"center", alignItems:"center" },
  btnText:{ color:"#fff", fontWeight:"700" },
  gold:{ color:"#FFD700", fontSize:20, fontWeight:"800" },

  empty:{ flex:1, justifyContent:"center", alignItems:"center" },
  emptyIcon:{ fontSize:70, opacity:0.3, marginBottom:10 },
  emptyTitle:{ color:"#4ADE80", fontSize:19, fontWeight:"700" },
  emptyText:{ color:"#777", fontSize:13, textAlign:"center" },

  modalOverlay:{ flex:1, backgroundColor:"rgba(0,0,0,0.9)", justifyContent:"center", padding:30 },
  modalBox:{ backgroundColor:"#141414", borderWidth:2, borderColor:"#FFD700", padding:20, borderRadius:20 },
  previewBox:{ height:180, backgroundColor:"#000", borderRadius:14, borderWidth:1, borderColor:"#333", justifyContent:"center", alignItems:"center", marginBottom:15 },
  modalUser:{ color:"#FFD700", fontSize:18, fontWeight:"700", textAlign:"center" },
  modalText:{ color:"#888", fontSize:13, textAlign:"center", marginVertical:10 },
  closeModal:{ backgroundColor:"#222", padding:12, borderRadius:12, alignItems:"center", marginTop:6 }
});
