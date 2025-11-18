// app/banq.tsx
// ✅ BANQ — version renommée

import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { Video } from "expo-av";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

const { height, width } = Dimensions.get("window");

// ➖➖➖ VIDÉOS TEST (inchangé) ➖➖➖
const videos = [
  { id: "1", file: require("../assets/videos/pact2.mp4"), user: "@visionnaire", avatar: require("../assets/images/avatar1.png"), isMine: true },
  { id: "2", file: require("../assets/videos/pact4.mp4"), user: "@createur2", avatar: require("../assets/images/avatar2.png"), isMine: true },
  { id: "3", file: require("../assets/videos/pact1.mp4"), user: "@talent3", avatar: require("../assets/images/avatar3.png"), isMine: true },
];

// ➖➖➖ CONSTANTES ➖➖➖
const TAN_SECONDS = 50;
const PACT_MAX_SECONDS = 125;
const HAITI_UTC_OFFSET_HOURS = -5;

// ➖➖➖ FONCTIONS TEMPS (inchangées) ➖➖➖
function nowInHaiti() { 
  const now = new Date(); 
  const utc = now.getTime() + now.getTimezoneOffset() * 60000; 
  return new Date(utc + HAITI_UTC_OFFSET_HOURS * 3600 * 1000); 
}

function isShabbat(d) { 
  const day = d.getUTCDay(), h = d.getUTCHours(), m = d.getUTCMinutes(); 
  return (day === 5 && h >= 18) || (day === 6 && h < 17) || (day === 6 && h === 17 && m === 0); 
}

function isFriday1750(d) { 
  return d.getUTCDay() === 5 && d.getUTCHours() === 17 && d.getUTCMinutes() === 50; 
}

function cycleDay(d) { 
  return ((d.getUTCDate() - 1) % 30) + 1; 
}

const two = n => (n < 10 ? `0${n}` : `${n}`);

export default function BanqDuMerite() {

  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState({});
  const [qob, setQob] = useState({});
  const [perVideoSeconds, setPerVideoSeconds] = useState({});
  const [globalSeconds, setGlobalSeconds] = useState(0);
  const videoRefs = useRef({});
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFor, setShareFor] = useState(null);

  // Mode immersive
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBehaviorAsync("inset-swipe");
      NavigationBar.setVisibilityAsync("hidden");
    }
  }, []);

  const showSystemBars = () => {
    NavigationBar.setVisibilityAsync("visible");
    setTimeout(() => NavigationBar.setVisibilityAsync("hidden"), 2000);
  };

  const quitFeed = () => {
    const id = videos[current]?.id;
    if (id && videoRefs.current[id]) videoRefs.current[id]?.pauseAsync?.();

    try { router.back(); }
    catch { router.push("/explorer"); }
  };

  // Viewers
  const [viewers, setViewers] = useState(2385);
  useEffect(() => {
    const i = setInterval(() => setViewers(v => Math.max(1, v + (Math.random()>0.5?1:-1))), 1200);
    return () => clearInterval(i);
  }, []);

  // Visionnage Timer
  useEffect(() => {
    const t = setInterval(() => {
      const d = nowInHaiti();
      if (isFriday1750(d)) Alert.alert("Repos moral imminent", "Dans 10 minutes.");
      if (isShabbat(d)) return;

      setGlobalSeconds(s => s + 1);

      const id = videos[current]?.id;
      if (!id || paused[id]) return;

      setPerVideoSeconds(m => {
        const n = (m[id] ?? 0) + 1;
        if (n > PACT_MAX_SECONDS) return m;
        return { ...m, [id]: n };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [current, paused]);

  const openShare = id => { setShareFor(id); setShareOpen(true); };
  const copyLink = async () => { await Clipboard.setStringAsync(`rhazn://banq/${shareFor}`); Alert.alert("Lien copié ✅"); };

  const likeQOB = id => setQob(m => ({ ...m, [id]: (m[id] ?? 0) + 1 }));

  const togglePause = id => {
    setPaused(p => {
      const n = !p[id];
      const ref = videoRefs.current[id];
      n ? ref?.pauseAsync?.() : ref?.playAsync?.();
      return { ...p, [id]: n };
    });
  };

  const renderItem = ({ item, index }) => {
    const id = item.id;
    const active = index === current;
    const sec = perVideoSeconds[id] ?? 0;
    const isPaused = !!paused[id];
    const day = cycleDay(nowInHaiti());

    return (
      <Pressable style={styles.page} onPress={showSystemBars}>
        <Video
          ref={r => (videoRefs.current[id] = r)}
          source={item.file}
          style={styles.video}
          resizeMode="cover"
          shouldPlay={active && !isPaused && !isShabbat(nowInHaiti())}
          isLooping
        />

        <LinearGradient colors={["transparent","rgba(0,0,0,0.75)"]} style={styles.overlay} />

        <View style={styles.middleRow}>
          <View style={styles.leftCol}>
            <Text style={styles.onlineTxt}>Online {viewers}</Text>
            <Text style={styles.timerTxt}>{sec}s / {PACT_MAX_SECONDS}s</Text>
            <View style={styles.authorRow}>
              <Image source={item.avatar} style={styles.avatar} />
              <Text style={styles.author}>{item.user}</Text>
            </View>
          </View>

          <View style={styles.rightCol}>

            <TouchableOpacity onPress={() => likeQOB(id)}>
              <Text style={styles.qobTxt}>QOB {qob[id] ?? 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => togglePause(id)}>
              <View style={styles.pillBtn}>
                {isPaused
                  ? (<><AntDesign name="caretright" size={16} color="#000" /><Text style={styles.pillBtnTxt}>Reprendre</Text></>)
                  : (<><MaterialIcons name="pause" size={18} color="#000" /><Text style={styles.pillBtnTxt}>Pause</Text></>)
                }
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openShare(id)}>
              <View style={styles.pillBtn}><Feather name="share-2" size={16} color="#000" /><Text style={styles.pillBtnTxt}>Inviter</Text></View>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.wrap}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* LOGO */}
      <View style={styles.logoContainer}>
        <Image source={require("../assets/images/logo-rhazn.png")} style={styles.logoImg} />
        <Text style={styles.cycleTxt}>Jrs : {two(cycleDay(nowInHaiti()))}/30</Text>
      </View>

      {/* QUITTER */}
      <TouchableOpacity onPress={quitFeed} style={styles.quitBtn}>
        <View style={styles.pillBtn}><MaterialIcons name="exit-to-app" size={18} color="#000" /><Text style={styles.pillBtnTxt}>Quitter</Text></View>
      </TouchableOpacity>

      <FlatList
        data={videos}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        keyExtractor={v => v.id}
        renderItem={renderItem}
        onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.y / height))}
      />

      {/* PARTAGE */}
      <Modal visible={shareOpen} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Inviter sur RHAZN</Text>

            {!!shareFor && <QRCode value={`rhazn://banq/${shareFor}`} size={180} backgroundColor="transparent" color="#D4AF37" />}

            <Text selectable style={styles.linkTxt}>{`rhazn://banq/${shareFor ?? ""}`}</Text>

            <View style={styles.modalBtns}>
              <Pressable onPress={copyLink} style={styles.copyBtn}><Text style={styles.copyTxt}>Copier</Text></Pressable>
              <Pressable onPress={() => setShareOpen(false)} style={styles.closeBtn}><Text style={styles.closeTxt}>Fermer</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const GOLD = "#D4AF37";

const styles = StyleSheet.create({
  wrap:{flex:1,backgroundColor:"#000"},
  page:{height,width},
  video:{position:"absolute",height,width},
  overlay:{...StyleSheet.absoluteFillObject},
  logoContainer:{position:"absolute",top:Platform.OS==="android"?40:30,left:14,zIndex:9999,flexDirection:"row",alignItems:"center",gap:6,paddingVertical:6,paddingHorizontal:8,backgroundColor:"rgba(0,0,0,0.25)",borderRadius:12},
  logoImg:{width:26,height:26},
  cycleTxt:{color:"#fff",fontWeight:"700",fontSize:13},
  quitBtn:{position:"absolute",bottom:120,alignSelf:"center",zIndex:9999},
  middleRow:{...StyleSheet.absoluteFillObject,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16},
  leftCol:{width:"45%",gap:14},
  rightCol:{width:"45%",gap:14,alignItems:"flex-end"},
  onlineTxt:{color:GOLD,fontSize:16,fontWeight:"700"},
  timerTxt:{color:"#fff",fontSize:14},
  authorRow:{flexDirection:"row",alignItems:"center",gap:10},
  avatar:{width:38,height:38,borderRadius:22,borderWidth:1,borderColor:"#2a2a2a"},
  author:{color:"#fff",fontSize:16,fontWeight:"700"},
  qobTxt:{color:GOLD,fontSize:16,fontWeight:"800"},
  pillBtn:{backgroundColor:GOLD,borderRadius:999,paddingVertical:8,paddingHorizontal:14,flexDirection:"row",alignItems:"center",gap:6},
  pillBtnTxt:{color:"#000",fontWeight:"900"},
  modalWrap:{flex:1,backgroundColor:"rgba(0,0,0,0.6)",alignItems:"center",justifyContent:"center"},
  modalCard:{width:width*0.86,backgroundColor:"#0b0b0b",borderRadius:16,padding:18,borderWidth:1,borderColor:"#2a2a2a",alignItems:"center"},
  modalTitle:{color:"#fff",fontWeight:"800",fontSize:16,marginBottom:8},
  linkTxt:{color:"#ccc",fontSize:12,textAlign:"center"},
  modalBtns:{flexDirection:"row",gap:12,marginTop:12},
  copyBtn:{backgroundColor:GOLD,paddingVertical:10,paddingHorizontal:14,borderRadius:10},
  copyTxt:{color:"#000",fontWeight:"800"},
  closeBtn:{backgroundColor:"#1a1a1a",paddingVertical:10,paddingHorizontal:14,borderRadius:10,borderWidth:1,borderColor:"#2a2a2a"},
  closeTxt:{color:"#fff"}
});
