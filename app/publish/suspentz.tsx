/**
 * app/publish/suspentz.tsx — RHAZN Suspentz Publisher v6
 *
 * ✅ Système de brouillon (draft) complet avec autosave
 * ✅ Génération vidéo via FFmpegKit (une seule fois)
 * ✅ Recovery automatique si l'utilisateur quitte l'app
 * ✅ Architecture TikTok : vidéo+audio fusionnés via FFmpeg
 * ✅ SafeAreaView → useSafeAreaInsets
 * ✅ Zéro état dispersé — tout centralisé dans useDraft
 */

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MusicCatalogModal, { MusicTrack } from "../../components/MusicCatalogModal";
import SuspentzEditor, { EditorResult } from "../../components/SuspentzEditor";
import {
  DuplicateCheckResult,
  useContentDuplicateCheck,
} from "../../hooks/useContentDuplicateCheck";
import { useDraft } from "../../hooks/useDraft";
import { cleanOldFinals } from "../../lib/draftService";
import { supabase } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const MAX_DURATION_SEC    = 95;
const FOOTER_H            = 95;
const PX_PER_SEC          = 64;

const C = {
  bg:       "#0A0A0A",
  card:     "#141414",
  gold:     "#D4AF37",
  white:    "#FFF",
  gray:     "#666",
  muted:    "rgba(255,255,255,0.60)",
  border:   "rgba(255,255,255,0.10)",
  hairline: "rgba(255,255,255,0.06)",
  blue:     "#007AFF",
  danger:   "#FF453A",
  ok:       "#34C759",
  goldDim:  "rgba(212,175,55,0.14)",
};

export const RHAZN_THEMES = [
  "Art & Cultures","Génie Créatif","Expression Culturelle","Héritage des Traditions",
  "Mémoire des Peuples","Langage du Son","L'Âme de la Musique","Vision Photographique",
  "L'Art du Cinéma","Poésie & Mots","Littérature Vivante","La Scène & le Spectacle",
  "Danse & Mouvement","Architecture du Beau","Mode & Identité","Amour",
  "Intelligence Relationnelle","Le Lien Humain","Héritage Familial","Motivation",
  "Force Intérieure","Éveil de Soi","Confiance en Soi","Dimension Spirituelle",
  "Chemin de la Foi","Sagesse Appliquée","Paix Intérieure","Santé & Vitalité",
  "Corps en Équilibre","Haïti & Mémoire","La Dignité Noire","Racines & Diaspora",
  "L'Esprit d'Innovation","Intelligence Financière","Justice & Équité",
  "Puissance du Vivant","Nature & Connexion","Écologie Consciente",
];

// ─────────────────────────────────────────────────────────────────
// AUDIO SINGLETON — pour SegmentPicker uniquement
// ─────────────────────────────────────────────────────────────────
let _SND: Audio.Sound | null = null;
let _audioModeSet = false;

async function KILL(): Promise<void> {
  const s = _SND; _SND = null;
  if (!s) return;
  try { await s.stopAsync();   } catch {}
  try { await s.unloadAsync(); } catch {}
}

async function PLAY(uri: string, startMs: number, loop: boolean): Promise<void> {
  await KILL();
  try {
    if (!_audioModeSet) {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true, staysActiveInBackground: false, allowsRecordingIOS: false,
      });
      _audioModeSet = true;
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri }, { positionMillis: startMs, shouldPlay: true, volume: 1, isLooping: loop }
    );
    _SND = sound;
  } catch (e) { console.warn("PLAY:", e); }
}

// ─────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────
const fmtTime = (s: number) =>
  `${String(Math.floor(Math.max(0,s)/60)).padStart(2,"0")}:${String(
    Math.floor(Math.max(0,s)%60)).padStart(2,"0")}`;
const clamp = (v:number,lo:number,hi:number) => Math.min(hi, Math.max(lo, v));

type Notice = {
  tone: "info"|"danger"|"ok"; title: string; message: string;
  actionLabel?: string; onAction?: () => void;
};
type Step = "home"|"editor"|"form";

// ─────────────────────────────────────────────────────────────────
// SEG COLORS
// ─────────────────────────────────────────────────────────────────
const SEG_COLORS = [
  { fill:"rgba(212,175,55,0.22)", border:"rgba(212,175,55,0.90)", text:C.gold,    dark:"rgba(212,175,55,0.10)" },
  { fill:"rgba(0,122,255,0.22)",  border:"rgba(0,122,255,0.90)",  text:"#4DA6FF", dark:"rgba(0,122,255,0.10)"  },
] as const;

// ─────────────────────────────────────────────────────────────────
// DUPLICATE MODAL
// ─────────────────────────────────────────────────────────────────
function DuplicateModal({
  visible, result, isSupreme, onCancel, onForce,
}: {
  visible: boolean; result: DuplicateCheckResult|null;
  isSupreme: boolean; onCancel: ()=>void; onForce?: ()=>void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue:visible?1:0, damping:20, stiffness:200, useNativeDriver:true }).start();
  }, [visible]);
  if (!visible) return null;

  const isHard   = ["EXACT_HASH","ALREADY_PUBLISHED","DURATION_TITLE"].includes(result?.reason??"");
  const canForce = isSupreme && result?.reason === "TITLE_SIMILARITY";
  const col      = isHard ? C.danger : "#FF9F0A";
  const label    = ({
    EXACT_HASH:"Fichier identique", DURATION_TITLE:"Durée + titre identiques",
    TITLE_SIMILARITY:"Titre très similaire", ALREADY_PUBLISHED:"Déjà publié",
  } as any)[result?.reason??""] ?? "Doublon";

  return (
    <View style={dm.ov}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel}/>
      <Animated.View style={[dm.sh, {
        opacity:anim, transform:[{scale:anim.interpolate({inputRange:[0,1],outputRange:[0.93,1]})}],
      }]}>
        <View style={[dm.ring, {borderColor:col, backgroundColor:`${col}18`}]}>
          <Ionicons name={isHard?"ban-outline":"warning-outline"} size={28} color={col}/>
        </View>
        <Text style={[dm.title, {color:col}]}>{label}</Text>
        <Text style={dm.msg}>{result?.message??"Ce contenu semble déjà exister."}</Text>
        <View style={dm.row}>
          <Pressable style={dm.cancel} onPress={onCancel}><Text style={dm.cancelTxt}>Annuler</Text></Pressable>
          {canForce && onForce && (
            <Pressable style={dm.force} onPress={onForce}><Text style={dm.forceTxt}>Publier quand même</Text></Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
const dm = StyleSheet.create({
  ov:        {position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.75)",zIndex:9000,justifyContent:"flex-end"},
  sh:        {backgroundColor:"#111",borderTopLeftRadius:28,borderTopRightRadius:28,padding:28,alignItems:"center",gap:12,borderTopWidth:1,borderTopColor:C.border},
  ring:      {width:64,height:64,borderRadius:32,alignItems:"center",justifyContent:"center",borderWidth:2,marginBottom:4},
  title:     {fontSize:17,fontWeight:"900",textAlign:"center"},
  msg:       {color:C.muted,fontSize:13,textAlign:"center",lineHeight:18},
  row:       {flexDirection:"row",gap:10,width:"100%",marginTop:4},
  cancel:    {flex:1,alignItems:"center",backgroundColor:"rgba(255,255,255,0.06)",borderRadius:14,paddingVertical:13,borderWidth:1,borderColor:C.border},
  cancelTxt: {color:C.muted,fontWeight:"800",fontSize:13},
  force:     {flex:1,alignItems:"center",backgroundColor:C.gold,borderRadius:14,paddingVertical:13},
  forceTxt:  {color:"#000",fontWeight:"900",fontSize:13},
});

// ─────────────────────────────────────────────────────────────────
// TIMELINE PREVIEW (step form)
// ─────────────────────────────────────────────────────────────────
function UnifiedTimeline({
  videoUri, durationSec, playPositionSec,
  selectedTrack, audioSegmentIndex, audioStartSec, audioEndSec, onSeek,
}: {
  videoUri:string; durationSec:number; playPositionSec:number;
  selectedTrack:MusicTrack|null; audioSegmentIndex:number;
  audioStartSec:number; audioEndSec:number; onSeek:(t:number)=>void;
}) {
  const scrollRef  = useRef<ScrollView>(null);
  const isDragging = useRef(false);
  const [thumbs,  setThumbs]  = useState<string[]>([]);
  const [layoutW, setLayoutW] = useState(SCREEN_W);
  const PADDING = layoutW / 2;
  const STRIP_W = Math.max(layoutW, durationSec * PX_PER_SEC);

  useEffect(() => {
    if (!videoUri || durationSec <= 0) return;
    let alive = true;
    (async () => {
      const n = Math.min(12, Math.max(4, Math.ceil(durationSec / 2)));
      const out: string[] = [];
      for (let i = 0; i < n; i++) {
        const t = Math.round((i / Math.max(1,n-1)) * durationSec * 1000);
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {time:Math.max(0,t),quality:0.3});
          if (alive) out.push(uri);
        } catch { if (alive) out.push(""); }
      }
      if (alive) setThumbs(out);
    })();
    return () => { alive = false; };
  }, [videoUri, durationSec]);

  useEffect(() => {
    if (isDragging.current || !scrollRef.current) return;
    scrollRef.current.scrollTo({ x: playPositionSec * PX_PER_SEC, animated:false });
  }, [playPositionSec]);

  const markers = useMemo(() => {
    const step = durationSec <= 15 ? 1 : durationSec <= 45 ? 5 : 10;
    const m: number[] = [];
    for (let t = 0; t <= Math.ceil(durationSec); t += step) m.push(t);
    return m;
  }, [durationSec]);

  const audioBars = useMemo(() => {
    if (!selectedTrack || audioSegmentIndex < 0) return [];
    return Array.from({length:50}, (_,i) =>
      clamp(0.15 + Math.abs(Math.sin(i*1.87 + audioStartSec*0.05))*0.85, 0.15, 1)
    );
  }, [selectedTrack, audioStartSec, audioSegmentIndex]);

  const segCol = audioSegmentIndex >= 0 ? SEG_COLORS[clamp(audioSegmentIndex,0,1)] : null;
  const thumbW = STRIP_W / Math.max(1, thumbs.length || 10);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onSeek(clamp(e.nativeEvent.contentOffset.x / PX_PER_SEC, 0, durationSec));
    setTimeout(() => { isDragging.current = false; }, 80);
  };

  return (
    <View style={tl.outer} onLayout={e => setLayoutW(e.nativeEvent.layout.width)}>
      <View style={tl.header}>
        <View style={{flexDirection:"row",alignItems:"center",gap:5}}>
          <Text style={tl.label}>VIDÉO</Text>
          <Text style={tl.posTime}>{fmtTime(playPositionSec)}</Text>
          <Text style={{color:"rgba(255,255,255,0.20)",fontSize:11}}>/</Text>
          <Text style={tl.durTime}>{fmtTime(durationSec)}</Text>
        </View>
        {segCol && selectedTrack && (
          <View style={[tl.segPill,{borderColor:segCol.border}]}>
            <View style={[tl.segDot,{backgroundColor:segCol.border}]}/>
            <Text style={[tl.segTxt,{color:segCol.text}]}>
              S{audioSegmentIndex+1} · {fmtTime(audioStartSec)}–{fmtTime(audioEndSec)}
            </Text>
          </View>
        )}
      </View>
      <View style={[tl.zone,{height:selectedTrack?114:62}]}>
        <View pointerEvents="none" style={[tl.playhead,{left:layoutW/2-1.5}]}/>
        <View pointerEvents="none" style={[tl.capT,{left:layoutW/2-8}]}/>
        <View pointerEvents="none" style={[tl.capB,{left:layoutW/2-8}]}/>
        <ScrollView
          ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => { isDragging.current = true; }}
          onScrollEndDrag={onScrollEnd} onMomentumScrollEnd={onScrollEnd}
          contentContainerStyle={{paddingHorizontal:PADDING}} decelerationRate="fast" style={{flex:1}}
        >
          <View style={{width:STRIP_W}}>
            <View style={tl.videoStrip}>
              {(thumbs.length>0?thumbs:Array.from({length:10})).map((_,i)=>(
                <View key={i} style={[tl.thumb,{width:thumbW,backgroundColor:`rgba(${22+i*5},${20+i*4},${32+i*5},1)`}]}>
                  <Ionicons name="film-outline" size={8} color="rgba(255,255,255,0.18)"/>
                </View>
              ))}
              {markers.map(t=>(
                <View key={t} pointerEvents="none" style={[tl.marker,{left:(t/Math.max(1,durationSec))*STRIP_W}]}>
                  <Text style={tl.markerTxt}>{fmtTime(t)}</Text>
                </View>
              ))}
            </View>
            {selectedTrack && <View style={tl.div}/>}
            {selectedTrack && segCol && audioSegmentIndex>=0 && (
              <View style={[tl.audioStrip,{borderColor:`${segCol.border}45`,width:STRIP_W}]}>
                <View style={[tl.audioBg,{backgroundColor:`${segCol.border}10`}]} pointerEvents="none"/>
                <View style={tl.audioLabel} pointerEvents="none">
                  <Ionicons name="musical-notes" size={8} color={segCol.text}/>
                  <Text style={[tl.audioLabelTxt,{color:segCol.text}]}>
                    S{audioSegmentIndex+1} · {fmtTime(audioStartSec)}–{fmtTime(audioEndSec)}
                  </Text>
                </View>
                {audioBars.map((h,bi)=>(
                  <View key={bi} style={{
                    flex:1,height:clamp(Math.round(h*36),3,36),
                    backgroundColor:segCol.border,opacity:0.50+h*0.50,
                    marginHorizontal:0.8,borderRadius:1.5,alignSelf:"center",
                  }}/>
                ))}
              </View>
            )}
            {selectedTrack && audioSegmentIndex<0 && (
              <View style={tl.audioPlaceholder}>
                <Ionicons name="warning-outline" size={11} color="#FF9500"/>
                <Text style={tl.audioPlaceholderTxt}>Choisissez un segment dans l'éditeur</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
const tl = StyleSheet.create({
  outer:            {backgroundColor:"#0C0C0C",borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"rgba(255,255,255,0.06)"},
  header:           {flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:14,paddingTop:8,paddingBottom:4},
  label:            {color:"rgba(255,255,255,0.30)",fontSize:9,fontWeight:"800",textTransform:"uppercase",letterSpacing:0.8,marginRight:4},
  posTime:          {color:C.gold,fontSize:11,fontWeight:"900"},
  durTime:          {color:"rgba(255,255,255,0.35)",fontSize:11,fontWeight:"700"},
  segPill:          {flexDirection:"row",alignItems:"center",gap:5,borderRadius:8,borderWidth:1,paddingHorizontal:8,paddingVertical:3},
  segDot:           {width:6,height:6,borderRadius:3},
  segTxt:           {fontSize:10,fontWeight:"800"},
  zone:             {position:"relative",overflow:"hidden"},
  playhead:         {position:"absolute",top:0,bottom:0,width:2.5,backgroundColor:C.gold,zIndex:20,shadowColor:C.gold,shadowOpacity:1,shadowRadius:6,elevation:12},
  capT:             {position:"absolute",top:0,width:16,height:10,backgroundColor:C.gold,borderRadius:3,zIndex:21},
  capB:             {position:"absolute",bottom:0,width:16,height:10,backgroundColor:C.gold,borderRadius:3,zIndex:21},
  videoStrip:       {height:52,flexDirection:"row",position:"relative",borderRadius:6,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.10)"},
  thumb:            {height:52,alignItems:"center",justifyContent:"center",borderRightWidth:StyleSheet.hairlineWidth,borderRightColor:"rgba(255,255,255,0.07)"},
  marker:           {position:"absolute",top:0,bottom:0,width:1,backgroundColor:"rgba(255,255,255,0.10)",justifyContent:"flex-end",paddingBottom:2},
  markerTxt:        {color:"rgba(255,255,255,0.30)",fontSize:6.5,fontWeight:"700",marginLeft:2},
  div:              {height:1,backgroundColor:"rgba(255,255,255,0.06)",marginVertical:2},
  audioStrip:       {height:46,flexDirection:"row",alignItems:"center",borderRadius:6,overflow:"hidden",borderWidth:1,paddingHorizontal:2,position:"relative",backgroundColor:"rgba(0,0,0,0.30)"},
  audioLabel:       {position:"absolute",left:4,top:3,flexDirection:"row",alignItems:"center",gap:2,zIndex:5},
  audioLabelTxt:    {fontSize:7.5,fontWeight:"900",opacity:0.80},
  audioBg:          {position:"absolute",top:0,left:0,right:0,bottom:0,borderRadius:5},
  audioPlaceholder: {height:46,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,borderRadius:6,borderWidth:1,borderStyle:"dashed",borderColor:"rgba(255,149,0,0.35)",backgroundColor:"rgba(255,149,0,0.05)"},
  audioPlaceholderTxt:{color:"#FF9500",fontSize:10,fontWeight:"700"},
});

// ─────────────────────────────────────────────────────────────────
// SEGMENT PICKER
// ─────────────────────────────────────────────────────────────────
function SegmentPicker({
  track, durationSec, selectedSegment, onSelect,
}: {
  track:MusicTrack; durationSec:number; selectedSegment:number; onSelect:(i:number)=>void;
}) {
  const [previewIdx,  setPreviewIdx]  = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const isAlive = useRef(true);
  const segLen  = track.duration_sec / 2;

  const segments = useMemo(() => [
    {index:0,start:0,      end:segLen,           dur:segLen},
    {index:1,start:segLen, end:track.duration_sec, dur:Math.max(0,track.duration_sec-segLen)},
  ], [segLen, track.duration_sec]);

  const BARS = 28;
  const waveBars = useMemo(() =>
    segments.map(seg =>
      Array.from({length:BARS}, (_,i) =>
        clamp(0.15+Math.abs(Math.sin(i*1.73+seg.start*0.05))*0.85,0.15,1)
      )
    ), [segments]);

  const stopPreview = async () => {
    await KILL();
    if (isAlive.current) { setIsListening(false); setPreviewIdx(-1); }
  };

  const listenSegment = async (idx: number) => {
    if (previewIdx===idx && isListening) { await stopPreview(); return; }
    const seg = segments[idx];
    await PLAY(track.file_url, Math.round(seg.start*1000), true);
    if (isAlive.current) { setPreviewIdx(idx); setIsListening(true); }
  };

  const handleSelect = async (idx: number) => {
    await stopPreview();
    onSelect(idx);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
  };

  useEffect(() => {
    isAlive.current = true;
    return () => { isAlive.current = false; KILL(); };
  }, []);

  return (
    <View style={sp.wrap}>
      <View style={sp.header}>
        <Ionicons name="musical-notes" size={12} color={C.gold}/>
        <Text style={sp.hTitle} numberOfLines={1}>{track.title}</Text>
        <Text style={sp.hSub}>{fmtTime(track.duration_sec)}</Text>
      </View>
      <View style={sp.row}>
        {segments.map((seg,i) => {
          const col    = SEG_COLORS[i];
          const bars   = waveBars[i];
          const chosen = selectedSegment===i;
          const active = previewIdx===i && isListening;
          const vidPct = durationSec>0 && seg.dur>0 ? Math.min(1,durationSec/seg.dur) : 1;
          return (
            <View key={i} style={[sp.card,chosen&&{borderColor:col.border,backgroundColor:col.dark}]}>
              <View style={[sp.topLine,{backgroundColor:col.border}]}/>
              <View style={sp.head}>
                <View style={[sp.badge,{backgroundColor:col.fill,borderColor:col.border}]}>
                  <Text style={[sp.badgeTxt,{color:col.text}]}>S{i+1}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={[sp.segTime,{color:col.text}]}>{fmtTime(seg.start)} – {fmtTime(seg.end)}</Text>
                  <Text style={sp.segDur}>{Math.round(seg.dur)}s</Text>
                </View>
                <Pressable onPress={()=>listenSegment(i)} style={[sp.listenBtn,active&&{backgroundColor:col.fill,borderColor:col.border}]}>
                  <Ionicons name={active?"pause":"play"} size={14} color={active?col.text:C.muted}/>
                </Pressable>
              </View>
              <View style={sp.waveRow}>
                {bars.map((h,bi)=>(
                  <View key={bi} style={{
                    flex:1,height:clamp(Math.round(h*32),3,32),
                    backgroundColor:(bi/Math.max(1,BARS-1))<=vidPct?col.border:"rgba(255,255,255,0.10)",
                    marginHorizontal:0.8,borderRadius:1.5,
                  }}/>
                ))}
              </View>
              <View style={sp.foot}>
                {durationSec>0&&(durationSec>seg.dur
                  ?<Text style={sp.hint}><Ionicons name="repeat" size={9} color="rgba(255,255,255,0.35)"/> boucle</Text>
                  :<Text style={sp.hint}>✂ {fmtTime(durationSec)}</Text>
                )}
              </View>
              {chosen?(
                <View style={[sp.chosenBadge,{backgroundColor:col.fill,borderColor:col.border}]}>
                  <Ionicons name="checkmark-circle" size={13} color={col.text}/>
                  <Text style={[sp.chosenTxt,{color:col.text}]}>Sélectionné</Text>
                </View>
              ):(
                <Pressable style={sp.selectBtn} onPress={()=>handleSelect(i)}>
                  <Text style={sp.selectBtnTxt}>Choisir S{i+1}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
      {selectedSegment<0&&(
        <View style={sp.warning}>
          <Ionicons name="information-circle-outline" size={13} color="#FF9500"/>
          <Text style={sp.warningTxt}>Choisissez un segment pour continuer</Text>
        </View>
      )}
    </View>
  );
}
const sp = StyleSheet.create({
  wrap:       {backgroundColor:"#0B0B0B",borderTopWidth:1,borderTopColor:"rgba(255,255,255,0.07)",paddingBottom:6},
  header:     {flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:14,paddingTop:8,paddingBottom:6},
  hTitle:     {color:C.white,fontWeight:"800",fontSize:12,flex:1},
  hSub:       {color:C.gray,fontSize:10,fontWeight:"600"},
  row:        {flexDirection:"row",gap:10,paddingHorizontal:12,paddingBottom:6},
  card:       {flex:1,backgroundColor:"#111",borderRadius:14,borderWidth:1.5,borderColor:"rgba(255,255,255,0.10)",overflow:"hidden"},
  topLine:    {height:3},
  head:       {flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:10,paddingTop:8,paddingBottom:4},
  badge:      {borderRadius:6,paddingHorizontal:7,paddingVertical:2,borderWidth:1},
  badgeTxt:   {fontSize:10,fontWeight:"900"},
  segTime:    {fontSize:10,fontWeight:"800"},
  segDur:     {color:"rgba(255,255,255,0.35)",fontSize:9,marginTop:1},
  listenBtn:  {width:30,height:30,borderRadius:15,backgroundColor:"rgba(255,255,255,0.07)",borderWidth:1,borderColor:"rgba(255,255,255,0.12)",alignItems:"center",justifyContent:"center"},
  waveRow:    {flexDirection:"row",alignItems:"center",height:36,paddingHorizontal:8},
  foot:       {paddingHorizontal:10,paddingBottom:6,minHeight:16},
  hint:       {color:"rgba(255,255,255,0.30)",fontSize:9,fontWeight:"600"},
  chosenBadge:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5,margin:8,marginTop:4,borderRadius:8,paddingVertical:8,borderWidth:1},
  chosenTxt:  {fontSize:11,fontWeight:"900"},
  selectBtn:  {margin:8,marginTop:4,backgroundColor:"rgba(255,255,255,0.08)",borderRadius:8,paddingVertical:8,alignItems:"center",borderWidth:1,borderColor:"rgba(255,255,255,0.12)"},
  selectBtnTxt:{color:C.white,fontSize:11,fontWeight:"800"},
  warning:    {flexDirection:"row",alignItems:"center",gap:6,marginHorizontal:12,marginTop:2,backgroundColor:"rgba(255,149,0,0.08)",borderRadius:8,padding:8,borderWidth:1,borderColor:"rgba(255,149,0,0.25)"},
  warningTxt: {color:"#FF9500",fontSize:10,fontWeight:"700",flex:1},
});

// ─────────────────────────────────────────────────────────────────
// DRAFT STATUS BAR
// ─────────────────────────────────────────────────────────────────
function DraftStatusBar({
  status, progress,
}: { status:string; progress:{percent:number;message:string}|null }) {
  const configs: Record<string,{bg:string;color:string;icon:string;label:string}> = {
    saving:     {bg:"rgba(0,122,255,0.10)", color:"#4DA6FF", icon:"cloud-upload-outline",     label:"Sauvegarde…"},
    saved:      {bg:"rgba(52,199,89,0.10)", color:"#30D158", icon:"checkmark-circle-outline",  label:"Brouillon enregistré"},
    processing: {bg:"rgba(212,175,55,0.10)",color:C.gold,    icon:"sync-outline",              label:progress?.message??"Génération…"},
    ready:      {bg:"rgba(52,199,89,0.10)", color:"#30D158", icon:"videocam",                  label:"Prêt à publier ✓"},
    error:      {bg:"rgba(255,69,58,0.10)", color:C.danger,  icon:"warning-outline",            label:"Erreur — vérifiez les paramètres"},
  };
  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <View style={{
      flexDirection:"row",alignItems:"center",gap:7,
      marginHorizontal:16,marginBottom:8,
      backgroundColor:cfg.bg,borderRadius:10,
      paddingHorizontal:12,paddingVertical:7,
    }}>
      {status==="processing"
        ?<ActivityIndicator size="small" color={cfg.color}/>
        :<Ionicons name={cfg.icon as any} size={14} color={cfg.color}/>
      }
      <Text style={{color:cfg.color,fontWeight:"700",fontSize:11,flex:1}}>{cfg.label}</Text>
      {status==="processing" && progress && (
        <Text style={{color:cfg.color,fontWeight:"900",fontSize:11}}>{progress.percent}%</Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// RECOVERY BANNER
// ─────────────────────────────────────────────────────────────────
function RecoveryBanner({onAccept,onDecline}: {onAccept:()=>void;onDecline:()=>void}) {
  return (
    <View style={{
      backgroundColor:"#0D0D0D",borderBottomWidth:1,
      borderBottomColor:"rgba(212,175,55,0.30)",
      paddingHorizontal:16,paddingVertical:12,
      flexDirection:"row",alignItems:"center",gap:10,
    }}>
      <View style={{flex:1,gap:2}}>
        <Text style={{color:C.gold,fontWeight:"900",fontSize:13}}>📝 Brouillon récupéré</Text>
        <Text style={{color:C.muted,fontSize:11}}>Voulez-vous reprendre votre création ?</Text>
      </View>
      <Pressable
        onPress={onDecline}
        style={{paddingHorizontal:10,paddingVertical:7,borderRadius:10,backgroundColor:"rgba(255,255,255,0.07)",borderWidth:1,borderColor:C.border}}
      >
        <Text style={{color:C.muted,fontWeight:"700",fontSize:12}}>Ignorer</Text>
      </Pressable>
      <Pressable
        onPress={onAccept}
        style={{paddingHorizontal:12,paddingVertical:7,borderRadius:10,backgroundColor:C.gold}}
      >
        <Text style={{color:"#000",fontWeight:"900",fontSize:12}}>Reprendre</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function PublishSuspentz() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Step (local — pas dans le draft, c'est de la navigation) ──
  const [step, setStep] = useState<Step>("home");

  // ── Draft — état centralisé ───────────────────────────────────
  const {
    draft,
    status:       draftStatus,
    progress:     genProgress,
    hasRecovery,
    canPublish,
    isProcessing,
    updateDraft,
    saveNow,
    generateVideo,
    discardDraft,
    acceptRecovery,
    declineRecovery,
  } = useDraft();

  // Alias lisibles
  const videoUri          = draft.videoUri;
  const durationSec       = draft.durationSec;
  const selectedTrack     = draft.selectedTrack as MusicTrack|null;
  const audioSegmentIndex = draft.audioSegmentIndex;
  const trackDuration     = selectedTrack?.duration_sec ?? 0;
  const segmentDur        = trackDuration > 0 ? trackDuration / 2 : 0;
  const audioStartSec     = audioSegmentIndex >= 0 ? segmentDur * audioSegmentIndex : 0;
  const audioEndSec       = Math.min(audioStartSec + segmentDur, trackDuration);

  // ── Formulaire (stocké dans le draft) ─────────────────────────
  const title       = draft.title;
  const theme       = draft.theme;
  const author      = draft.author;
  const description = draft.description;

  // ── States locaux (UI only) ───────────────────────────────────
  const [showCatalogHome, setShowCatalogHome] = useState(false);
  const [showThemes,      setShowThemes]      = useState(false);
  const [playPos,         setPlayPos]         = useState(0);
  const [uploading,       setUploading]       = useState(false);
  const [acsetBalance,    setAcsetBalance]    = useState<number|null>(null);
  const [acsetCost,       setAcsetCost]       = useState(1);
  const [creditsLoading,  setCreditsLoading]  = useState(false);
  const [isSupreme,       setIsSupreme]       = useState(false);
  const [notice,          setNotice]          = useState<Notice|null>(null);
  const [dupResult,       setDupResult]       = useState<DuplicateCheckResult|null>(null);
  const [showDupModal,    setShowDupModal]    = useState(false);

  const { checkDuplicate, registerContentHash, checking:checkingDup } = useContentDuplicateCheck();

  const filteredThemes = useMemo(() => {
    const q = theme.trim().toLowerCase();
    if (!q) return [];
    return RHAZN_THEMES.filter(t => t.toLowerCase().includes(q)).slice(0,10);
  }, [theme]);

  const notify = (n: Notice) => {
    setNotice(n);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
  };

  // ── Lifecycle ─────────────────────────────────────────────────
  useEffect(() => { cleanOldFinals().catch(()=>{}); }, []);

  // Sauvegarder quand l'app passe en arrière-plan
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state==="background" || state==="inactive") saveNow().catch(()=>{});
    });
    return () => sub.remove();
  }, [saveNow]);

  // Sync step dans le draft (pour recovery)
  useEffect(() => { updateDraft({step}); }, [step]);

  // ── Init user + credits ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setCreditsLoading(true);
        const {data:auth} = await supabase.auth.getUser();
        const user = auth?.user; if (!user) return;
        const supreme = (user.email||"").toLowerCase()==="meyounbauniklovegodstory@gmail.com";
        setIsSupreme(supreme);
        if (supreme) { setAcsetBalance(Number.MAX_SAFE_INTEGER); return; }
        const {data:w} = await supabase.from("wallets").select("acset_balance").eq("user_id",user.id).single();
        setAcsetBalance(Number(w?.acset_balance||0));
      } finally { setCreditsLoading(false); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const {data} = await supabase.auth.getUser();
      const user = data?.user; if (!user) return;
      const {data:prof} = await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
      const name = prof?.full_name?.trim()||(user.user_metadata as any)?.full_name?.trim()||user.email?.trim()||"Auteur";
      if (!draft.author.trim()) updateDraft({author:name});
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const {data} = await supabase.from("publication_tariffs").select("acset_cost").eq("code","SUSPENTZ").eq("active",true).maybeSingle();
      setAcsetCost(Number(data?.acset_cost||1));
    })();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSelectTrack = (track: MusicTrack) => {
    updateDraft({
      selectedTrack:     track,
      audioSegmentIndex: 0,
      finalVideoUri:     null,  // doit régénérer si track change
    });
  };

  const handleSegmentSelect = (idx: number) => {
    updateDraft({ audioSegmentIndex: idx, finalVideoUri: null });
    KILL();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});
  };

  // ── Gallery picker ────────────────────────────────────────────
  const pickGallery = async () => {
    try {
      const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status!=="granted") {
        notify({tone:"danger",title:"Accès galerie requis",message:"Autorisez l'accès dans les réglages."});
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos" as any,
        quality:1, allowsEditing:false, allowsMultipleSelection:false,
      });
      if (result.canceled||!result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const dur   = asset.duration
        ? Math.round(asset.duration>1000?asset.duration/1000:asset.duration) : 0;

      if (dur>MAX_DURATION_SEC) {
        notify({tone:"danger",title:"Vidéo trop longue",message:`Maximum ${MAX_DURATION_SEC}s. Votre vidéo fait ${dur}s.`});
        return;
      }

      let uri = asset.uri;
      if (Platform.OS==="android" && !uri.startsWith("file://")) {
        try {
          const dest = `${FileSystem.cacheDirectory}rz_pick_${Date.now()}.mp4`;
          await FileSystem.copyAsync({from:uri,to:dest});
          uri = dest;
        } catch {}
      }

      updateDraft({videoUri:uri, durationSec:dur, finalVideoUri:null});
      if (!selectedTrack) setShowCatalogHome(true);
      else setStep("editor");
      Haptics.selectionAsync().catch(()=>{});
    } catch(e) { console.warn("pickGallery:",e); }
  };

  // ── Publish ───────────────────────────────────────────────────
  const publish = async () => {
    const t=title.trim(), th=theme.trim(), au=author.trim();
    if (!t||!th||!au||!videoUri) {
      notify({tone:"danger",title:"Informations manquantes",message:"Titre, Thème et Auteur sont requis."});
      return;
    }
    if (!selectedTrack) {
      notify({tone:"danger",title:"Musique requise",message:"Choisissez une musique depuis le catalogue RHAZN."});
      return;
    }
    if (audioSegmentIndex<0) {
      notify({tone:"danger",title:"Segment requis",message:"Choisissez un segment audio (S1 ou S2)."});
      return;
    }

    // ✅ Générer si pas encore fait
    let finalUri = draft.finalVideoUri;
    if (!finalUri) {
      notify({tone:"info",title:"Génération en cours…",message:"Fusion audio/vidéo — veuillez patienter."});
      finalUri = await generateVideo();
      if (!finalUri) {
        notify({tone:"danger",title:"Échec génération",message:"La fusion audio/vidéo a échoué. Réessayez."});
        return;
      }
      setNotice(null);
    }

    // ✅ CADNA check
    notify({tone:"info",title:"Vérification CADNA…",message:"Contrôle des droits d'auteur…"});
    const dup = await checkDuplicate({title:t,fileUri:finalUri,durationSeconds:durationSec,contentType:"SUSPENTZ"});
    if (dup.is_duplicate) {
      setNotice(null); setDupResult(dup); setShowDupModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(()=>{});
      return;
    }

    setNotice(null); setUploading(true);
    try {
      const {data:auth} = await supabase.auth.getUser();
      const user = auth?.user; if (!user) { router.replace("/auth/login"); return; }

      if (!isSupreme&&(acsetBalance??0)<acsetCost) {
        notify({tone:"danger",title:"ACSET insuffisants",message:`Requis:${acsetCost} — Disponible:${acsetBalance??0}`});
        return;
      }

      notify({tone:"info",title:"Upload en cours…",message:"Envoi sécurisé…"});

      const ext         = (finalUri.split(".").pop()?.toLowerCase()==="mov") ? "mov" : "mp4";
      const contentType = ext==="mov" ? "video/quicktime" : "video/mp4";
      const session     = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) { router.replace("/auth/login"); return; }

      const signRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sign-upload`,
        {method:"POST",headers:{"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({ext,contentType})}
      );
      if (!signRes.ok) throw new Error(`URL signée (${signRes.status})`);
      const {signedUrl,path:signedPath} = JSON.parse(await signRes.text());

      // ✅ Uploader la vidéo FINALE (audio déjà fusionné par FFmpegKit)
      const up = await FileSystem.uploadAsync(signedUrl, finalUri, {
        httpMethod:"PUT",
        uploadType:FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers:{"Content-Type":contentType},
      });
      if (up.status!==200&&up.status!==201) throw new Error(`Upload (${up.status})`);

      const {data:pub} = supabase.storage.from("suspentz").getPublicUrl(signedPath);
      if (!pub?.publicUrl) throw new Error("URL publique introuvable");

      const desc = `[THÈME]:${th}\n---\n${description.trim()}`;

      const {data:rpcData,error:rpcErr} = await supabase.rpc("publish_suspentz_final",{
        p_title:            t,
        p_media_path:       pub.publicUrl,
        p_description:      desc||null,
        p_duration_seconds: durationSec,
        p_cadna_status:     isSupreme?"approved":"pending",
        // ✅ Audio fusionné dans la vidéo via FFmpegKit → banq lit la vidéo directement
        // pas besoin de audio_path séparé
      });
      if (rpcErr) throw rpcErr;

      const contentId = typeof rpcData==="string"?rpcData:rpcData?.id;
      if (contentId) {
        await registerContentHash(contentId,{title:t,fileUri:finalUri,durationSeconds:durationSec,contentType:"SUSPENTZ"});
      }

      // ✅ Effacer le draft après publication réussie
      await discardDraft();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
      notify({
        tone:"ok",title:"Suspentz publié ✅",message:"Validation CADNA en cours.",
        actionLabel:"Voir le feed",onAction:()=>router.replace("/banq/suspentz"),
      });
    } catch(e:any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(()=>{});
      notify({tone:"danger",title:"Échec",message:e?.message||"Erreur réseau."});
    } finally { setUploading(false); }
  };

  // ─────────────────────────────────────────────────────────────
  // EDITOR STEP — plein écran
  // ─────────────────────────────────────────────────────────────
  if (step==="editor" && videoUri) {
    if (!selectedTrack) {
      return (
        <View style={{flex:1,backgroundColor:C.bg}}>
          <MusicCatalogModal
            visible={true}
            onClose={()=>{setStep("home"); updateDraft({videoUri:null});}}
            selectedId={null}
            onSelect={track=>{handleSelectTrack(track);}}
          />
        </View>
      );
    }
    return (
      <SuspentzEditor
        videoUri={videoUri}
        durationSec={durationSec}
        track={selectedTrack}
        onConfirm={(result:EditorResult) => {
          updateDraft({audioSegmentIndex:result.audioSegmentIndex, finalVideoUri:null});
          setStep("form");
        }}
        onBack={()=>{KILL(); setStep("home"); updateDraft({videoUri:null});}}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={{flex:1,backgroundColor:C.bg,paddingTop:insets.top}}>

      {/* Modals */}
      <MusicCatalogModal
        visible={showCatalogHome}
        onClose={()=>setShowCatalogHome(false)}
        selectedId={selectedTrack?.id??null}
        onSelect={track=>{
          handleSelectTrack(track);
          setShowCatalogHome(false);
          if (videoUri) setStep("editor");
        }}
      />
      <DuplicateModal
        visible={showDupModal} result={dupResult} isSupreme={isSupreme}
        onCancel={()=>{setShowDupModal(false);setDupResult(null);}}
        onForce={async()=>{
          if(dupResult?.reason==="TITLE_SIMILARITY"){setShowDupModal(false);setDupResult(null);await publish();}
        }}
      />

      {/* ✅ Recovery banner */}
      {hasRecovery && (
        <RecoveryBanner
          onAccept={async()=>{await acceptRecovery(); setStep(draft.step||"home");}}
          onDecline={declineRecovery}
        />
      )}

      {/* Notice overlay */}
      {notice && (
        <View style={st.noticeWrap} pointerEvents="auto">
          <View style={st.notice}>
            <View style={st.noticeTop}>
              <View style={[st.dot,{backgroundColor:notice.tone==="ok"?C.ok:notice.tone==="danger"?C.danger:C.blue}]}/>
              <Text style={st.noticeTitle}>{notice.title}</Text>
              <Pressable onPress={()=>setNotice(null)} style={st.noticeClose}>
                <Ionicons name="close" size={16} color={C.muted}/>
              </Pressable>
            </View>
            <Text style={st.noticeText}>{notice.message}</Text>
            {notice.actionLabel&&notice.onAction&&(
              <Pressable onPress={notice.onAction} style={st.noticeBtn}>
                <Text style={st.noticeBtnTxt}>{notice.actionLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Header */}
      <View style={st.header}>
        <View style={{flex:1}}>
          <Text style={st.headerTitle}>Publier</Text>
          <Text style={st.headerSub}>
            Suspentz · max {MAX_DURATION_SEC}s · <Text style={{color:C.gold,fontWeight:"900"}}>{acsetCost} ACSET</Text>
          </Text>
        </View>
        <View style={st.creditsBadge}>
          {creditsLoading
            ?<ActivityIndicator size="small" color={C.gold}/>
            :<>
              <Ionicons name="sparkles-outline" size={13} color={C.gold}/>
              <Text style={st.creditsVal}>{isSupreme?"∞":acsetBalance??"—"}</Text>
              <Text style={st.creditsLbl}>ACSET</Text>
            </>
          }
        </View>
      </View>

      {/* Step pills */}
      <View style={st.stepRow}>
        {(["home","editor","form"] as Step[]).map((sv,i)=>{
          const done   = (step==="editor"&&i<1)||(step==="form"&&i<2);
          const active = step===sv;
          return (
            <View key={sv} style={{flexDirection:"row",alignItems:"center"}}>
              <View style={[st.stepPill,active&&st.stepPillActive,done&&st.stepPillDone]}>
                <Ionicons
                  name={i===0?"images-outline":i===1?"create-outline":"checkmark-outline" as any}
                  size={11} color={active?"#000":done?C.ok:C.gray}
                />
                <Text style={[st.stepTxt,active&&{color:"#000"},done&&{color:C.ok}]}>
                  {["Source","Éditeur","Détails"][i]}
                </Text>
              </View>
              {i<2&&<View style={[st.stepLine,done&&{backgroundColor:C.ok}]}/>}
            </View>
          );
        })}
      </View>

      {/* ✅ Draft status bar */}
      <DraftStatusBar status={draftStatus} progress={genProgress}/>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"} keyboardVerticalOffset={10}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:16,paddingTop:14,paddingBottom:FOOTER_H+30}}
        >

          {/* ══════════════════════════════════════════════
              HOME STEP
          ══════════════════════════════════════════════ */}
          {step==="home" && (
            <View style={{gap:16}}>
              <Text style={st.sectionTitle}>Importer une vidéo</Text>
              <TouchableOpacity style={st.galleryBtn} onPress={pickGallery} activeOpacity={0.85}>
                <View style={st.galleryIcon}>
                  <Ionicons name="images" size={30} color={C.blue}/>
                </View>
                <View style={{flex:1}}>
                  <Text style={st.galleryBtnTitle}>Choisir depuis la galerie</Text>
                  <Text style={st.galleryBtnSub}>MP4 · MOV · max {MAX_DURATION_SEC}s</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.gray}/>
              </TouchableOpacity>

              <View style={st.divider}/>
              <Text style={st.sectionTitle}>Musique RHAZN</Text>

              {selectedTrack ? (
                <View style={st.trackCard}>
                  <View style={st.trackIcon}><Ionicons name="musical-note" size={16} color={C.gold}/></View>
                  <View style={{flex:1}}>
                    <Text style={st.trackName} numberOfLines={1}>{selectedTrack.title}</Text>
                    <Text style={st.trackDur}>
                      {fmtTime(selectedTrack.duration_sec)} · S{audioSegmentIndex+1} {fmtTime(audioStartSec)}→{fmtTime(audioEndSec)}
                    </Text>
                  </View>
                  <Pressable onPress={()=>setShowCatalogHome(true)} style={st.swapBtn}>
                    <Ionicons name="swap-horizontal" size={15} color={C.gray}/>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={()=>setShowCatalogHome(true)} style={st.addMusicBtn}>
                  <Ionicons name="musical-notes" size={18} color={C.gold}/>
                  <Text style={st.addMusicTxt}>Choisir dans le catalogue RHAZN</Text>
                </Pressable>
              )}

              {/* ✅ Indicateur draft si brouillon existant */}
              {draft.finalVideoUri && (
                <View style={{flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(52,199,89,0.08)",borderRadius:10,padding:10,borderWidth:1,borderColor:"rgba(52,199,89,0.25)"}}>
                  <Ionicons name="checkmark-circle" size={14} color={C.ok}/>
                  <Text style={{color:C.ok,fontWeight:"700",fontSize:11,flex:1}}>
                    Vidéo finale prête — continuez vers la publication
                  </Text>
                </View>
              )}

              {videoUri&&selectedTrack&&(
                <TouchableOpacity style={st.continueBtn} onPress={()=>setStep("editor")} activeOpacity={0.85}>
                  <Text style={st.continueTxt}>
                    {draft.finalVideoUri ? "Modifier ou publier" : "Ouvrir l'éditeur"}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#000"/>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════
              FORM STEP
          ══════════════════════════════════════════════ */}
          {step==="form" && (
            <View style={{gap:14}}>
              <Pressable onPress={()=>setStep("editor")} style={st.backBtn}>
                <Ionicons name="chevron-back" size={16} color={C.gold}/>
                <Text style={st.backBtnTxt}>Retour à l'éditeur</Text>
              </Pressable>

              {/* Résumé */}
              <View style={st.summaryCard}>
                <Text style={[st.sectionTitle,{fontSize:12,marginBottom:6}]}>Résumé</Text>
                <View style={st.summaryRow}>
                  <View style={st.summaryItem}>
                    <Ionicons name="videocam" size={11} color={C.muted}/>
                    <Text style={st.summaryVal}>{durationSec}s</Text>
                  </View>
                  {selectedTrack&&(
                    <View style={st.summaryItem}>
                      <Ionicons name="musical-notes" size={11} color={C.gold}/>
                      <Text style={[st.summaryVal,{color:C.gold}]} numberOfLines={1}>{selectedTrack.title}</Text>
                    </View>
                  )}
                  {audioSegmentIndex>=0&&(
                    <View style={st.summaryItem}>
                      <View style={{width:6,height:6,borderRadius:3,backgroundColor:SEG_COLORS[audioSegmentIndex]?.border??C.gold}}/>
                      <Text style={st.summaryVal}>S{audioSegmentIndex+1} · {fmtTime(audioStartSec)}→{fmtTime(audioEndSec)}</Text>
                    </View>
                  )}
                  {draft.finalVideoUri&&(
                    <View style={st.summaryItem}>
                      <Ionicons name="checkmark-circle" size={11} color={C.ok}/>
                      <Text style={[st.summaryVal,{color:C.ok}]}>Vidéo finale prête</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Timeline preview */}
              {videoUri&&selectedTrack&&(
                <UnifiedTimeline
                  videoUri={videoUri} durationSec={durationSec}
                  playPositionSec={playPos} selectedTrack={selectedTrack}
                  audioSegmentIndex={audioSegmentIndex}
                  audioStartSec={audioStartSec} audioEndSec={audioEndSec}
                  onSeek={setPlayPos}
                />
              )}

              {/* Formulaire */}
              <View style={{position:"relative",zIndex:20}}>
                <TextInput
                  placeholder="Titre (obligatoire)" placeholderTextColor={C.gray}
                  style={st.input} value={title}
                  onChangeText={v=>updateDraft({title:v})} maxLength={80} returnKeyType="next"
                />
                <TextInput
                  placeholder="Thème (obligatoire)" placeholderTextColor={C.gray}
                  style={st.input} value={theme}
                  onChangeText={v=>{updateDraft({theme:v});setShowThemes(v.trim().length>0);}}
                  onFocus={()=>{if(theme.trim())setShowThemes(true);}}
                  onBlur={()=>setTimeout(()=>setShowThemes(false),150)} returnKeyType="done"
                />
                {showThemes&&filteredThemes.length>0&&(
                  <View style={st.themeDropdown}>
                    {filteredThemes.map(t=>(
                      <Pressable key={t}
                        onPress={()=>{updateDraft({theme:t});setShowThemes(false);Haptics.selectionAsync().catch(()=>{});}}
                        style={({pressed})=>[st.themeRow,pressed&&{backgroundColor:"rgba(255,255,255,0.06)"}]}
                      >
                        <Text style={st.themeTxt}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <TextInput
                placeholder="Auteur (obligatoire)" placeholderTextColor={C.gray}
                style={st.input} value={author}
                onChangeText={v=>updateDraft({author:v})} returnKeyType="next"
              />
              <TextInput
                placeholder="Description (optionnelle)" placeholderTextColor={C.gray}
                style={[st.input,{height:80}]} multiline
                value={description} onChangeText={v=>updateDraft({description:v})} textAlignVertical="top"
              />

              {checkingDup&&(
                <View style={st.checkRow}>
                  <ActivityIndicator size="small" color={C.gold}/>
                  <Text style={st.checkTxt}>Vérification CADNA…</Text>
                </View>
              )}

              {/* ✅ Barre de progression FFmpeg */}
              {draftStatus==="processing" && genProgress && (
                <View style={{height:4,backgroundColor:"rgba(255,255,255,0.10)",borderRadius:2,overflow:"hidden"}}>
                  <View style={{
                    height:4,
                    width:`${genProgress.percent}%` as any,
                    backgroundColor:C.gold,borderRadius:2,
                  }}/>
                </View>
              )}

              {/* ✅ Bouton Générer + Publier */}
              <Pressable
                onPress={publish}
                disabled={uploading||checkingDup||isProcessing}
                style={({pressed})=>[
                  st.publishBtn,
                  (uploading||checkingDup||isProcessing)&&{opacity:0.72},
                  pressed&&!uploading&&{transform:[{scale:0.99}]},
                ]}
              >
                {uploading||checkingDup||isProcessing
                  ?<View style={{flexDirection:"row",alignItems:"center",gap:10}}>
                    <ActivityIndicator color="#000"/>
                    <Text style={st.publishTxt}>
                      {isProcessing
                        ? `Génération ${genProgress?.percent??0}%`
                        : uploading ? "Publication…" : "Vérification…"
                      }
                    </Text>
                  </View>
                  :<View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                    <Ionicons name={draft.finalVideoUri?"cloud-upload-outline":"settings-outline"} size={18} color="#000"/>
                    <Text style={st.publishTxt}>
                      {draft.finalVideoUri
                        ? `Publier · ${acsetCost} ACSET`
                        : `Générer + Publier · ${acsetCost} ACSET`
                      }
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#000"/>
                  </View>
                }
              </Pressable>

              {/* Indicateur vidéo finale prête */}
              {draft.finalVideoUri&&!isProcessing&&(
                <Text style={{color:"rgba(52,199,89,0.80)",fontSize:11,textAlign:"center",fontWeight:"600"}}>
                  ✓ Vidéo finale prête — aucun recalcul nécessaire
                </Text>
              )}

              <Text style={st.footnote}>
                Après {acsetCost} ACSET, votre Suspentz est envoyé à{" "}
                <Text style={{color:C.gold,fontWeight:"900"}}>CADNA</Text> pour validation.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  header:         {flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:C.hairline},
  headerTitle:    {color:C.white,fontSize:22,fontWeight:"900"},
  headerSub:      {color:C.gray,fontSize:11,marginTop:2},
  creditsBadge:   {flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:10,paddingVertical:7,borderRadius:12,borderWidth:1,borderColor:"rgba(212,175,55,0.35)",backgroundColor:C.goldDim},
  creditsVal:     {color:C.gold,fontWeight:"900",fontSize:14},
  creditsLbl:     {color:"rgba(212,175,55,0.60)",fontWeight:"800",fontSize:9},
  stepRow:        {flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingVertical:10},
  stepPill:       {flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:10,paddingVertical:5,borderRadius:14,backgroundColor:"rgba(255,255,255,0.06)",borderWidth:1,borderColor:C.hairline},
  stepPillActive: {backgroundColor:C.gold,borderColor:C.gold},
  stepPillDone:   {backgroundColor:"rgba(52,199,89,0.12)",borderColor:"rgba(52,199,89,0.40)"},
  stepTxt:        {color:C.gray,fontSize:11,fontWeight:"800"},
  stepLine:       {width:14,height:2,backgroundColor:"rgba(255,255,255,0.10)",marginHorizontal:2},
  sectionTitle:   {color:C.white,fontWeight:"900",fontSize:14},
  divider:        {height:1,backgroundColor:C.hairline},
  galleryBtn:     {flexDirection:"row",alignItems:"center",gap:14,backgroundColor:C.card,borderRadius:18,padding:18,borderWidth:1,borderColor:"rgba(0,122,255,0.30)"},
  galleryIcon:    {width:56,height:56,borderRadius:16,backgroundColor:"rgba(0,122,255,0.12)",borderWidth:1.5,borderColor:"rgba(0,122,255,0.35)",alignItems:"center",justifyContent:"center"},
  galleryBtnTitle:{color:C.white,fontWeight:"900",fontSize:14},
  galleryBtnSub:  {color:C.gray,fontSize:11,marginTop:2},
  trackCard:      {flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"rgba(212,175,55,0.07)",borderRadius:14,padding:12,borderWidth:1,borderColor:"rgba(212,175,55,0.28)"},
  trackIcon:      {width:36,height:36,borderRadius:10,backgroundColor:C.goldDim,alignItems:"center",justifyContent:"center"},
  trackName:      {color:C.white,fontWeight:"700",fontSize:12},
  trackDur:       {color:C.gray,fontSize:10,marginTop:1},
  swapBtn:        {width:34,height:34,borderRadius:10,backgroundColor:"rgba(255,255,255,0.06)",alignItems:"center",justifyContent:"center"},
  addMusicBtn:    {flexDirection:"row",alignItems:"center",gap:10,padding:14,borderRadius:14,borderWidth:1,borderStyle:"dashed",borderColor:"rgba(212,175,55,0.40)"},
  addMusicTxt:    {color:C.gold,fontWeight:"800",fontSize:13,flex:1},
  continueBtn:    {flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,backgroundColor:C.gold,borderRadius:16,paddingVertical:14,marginTop:4,shadowColor:C.gold,shadowOpacity:0.35,shadowRadius:10,elevation:6},
  continueTxt:    {color:"#000",fontWeight:"900",fontSize:15},
  backBtn:        {flexDirection:"row",alignItems:"center",gap:4,alignSelf:"flex-start"},
  backBtnTxt:     {color:C.gold,fontWeight:"700",fontSize:13},
  summaryCard:    {backgroundColor:C.card,borderRadius:14,padding:14,borderWidth:1,borderColor:C.hairline},
  summaryRow:     {flexDirection:"row",flexWrap:"wrap",gap:8},
  summaryItem:    {flexDirection:"row",alignItems:"center",gap:5,backgroundColor:"rgba(255,255,255,0.04)",borderRadius:10,paddingHorizontal:8,paddingVertical:5},
  summaryVal:     {color:C.muted,fontSize:11,fontWeight:"600"},
  input:          {backgroundColor:"#111",color:C.white,borderRadius:12,padding:13,marginBottom:10,borderWidth:1,borderColor:C.border,fontSize:14},
  themeDropdown:  {position:"absolute",top:109,left:0,right:0,backgroundColor:"#111",borderRadius:12,borderWidth:1,borderColor:C.border,maxHeight:200,overflow:"hidden",zIndex:999},
  themeRow:       {paddingVertical:11,paddingHorizontal:13,borderBottomWidth:1,borderBottomColor:C.hairline},
  themeTxt:       {color:C.white,fontSize:13},
  checkRow:       {flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(212,175,55,0.08)",borderRadius:10,padding:10,borderWidth:1,borderColor:"rgba(212,175,55,0.25)"},
  checkTxt:       {color:C.gold,fontWeight:"700",fontSize:12},
  publishBtn:     {backgroundColor:C.gold,paddingVertical:15,borderRadius:16,alignItems:"center",justifyContent:"center"},
  publishTxt:     {color:"#000",fontWeight:"900",fontSize:16},
  footnote:       {color:C.gray,fontSize:11,lineHeight:16,textAlign:"center"},
  noticeWrap:     {position:"absolute",left:0,right:0,top:0,bottom:0,justifyContent:"center",alignItems:"center",paddingHorizontal:20,backgroundColor:"rgba(0,0,0,0.55)",zIndex:5000},
  notice:         {backgroundColor:"#111",borderRadius:20,borderWidth:1,borderColor:"rgba(255,255,255,0.15)",padding:18,width:"100%",maxWidth:420},
  noticeTop:      {flexDirection:"row",alignItems:"center",gap:10,marginBottom:8},
  dot:            {width:10,height:10,borderRadius:99},
  noticeTitle:    {color:C.white,fontWeight:"900",fontSize:14,flex:1},
  noticeClose:    {width:28,height:28,borderRadius:10,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(255,255,255,0.05)"},
  noticeText:     {color:C.muted,lineHeight:18,fontSize:12.5},
  noticeBtn:      {marginTop:10,borderRadius:12,backgroundColor:C.blue,paddingVertical:12,alignItems:"center"},
  noticeBtnTxt:   {color:"#fff",fontWeight:"900"},
});