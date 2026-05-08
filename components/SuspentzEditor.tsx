/**
 * SuspentzEditor.tsx — Studio-grade audio/video editor
 *
 * ✅ Bug 1 — Audio fantôme : KILL synchrone, zéro chevauchement
 * ✅ Bug 2 — Audio scrub parasite : scrubbing = silence forcé, toujours
 * ✅ Bug 3 — Vidéo pause involontaire : seek vidéo en temps réel via currentTime
 * ✅ Bug 4 — "Modifier" redirige mal : onBack() propre, onPublish séparé
 * ✅ Feature 1 — Scrubbing segment audio libre dans la timeline
 * ✅ Feature 2 — Bouton Publier dans le mode Aperçu
 */

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
    useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
    Dimensions,
    GestureResponderEvent,
    PanResponder,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useDraft } from "../hooks/useDraft";


// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
export type MusicTrack = {
  id: string;
  title: string;
  file_url: string;
  duration_sec: number;
};

export type EditorResult = {
  audioStartSec:     number;
  audioEndSec:       number;
  audioSegmentIndex: number;
  selectedTrack:     MusicTrack;
};

type Props = {
  videoUri:    string;
  durationSec: number;
  track:       MusicTrack;
  onConfirm:   (r: EditorResult) => void;   // → PublishSuspentz
  onBack:      () => void;                   // → écran précédent (galerie / home)
};

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get("window");
const PX_SEC  = 64;   // pixels par seconde dans la timeline
const THUMB_H = 54;   // hauteur strip vidéo
const WAVE_H  = 48;   // hauteur strip audio
const RULER_H = 20;   // hauteur règle

const C = {
  bg:     "#080808",
  card:   "#111111",
  gold:   "#D4AF37",
  blue:   "#0A84FF",
  green:  "#30D158",
  danger: "#FF3B30",
  white:  "#FFFFFF",
  muted:  "rgba(255,255,255,0.38)",
  border: "rgba(255,255,255,0.07)",
};

const SEG = [
  { border:"rgba(212,175,55,0.90)", fill:"rgba(212,175,55,0.15)", text:"#D4AF37", dark:"rgba(212,175,55,0.07)", label:"S1" },
  { border:"rgba(0,122,255,0.90)",  fill:"rgba(0,122,255,0.15)",  text:"#4DA6FF", dark:"rgba(0,122,255,0.07)",  label:"S2" },
] as const;

const fmt = (s: number) =>
  `${String(Math.floor(Math.max(0,s)/60)).padStart(2,"0")}:${String(
    Math.floor(Math.max(0,s)%60)).padStart(2,"0")}`;
const clamp = (v:number,lo:number,hi:number) => Math.min(hi,Math.max(lo,v));

// ─────────────────────────────────────────────────────────────────
// ✅ AUDIO ENGINE — UN SEUL SON POSSIBLE À TOUT MOMENT
//
// Règles absolues :
//   1. kill()  → stop + unload immédiat (sync fire-and-forget)
//   2. play()  → kill d'abord, puis createAsync
//   3. pause() → pauseAsync fire-and-forget (sub-16ms)
//   4. Pendant scrubbing : aucune API audio n'est appelée
// ─────────────────────────────────────────────────────────────────
function useAudioEngine() {
  const sndRef = useRef<Audio.Sound | null>(null);
  const opSeq  = useRef(0); // séquence pour annuler les ops stale

  // ✅ kill — synchrone fire-and-forget
  const kill = useCallback(() => {
    const s = sndRef.current;
    sndRef.current = null;
    if (!s) return;
    s.stopAsync().catch(()=>{});
    s.unloadAsync().catch(()=>{});
  }, []);

  // ✅ pause — synchrone fire-and-forget, < 1ms
  const pause = useCallback(() => {
    sndRef.current?.pauseAsync().catch(()=>{});
  }, []);

  // ✅ play — kill d'abord, puis charge+joue
  const play = useCallback(async (uri:string, startMs:number, loop:boolean) => {
    const seq = ++opSeq.current;
    kill(); // synchrone — ancien son mort avant await
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        allowsRecordingIOS: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { positionMillis: startMs, shouldPlay: true, volume: 1, isLooping: loop }
      );
      if (opSeq.current !== seq) { sound.unloadAsync().catch(()=>{}); return; }
      sndRef.current = sound;
    } catch (e) { console.warn("AudioEngine.play:", e); }
  }, [kill]);

  // ✅ seek — repositionne sans changer l'état play/pause
  const seek = useCallback(async (ms:number) => {
    try { await sndRef.current?.setPositionAsync(ms); } catch {}
  }, []);

  // Cleanup automatique au démontage
  useEffect(() => () => { kill(); }, [kill]);

  return { play, pause, kill, seek };
}

// ─────────────────────────────────────────────────────────────────
// RULER
// ─────────────────────────────────────────────────────────────────
function Ruler({ total, pxSec }: { total:number; pxSec:number }) {
  const step = total <= 20 ? 1 : total <= 60 ? 5 : 10;
  const marks: number[] = [];
  for (let t = 0; t <= Math.ceil(total); t += step) marks.push(t);
  return (
    <View style={{ height:RULER_H, position:"relative" }}>
      {marks.map(t => (
        <View key={t} style={{ position:"absolute", left: t*pxSec, alignItems:"center" }}>
          <View style={{ width:1, height:5, backgroundColor:"rgba(255,255,255,0.20)" }}/>
          <Text style={{ color:"rgba(255,255,255,0.26)", fontSize:6.5, fontWeight:"700", marginTop:1 }}>
            {fmt(t)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────
// WAVEFORM SCRUBBER — PanResponder + Animated (stable Android/iOS)
// Pas de Reanimated worklets, pas de GestureDetector imbriqué
// ─────────────────────────────────────────────────────────────────
type WaveformScrubberProps = {
  segIndex:     number;
  segStart:     number;
  segEnd:       number;
  segDur:       number;
  track:        MusicTrack;
  isListening:  boolean;
  isChosen:     boolean;
  vidPct:       number;
  bars:         number[];
  durationSec:  number;
  onListen:     (i: number) => void;
  onChoose:     (i: number) => void;
  onScrubStart: () => void;
  onScrubEnd:   (posInSeg: number) => void;
};

function WaveformScrubber({
  segIndex, segStart, segEnd, segDur, track,
  isListening, isChosen, vidPct, bars, durationSec,
  onListen, onChoose, onScrubStart, onScrubEnd,
}: WaveformScrubberProps) {
  const col = SEG[segIndex];

  // ── State ──────────────────────────────────────────────────────
  const [cardW,         setCardW]         = useState(1);
  const [isScrubbing,   setIsScrubbing]   = useState(false);
  const [scrubPct,      setScrubPct]      = useState(0);   // 0..1
  const [scrubTime,     setScrubTime]     = useState(segStart);
  const cardWRef = useRef(1);

  const cursorLeft = scrubPct * Math.max(1, cardW);

  // ── PanResponder — stable, pas de worklets ─────────────────────
  // ✅ FIX — refs (ULTRA FLUIDE)
// ✅ FIX — refs (0 re-render pour le curseur)
const scrubXRef  = useRef(0);
const rafRef     = useRef<number | null>(null);
const cursorRef  = useRef<View>(null);
const startXRef  = useRef(0);

const pan = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,

    onPanResponderGrant: () => {
      startXRef.current = scrubXRef.current;
      setIsScrubbing(true);    // ✅ affiche le label
      onScrubStart?.();
    },

    onPanResponderMove: (_, gesture) => {
      const width = cardWRef.current || 1;

      scrubXRef.current = clamp(
        startXRef.current + gesture.dx,
        0,
        width
      );

      // ✅ curseur ultra fluide (natif, 0 re-render)
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          cursorRef.current?.setNativeProps({
            style: { transform: [{ translateX: scrubXRef.current }] }
          });
          rafRef.current = null;
        });
      }

      // ✅ state léger pour les barres + timestamp (16ms max)
      const pct = scrubXRef.current / width;
      setScrubPct(pct);
      setScrubTime(segStart + pct * segDur);
    },

    onPanResponderRelease: () => {
      const width = cardWRef.current || 1;
      const pct   = scrubXRef.current / width;
      const t     = segStart + pct * segDur;

      setIsScrubbing(false);   // ✅ cache le label
      onScrubEnd?.(t);
    },
  })
).current;



  // Reset curseur quand isListening s'arrête
  useEffect(() => {
    if (!isListening && !isScrubbing) {
      setScrubPct(0);
      setScrubTime(segStart);
    }

    }, [isListening, segStart]);


  return (
    <View style={[
      sc.card,
      isChosen && { borderColor: col.border, backgroundColor: col.dark },
    ]}>
      {/* Barre couleur */}
      <View style={[sc.topLine, { backgroundColor: col.border }]}/>

      {/* Header */}
      <View style={sc.head}>
        <View style={[sc.badge, { backgroundColor: col.fill, borderColor: col.border }]}>
          <Text style={[sc.badgeTxt, { color: col.text }]}>{col.label}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[sc.time, { color: col.text }]}>
            {isScrubbing
              ? `${fmt(scrubTime)} / ${fmt(segEnd)}`
              : `${fmt(segStart)}–${fmt(segEnd)}`
            }
          </Text>
          <Text style={sc.dur}>{Math.round(segDur)}s</Text>
        </View>

        {/* ▶ Play */}
        <Pressable
          style={[sc.playBtn, isListening && { backgroundColor: col.fill, borderColor: col.border }]}
          onPress={() => onListen(segIndex)}
          hitSlop={8}
        >
          <Ionicons
            name={isListening ? "pause" : "play"}
            size={15}
            color={isListening ? col.text : C.muted}
          />
        </Pressable>
      </View>

      {/* ✅ Waveform + curseur — PanResponder sur toute la zone */}
      <View
        style={sc.waveWrap}
        onLayout={e => {
          const w = e.nativeEvent.layout.width;
          setCardW(w);
          cardWRef.current = w;
        }}
       {...pan.panHandlers}

      >
        {/* Barres waveform */}
        <View style={sc.barsRow}>
          {bars.map((h, bi) => {
            const barPct  = bi / Math.max(1, bars.length - 1);
            const inVideo = barPct <= vidPct;
            const pastCursor = barPct <= scrubPct && scrubPct > 0;
            return (
              <View key={bi} style={{
                flex: 1,
                height: clamp(Math.round(h * 32), 2, 32),
                backgroundColor: pastCursor
                  ? col.border
                  : inVideo
                    ? `${col.border}70`
                    : "rgba(255,255,255,0.09)",
                marginHorizontal: 0.8,
                borderRadius: 1.5,
              }}/>
            );
          })}
        </View>

        {/* ✅ Curseur de position */}
      <View
  ref={cursorRef}
  pointerEvents="none"
  style={[sc.cursor, {
    transform: [{ translateX: 0 }],
    backgroundColor: col.text,
    shadowColor: col.text,
  }]}
>
  <View style={[sc.cursorHandle, { backgroundColor: col.text }]}/>
</View>



        {/* Label timestamp pendant scrub */}
        {isScrubbing && (
          <View style={[sc.scrubLabel, {
            left: clamp(cursorLeft - 20, 0, cardW - 44),
            backgroundColor: col.border,
          }]}>
            <Text style={sc.scrubLabelTxt}>{fmt(scrubTime)}</Text>
          </View>
        )}

        {/* Hint glisser (quand pas en cours) */}
        {!isScrubbing && !isListening && scrubPct === 0 && (
          <View style={sc.hint} pointerEvents="none">
            <Text style={sc.hintTxt}>← glissez pour explorer →</Text>
          </View>
        )}
      </View>

      {/* Pied info */}
      <View style={sc.foot}>
        <Text style={sc.info}>
          {durationSec > 0
            ? durationSec > segDur
              ? `↺ boucle · vidéo ${Math.round(durationSec)}s`
              : `✂ coupé à ${fmt(durationSec)}`
            : ""
          }
        </Text>
      </View>

      {/* Choisir / Sélectionné */}
      {isChosen ? (
        <View style={[sc.chosenBadge, { backgroundColor: col.fill, borderColor: col.border }]}>
          <Ionicons name="checkmark-circle" size={13} color={col.text}/>
          <Text style={[sc.chosenTxt, { color: col.text }]}>Sélectionné</Text>
        </View>
      ) : (
        <Pressable style={sc.selectBtn} onPress={() => onChoose(segIndex)}>
          <Text style={sc.selectBtnTxt}>Choisir {col.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  card:          { flex:1, backgroundColor:"#111", borderRadius:14, borderWidth:1.5, borderColor:"rgba(255,255,255,0.09)", overflow:"hidden" },
  topLine:       { height:3 },
  head:          { flexDirection:"row", alignItems:"center", gap:7, paddingHorizontal:10, paddingTop:8, paddingBottom:4 },
  badge:         { borderRadius:6, paddingHorizontal:7, paddingVertical:2, borderWidth:1 },
  badgeTxt:      { fontSize:10, fontWeight:"900" },
  time:          { fontSize:10, fontWeight:"800" },
  dur:           { color:"rgba(255,255,255,0.28)", fontSize:9, marginTop:1 },
  playBtn:       { width:32, height:32, borderRadius:16, backgroundColor:"rgba(255,255,255,0.07)", borderWidth:1, borderColor:"rgba(255,255,255,0.11)", alignItems:"center", justifyContent:"center" },
  waveWrap:      { marginHorizontal:10, marginBottom:4, position:"relative", height:50, justifyContent:"center" },
  barsRow:       { flexDirection:"row", alignItems:"center", height:50, position:"absolute", left:0, right:0 },
  cursor:        { position:"absolute", top:0, bottom:0, width:3, borderRadius:2, shadowOpacity:0.90, shadowRadius:4, elevation:8, zIndex:10 },
  cursorHandle:  { position:"absolute", top:-5, left:-3.5, width:10, height:10, borderRadius:5 },
  scrubLabel:    { position:"absolute", top:-22, borderRadius:6, paddingHorizontal:6, paddingVertical:2, zIndex:20 },
  scrubLabelTxt: { color:"#000", fontSize:9, fontWeight:"900" },
  hint:          { position:"absolute", bottom:2, left:0, right:0, alignItems:"center" },
  hintTxt:       { color:"rgba(255,255,255,0.18)", fontSize:8, fontWeight:"700" },
  foot:          { paddingHorizontal:10, paddingBottom:4, minHeight:16 },
  info:          { color:"rgba(255,255,255,0.24)", fontSize:9, fontWeight:"600" },
  chosenBadge:   { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, margin:8, marginTop:2, borderRadius:8, paddingVertical:8, borderWidth:1 },
  chosenTxt:     { fontSize:11, fontWeight:"900" },
  selectBtn:     { margin:8, marginTop:2, backgroundColor:"rgba(255,255,255,0.07)", borderRadius:8, paddingVertical:9, alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.11)" },
  selectBtnTxt:  { color:"#FFF", fontSize:11, fontWeight:"800" },
});


export default function SuspentzEditor({
  videoUri, durationSec, track, onConfirm, onBack,
}: Props) {
  const audio = useAudioEngine();
  const { publish, isProcessing } = useDraft();


  // ── Mode : "edit" | "preview" ────────────────────────────────
  const [mode, setMode] = useState<"edit"|"preview">("edit");

  // ── Playback state ────────────────────────────────────────────
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [posSec,     setPosSec]     = useState(0);
  const [barW,       setBarW]       = useState(SW - 28);
  const playingRef   = useRef(false);
  const tickRef      = useRef<ReturnType<typeof setInterval>|null>(null);

  // ── Segment ───────────────────────────────────────────────────
  const segLen     = track.duration_sec / 2;
  const [segIdx, setSegIdx] = useState(-1);
  const audioStart = segIdx >= 0 ? segIdx * segLen : 0;
  const audioEnd   = Math.min(audioStart + segLen, track.duration_sec);
  const doLoop     = (audioEnd - audioStart) > 0 && (audioEnd - audioStart) < durationSec;

  // ── Scrub state ───────────────────────────────────────────────
  // ✅ During scrubbing: video seeks in real time, ZERO audio
  const scrubbing      = useRef(false);
  const wasPlayingRef  = useRef(false); // pour savoir si reprendre après scrub

  // ── Video player ──────────────────────────────────────────────
  const player = useVideoPlayer(videoUri ? { uri: videoUri } : null, p => {
    p.loop  = false;
    p.muted = true; // TOUJOURS — son vient de AudioEngine uniquement
  });


  // ── Timeline layout ───────────────────────────────────────────
  const [tlW, setTlW] = useState(SW);
  const PAD     = tlW / 2;
  const VIDEO_W = Math.max(tlW, durationSec * PX_SEC);
  const TRACK_W = Math.max(tlW, track.duration_sec * PX_SEC);

  // ── Thumbnails ────────────────────────────────────────────────
  const [thumbs, setThumbs] = useState<string[]>([]);
  useEffect(() => {
    if (!videoUri || durationSec <= 0) return;
    let alive = true;
    (async () => {
      const n = Math.min(12, Math.max(4, Math.ceil(durationSec / 2)));
      const out: string[] = [];
      for (let i = 0; i < n; i++) {
        const ms = Math.round((i / Math.max(1,n-1)) * durationSec * 1000);
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(
            videoUri, { time: Math.max(0,ms), quality:0.35 }
          );
          if (alive) out.push(uri);
        } catch { if (alive) out.push(""); }
      }
      if (alive) setThumbs(out);
    })();
    return () => { alive = false; };
  }, [videoUri, durationSec]);

  // ── Waveform bars ─────────────────────────────────────────────
  const waveBars = useMemo(() =>
    Array.from({ length:2 }, (_,si) =>
      Array.from({ length:40 }, (__,i) =>
        clamp(0.15 + Math.abs(Math.sin(i*1.73 + si*segLen*0.05))*0.85, 0.15, 1)
      )
    ), [segLen]);

  // ── Cleanup ───────────────────────────────────────────────────
  useEffect(() => () => {
    playingRef.current = false;
    if (tickRef.current) clearInterval(tickRef.current);
    try { player.pause(); } catch {}
    // audio killed by useAudioEngine cleanup
  }, []);

  // ─────────────────────────────────────────────────────────────
  // ✅ TICK — poll video position every 80ms
  // ─────────────────────────────────────────────────────────────
  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const startTick = useCallback(() => {
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      if (!playingRef.current || scrubbing.current) return;
      try {
        const t = player.currentTime ?? 0;
        posRef.current = t; // ✅ FIX
setPosSec(t);

        if (durationSec > 0 && t >= durationSec - 0.08) {
          _stopAll_internal();
        }
      } catch {}
    }, 80);
  }, [durationSec]);

  // ─────────────────────────────────────────────────────────────
  // ✅ STOP ALL — silence total immédiat, SYNCHRONE
  // Appeler audio.pause() fire-and-forget : < 1ms, pas d'await
  // ─────────────────────────────────────────────────────────────
  const _stopAll_internal = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    stopTick();
    try { player.pause(); } catch {}
    audio.pause(); // ← sync, fire-and-forget, aucune exception possible
  }, [stopTick]);

  const onTLScroll = useCallback((x: number) => {
  if (!scrubbing.current) return;

  const now = Date.now();
  if (now - lastSeek.current < 16) return;
  lastSeek.current = now;

  tlScrollX.current = x;
  const t = clamp(x / PX_SEC, 0, durationSec);
  posRef.current = t;

  if (rafSeek.current) return;
  rafSeek.current = requestAnimationFrame(() => {
    try { player.currentTime = posRef.current; } catch {}
    setPosSec(posRef.current);
    rafSeek.current = null;
  });
}, [durationSec]);


  const stopAll = useCallback(() => {
    _stopAll_internal();
  }, [_stopAll_internal]);

  // ─────────────────────────────────────────────────────────────
  // ✅ PLAY ALL — vidéo + audio en sync depuis pos 0
  // ─────────────────────────────────────────────────────────────
  // ✅ FIX — instant UI (aucun await bloquant)
// ─────────────────────────────────────────────────────────────
// ✅ PLAY ALL — reprise correcte + UI instant + sync parfaite
// ─────────────────────────────────────────────────────────────
const playAll = useCallback(() => {
  if (segIdx < 0) return;

  // ✅ FIX — position réelle (pas le state React)
  let t = posRef.current;

  // ✅ FIX — reset UNIQUEMENT si fin atteinte
  if (t >= durationSec) {
    t = 0;
    posRef.current = 0;
    setPosSec(0);
  }

  // ✅ FIX — stop audio précédent (sync immédiat)
  audio.kill();

  // ✅ FIX — UI instant (aucune latence bouton)
  playingRef.current = true;
  setIsPlaying(true);

  // ✅ FIX — sync vidéo à la bonne position AVANT play
  try {
    player.currentTime = t;
  } catch {}

  try {
    player.play();
  } catch {}

  // ✅ FIX — audio async NON bloquant (pas de await global)
  (async () => {
    const segDur = Math.max(0.1, audioEnd - audioStart);

    // ✅ position audio alignée avec la vidéo
    const audioPos = audioStart + (t % segDur);

    await audio.play(
      track.file_url,
      Math.round(audioPos * 1000),
      doLoop
    );
  })();

  // ✅ FIX — tick basé sur ref (pas de désync)
  startTick();
}, [segIdx, audioStart, audioEnd, durationSec, doLoop]);


  // ─────────────────────────────────────────────────────────────
  // ✅ SEEK VIDEO ONLY — repositionne la vidéo SANS toucher l'audio
  // Utilisé pendant le scrubbing — silence garanti
  // ─────────────────────────────────────────────────────────────
  const seekVideoOnly = useCallback((t: number) => {
    posRef.current = t; // ✅ FIX

    const clamped = clamp(t, 0, durationSec);
    setPosSec(clamped);
    try { player.currentTime = clamped; } catch {}
    // ✅ AUCUN appel audio ici
  }, [durationSec]);

  // ─────────────────────────────────────────────────────────────
  // ✅ SEEK FULL — repositionne vidéo + audio (appelé après scrub end)
  // ─────────────────────────────────────────────────────────────

  const seekFull = useCallback(async (t: number) => {
    // ✅ FIX — clamp + éviter reset invisible
const safeT = Math.max(0, Math.min(t, durationSec));

// ✅ FIX — empêche retour à 0 si déjà à la fin
if (Math.abs(posRef.current - safeT) < 0.01) return;

posRef.current = safeT;

    const clamped = clamp(t, 0, durationSec);
    setPosSec(clamped);
    try { player.currentTime = clamped; } catch {}
    // Repositionner l'audio en sync si un son est chargé
    if (segIdx >= 0) {
      const segDur = Math.max(0.1, audioEnd - audioStart);
      const audioPos = audioStart + (clamped % segDur);
      await audio.seek(Math.round(audioPos * 1000));
    }
  }, [durationSec, segIdx, audioStart, audioEnd]);

  // ─────────────────────────────────────────────────────────────
  // ✅ TIMELINE SCROLL — Bug 2+3 fixes
  //
  // onScrollBeginDrag :
  //   → scrubbing = true
  //   → audio.pause() synchrone (silence immédiat)
  //   → NE PAS pauser la vidéo (Bug 3 fix)
  //
  // onScroll (throttle 16ms) :
  //   → seekVideoOnly() — vidéo suit le doigt en temps réel
  //   → AUCUN appel audio
  //
  // onScrollEndDrag / onMomentumScrollEnd :
  //   → scrubbing = false
  //   → seekFull() — resync audio si nécessaire
  //   → si était en lecture → reprendre
  // ─────────────────────────────────────────────────────────────
  const scrollRef     = useRef<ScrollView>(null);
  const tlScrollX     = useRef(0);
  const posRef = useRef(0);
  const rafSeek = useRef<number | null>(null);


  // Auto-scroll pendant la lecture (hors scrubbing)
  useEffect(() => {
    if (!isPlaying || scrubbing.current || !scrollRef.current) return;
    scrollRef.current.scrollTo({ x: posSec * PX_SEC, animated: false });
  }, [posSec, isPlaying]);

  const onTLScrollBegin = useCallback(() => {
    scrubbing.current   = true;
    wasPlayingRef.current = playingRef.current;
    // ✅ Silence immédiat (sync, pas d'await)
    audio.pause();
    // ✅ NE PAS pauser le player vidéo ici — il continue mais muet
    // La pause vidéo involontaire venait d'ici → Bug 3 corrigé
    stopTick(); // arrête le tick pendant le scrub
  }, [stopTick]);

  const lastSeek = useRef(0);

  const onTLScrollEnd = useCallback(async (x: number) => {
    const t = x / PX_SEC;
posRef.current = t; // ✅ FIX — sync position
    tlScrollX.current = x;
    await seekFull(x / PX_SEC);
    scrubbing.current = false;
    // Reprendre la lecture si on était en lecture avant le scrub
    if (wasPlayingRef.current && segIdx >= 0) {
      const t = x / PX_SEC;
      const segDur = Math.max(0.1, audioEnd - audioStart);
      const audioPos = audioStart + (t % segDur);
      await audio.play(track.file_url, Math.round(audioPos * 1000), doLoop);
      try { player.play(); } catch {}
      playingRef.current = true;
      setIsPlaying(true);
      startTick();
    }
  }, [seekFull, segIdx, audioStart, audioEnd, doLoop, startTick]);

  // ─────────────────────────────────────────────────────────────
  // ✅ PROGRESS BAR TAP — seek complet
  // ─────────────────────────────────────────────────────────────
  const onProgressTap = useCallback(async (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    const t = clamp(x / barW, 0, 1) * durationSec;
    const wasPlaying = playingRef.current;
    stopAll();
    await seekFull(t);
    if (wasPlaying && segIdx >= 0) {
      const segDur = Math.max(0.1, audioEnd - audioStart);
      const audioPos = audioStart + (t % segDur);
      await audio.play(track.file_url, Math.round(audioPos * 1000), doLoop);
      try { player.play(); } catch {}
      playingRef.current = true;
      setIsPlaying(true);
      startTick();
    }
  }, [barW, durationSec, stopAll, seekFull, segIdx, audioStart, audioEnd, doLoop, startTick]);



  // ─────────────────────────────────────────────────────────────
  // SEGMENT PICKER — écoute / choix
  // ─────────────────────────────────────────────────────────────
  const [listenIdx, setListenIdx] = useState(-1);

  const listenSeg = useCallback(async (i: number) => {
    if (isPlaying) stopAll();
    if (listenIdx === i) {
      audio.kill();
      setListenIdx(-1);
      return;
    }
    const ms = Math.round(i * segLen * 1000);
    setListenIdx(i);
    await audio.play(track.file_url, ms, true);
    Haptics.selectionAsync().catch(()=>{});
  }, [listenIdx, segLen, track.file_url, isPlaying, stopAll]);

  const chooseSeg = useCallback(async (i: number) => {
    audio.kill();
    setListenIdx(-1);
    setSegIdx(i);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
  }, []);

  // ── Waveform scrub callbacks pour WaveformScrubber ────────────
  // onScrubStart : stoppe TOUT audio immédiatement (sync)
  const handleScrubStart = useCallback(() => {
    audio.kill();       // sync kill — aucun son possible pendant le drag
    setListenIdx(-1);
  }, []);

  // onScrubEnd : jouer depuis la position exacte du doigt
  const handleScrubEnd = useCallback((posInSeg: number) => {
  // ✅ fire & forget
  audio.play(
    track.file_url,
    Math.round(posInSeg * 1000),
    false
  );

  Haptics.selectionAsync().catch(()=>{});
}, [track.file_url]);


  // ─────────────────────────────────────────────────────────────
  // ✅ Feature 2 — PUBLISH depuis mode aperçu
  // ─────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
  if (segIdx < 0) return;

  stopAll();
  audio.kill();

 try {

  console.log("API URL:", process.env.EXPO_PUBLIC_API_URL);

  const formData = new FormData();

  formData.append("video", {
    uri: videoUri,
    name: "video.mp4",
    type: "video/mp4",
  } as any);


    formData.append("audioUrl", track.file_url);
    formData.append("start", String(audioStart));
    formData.append("end", String(audioEnd));

    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/create-video`, {
  method: "POST",
  body: formData,
});


    const text = await res.text();
console.log("RAW RESPONSE:", text);

let data;
try {
  data = JSON.parse(text);
} catch {
  data = {};
}


    if (!data?.url) throw new Error("no video returned");

    onConfirm({
      audioStartSec: audioStart,
      audioEndSec: audioEnd,
      audioSegmentIndex: segIdx,
      selectedTrack: track,
    });

  } catch (e) {
    console.error(e);
  } finally {
  }
}, [segIdx, audioStart, audioEnd, track, videoUri]);


  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  const thumbW    = VIDEO_W / Math.max(1, thumbs.length || 10);
  const sel       = segIdx >= 0 ? SEG[segIdx] : null;
  const PREVIEW_H = Math.round(SW * 0.60);
  const isPreview = mode === "preview";

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ══════════════════════════════════════════════════════════
          TOP BAR
      ══════════════════════════════════════════════════════════ */}
      <View style={s.topBar}>
        {/* ✅ Bug 4 — "Modifier" ramène à SuspentzEditor (onBack)
            ✅ En mode aperçu : bouton Modifier → exitPreview
            ✅ En mode édition : bouton ← → onBack() */}
        <Pressable
          style={s.topBtn}
          onPress={isPreview
            ? () => { stopAll(); setMode("edit"); }  // ← exitPreview
            : () => { stopAll(); audio.kill(); onBack(); }
          }
        >
          <Ionicons
            name={isPreview ? "create-outline" : "chevron-back"}
            size={isPreview ? 18 : 22}
            color={C.white}
          />
          {isPreview && <Text style={s.modifierTxt}>Modifier</Text>}
        </Pressable>

        <View style={{ flex:1 }}>
          <Text style={s.topTitle}>{isPreview ? "Aperçu final" : "Éditeur"}</Text>
          {sel && (
            <Text style={[s.topSub, { color: sel.text }]}>
              {SEG[segIdx].label} · {fmt(audioStart)}–{fmt(audioEnd)}
              {doLoop ? " · ↺" : " · ✂"}
            </Text>
          )}
        </View>

        <View style={{ flexDirection:"row", gap:8 }}>
          {/* Bouton Aperçu (mode édition) */}
          {!isPreview && (
            <Pressable
              style={[s.btnSecondary, segIdx < 0 && s.btnDisabled]}
              disabled={segIdx < 0}
              onPress={() => { stopAll(); setMode("preview"); }}
            >
              <Ionicons name="eye-outline" size={13} color={segIdx < 0 ? C.muted : C.gold}/>
              <Text style={[s.btnSecondaryTxt, segIdx < 0 && { color:C.muted }]}>Aperçu</Text>
            </Pressable>
          )}

          {/* ✅ Feature 2 — Bouton Publier (dans les deux modes) */}
          <Pressable
  style={[s.btnPrimary, (segIdx < 0 || isProcessing) && s.btnDisabled]}
  disabled={segIdx < 0 || isProcessing}
  onPress={handlePublish}
>

            <Ionicons name="cloud-upload-outline" size={13} color={segIdx < 0 ? C.muted : "#000"}/>
            <Text style={[s.btnPrimaryTxt, segIdx < 0 && { color:C.muted }]}>Publier</Text>
          </Pressable>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════
          VIDEO PREVIEW
      ══════════════════════════════════════════════════════════ */}
     <View style={[s.preview, { height: PREVIEW_H }]}>
  <VideoView
    player={player}
    style={StyleSheet.absoluteFill}
    contentFit="contain"
    nativeControls={false}
  />

  {/* ✅ LOADER PUBLICATION */}
  {isProcessing && (
    <View style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.6)",
      zIndex: 999,
    }}>
      <Text style={{ color: "white", fontWeight: "bold" }}>
        Publication...
      </Text>
    </View>
  )}


        {/* Play / Pause */}
        <Pressable
          style={s.playBtn}
          onPress={isPlaying ? stopAll : playAll}
          disabled={segIdx < 0}
        >
          <View style={[s.playCircle, isPlaying && s.playActive]}>
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={26}
              color={isPlaying ? C.white : C.gold}
            />
          </View>
        </Pressable>

        {/* Barre de progression */}
        <View style={s.barWrap}>
          <Pressable
            style={s.barBg}
            onLayout={e => setBarW(e.nativeEvent.layout.width)}
            onPress={onProgressTap}
          >
            <View style={[s.barFill, {
              width: durationSec > 0 ? (posSec / durationSec) * barW : 0,
            }]}/>
            <View style={[s.barThumb, {
              left: durationSec > 0 ? (posSec / durationSec) * barW - 9 : -9,
            }]}/>
          </Pressable>
          <View style={s.barTimes}>
            <Text style={s.barTime}>{fmt(posSec)}</Text>
            <Text style={s.barTime}>{fmt(durationSec)}</Text>
          </View>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════
          TIMELINE (mode édition uniquement)
      ══════════════════════════════════════════════════════════ */}
      {!isPreview && (
        <View style={s.tlWrap} onLayout={e => setTlW(e.nativeEvent.layout.width)}>
          {/* Playhead fixe */}
          <View pointerEvents="none" style={[s.playhead,   { left: tlW/2 - 1.5 }]}/>
          <View pointerEvents="none" style={[s.phCapTop,   { left: tlW/2 - 8   }]}/>
          <View pointerEvents="none" style={[s.phCapBot,   { left: tlW/2 - 8   }]}/>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={8} // ✅ FIX

            contentContainerStyle={{ paddingHorizontal: PAD }}
            decelerationRate="fast"
            // ✅ Bug 2+3 — onScrollBeginDrag : silence sync, vidéo continue
            onScrollBeginDrag={onTLScrollBegin}
            // ✅ Bug 3 — onScroll : seek vidéo en temps réel, pas de pause
            onScroll={e => onTLScroll(e.nativeEvent.contentOffset.x)}
            // Fin du drag → resync complet
            onScrollEndDrag={e => onTLScrollEnd(e.nativeEvent.contentOffset.x)}
            onMomentumScrollEnd={e => onTLScrollEnd(e.nativeEvent.contentOffset.x)}
          >
            <View>
              {/* Règle */}
              <Ruler total={durationSec} pxSec={PX_SEC}/>

              {/* Piste vidéo */}
              <View style={[s.videoStrip, { width: VIDEO_W }]}>
                {(thumbs.length > 0 ? thumbs : Array.from({length:10})).map((_,i) => (
                  <View key={i} style={[s.thumb, {
                    width: thumbW,
                    backgroundColor: `rgba(${18+i*5},${16+i*4},${28+i*5},1)`,
                  }]}>
                    <Ionicons name="film-outline" size={8} color="rgba(255,255,255,0.16)"/>
                  </View>
                ))}
              </View>

              <View style={{ height:2, backgroundColor:"rgba(255,255,255,0.04)" }}/>

              {/* ✅ Feature 1 — Piste audio scrubbable par PanResponder */}
              <View
                style={[s.audioStrip, { width: Math.max(VIDEO_W, TRACK_W) }]}
              >
                {/* Waveform globale */}
                {Array.from({length:80}, (_,i) => {
                  const h    = clamp(0.10 + Math.abs(Math.sin(i*1.41 + track.duration_sec*0.03))*0.65, 0.10, 0.75);
                  const barX = (i/79)*TRACK_W;
                  const inSeg = segIdx >= 0 &&
                    barX >= segIdx*segLen*PX_SEC &&
                    barX <  (segIdx+1)*segLen*PX_SEC;
                  return (
                    <View key={i} style={{
                      position:"absolute", left:barX, bottom:5,
                      width:2.5, height: Math.round(h*(WAVE_H-12)),
                      borderRadius:1.5,
                      backgroundColor: inSeg
                        ? (SEG[segIdx]?.border ?? "rgba(255,255,255,0.18)")
                        : "rgba(255,255,255,0.10)",
                    }}/>
                  );
                })}

                {/* Overlay segment coloré */}
                {segIdx >= 0 && (() => {
                  const col  = SEG[segIdx];
                  const left = segIdx * segLen * PX_SEC;
                  const w    = Math.min(segLen * PX_SEC, TRACK_W - left);
                  return (
                    <View
                      style={{
                        position:"absolute", left, width:w, top:0, bottom:0,
                        backgroundColor: col.fill,
                        borderLeftWidth:2, borderRightWidth:2,
                        borderLeftColor: col.border, borderRightColor: col.border,
                      }}

                    />
                  );
                })()}

                {/* Ligne de fin vidéo */}
                <View pointerEvents="none" style={{
                  position:"absolute",
                  left: durationSec * PX_SEC - 1,
                  top:0, bottom:0, width:2,
                  backgroundColor: C.green,
                }}/>

                {/* Label hint scrubbing */}

              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════
          SEGMENT PICKER (mode édition) / INFO PANEL (mode aperçu)
      ══════════════════════════════════════════════════════════ */}
      {!isPreview ? (
        /* ── MODE ÉDITION — picker S1 / S2 ── */
        <View style={s.segSection}>
          <View style={s.segHeader}>
            <Ionicons name="musical-notes" size={12} color={C.gold}/>
            <Text style={s.segHeaderTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={s.segHeaderDur}>{fmt(track.duration_sec)} total</Text>
          </View>

          {/* ✅ WaveformScrubber — S1 + S2 avec scrubbing tactile complet */}
          <View style={s.segRow}>
            {[0,1].map(i => {
              const start  = i * segLen;
              const end    = Math.min((i+1)*segLen, track.duration_sec);
              const dur    = end - start;
              const vidPct = durationSec > 0 && dur > 0 ? Math.min(1, durationSec/dur) : 1;
              return (
                <WaveformScrubber
                  key={i}
                  segIndex={i}
                  segStart={start}
                  segEnd={end}
                  segDur={dur}
                  track={track}
                  isListening={listenIdx === i}
                  isChosen={segIdx === i}
                  vidPct={vidPct}
                  bars={waveBars[i]}
                  durationSec={durationSec}
                  onListen={listenSeg}
                  onChoose={chooseSeg}
                  onScrubStart={handleScrubStart}
                  onScrubEnd={handleScrubEnd}
                />
              );
            })}
          </View>

          {segIdx < 0 && (
            <View style={s.warning}>
              <Ionicons name="information-circle-outline" size={13} color="#FF9500"/>
              <Text style={s.warningTxt}>
                Appuyez sur ▶ pour écouter un segment · Glissez dans la timeline pour explorer · Choisissez S1 ou S2 pour continuer
              </Text>
            </View>
          )}
        </View>

      ) : (
        /* ── MODE APERÇU — panel immersif ── */
        <View style={s.previewPanel}>
          {sel ? (
            <>
              <View style={s.previewInfoRow}>
                <View style={[s.previewBadge, { borderColor:sel.border, backgroundColor:sel.fill }]}>
                  <Ionicons name="musical-notes" size={11} color={sel.text}/>
                  <Text style={[s.previewBadgeTxt, { color:sel.text }]}>
                    {SEG[segIdx].label} · {track.title}
                  </Text>
                </View>
                <View style={[s.previewBadge, {
                  borderColor: doLoop ? "rgba(52,199,89,0.50)" : "rgba(255,255,255,0.20)",
                  backgroundColor: doLoop ? "rgba(52,199,89,0.10)" : "rgba(255,255,255,0.05)",
                }]}>
                  <Ionicons
                    name={doLoop ? "repeat" : "cut"}
                    size={11}
                    color={doLoop ? C.green : C.muted}
                  />
                  <Text style={[s.previewBadgeTxt, { color: doLoop ? C.green : C.muted }]}>
                    {doLoop ? "Boucle" : `Coupé à ${fmt(durationSec)}`}
                  </Text>
                </View>
              </View>

              <Text style={s.previewHint}>
                Appuyez sur ▶ pour voir le rendu final de votre Suspentz.{"\n"}
                Appuyez sur "Modifier" pour retourner à l'éditeur.{"\n"}
                Appuyez sur "Publier" pour envoyer à la validation CADNA.
              </Text>

              {/* ✅ Feature 2 — Gros bouton Publier dans l'aperçu */}
              <Pressable style={s.publishBigBtn} onPress={handlePublish}>
                <Ionicons name="cloud-upload-outline" size={18} color="#000"/>
                <Text style={s.publishBigTxt}>Publier ce Suspentz</Text>
                <Ionicons name="arrow-forward" size={16} color="#000"/>
              </Pressable>

              <Text style={s.publishNote}>
                Votre contenu sera envoyé à la validation CADNA avant publication.
              </Text>
            </>
          ) : (
            <View style={s.warning}>
              <Ionicons name="warning-outline" size={13} color="#FF9500"/>
              <Text style={s.warningTxt}>Aucun segment sélectionné. Revenez à l'éditeur.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex:1, backgroundColor:"#080808" },

  // Top bar
  topBar: {
    flexDirection:"row", alignItems:"center", gap:10,
    paddingHorizontal:14, paddingTop:52, paddingBottom:10,
    backgroundColor:"#000",
  },
  topBtn: {
    flexDirection:"row", alignItems:"center", gap:5,
    minWidth:38, height:38, borderRadius:12,
    backgroundColor:"rgba(255,255,255,0.07)",
    paddingHorizontal:10, justifyContent:"center",
  },
  modifierTxt: { color: "#FFF", fontSize:13, fontWeight:"800" },
  topTitle:    { color:"#FFF", fontWeight:"900", fontSize:15 },
  topSub:      { fontSize:10, fontWeight:"700", marginTop:1 },

  // Buttons
  btnPrimary:    {
    flexDirection:"row", alignItems:"center", gap:5,
    backgroundColor:"#D4AF37", borderRadius:12,
    paddingHorizontal:12, paddingVertical:8,
  },
  btnPrimaryTxt: { color:"#000", fontWeight:"900", fontSize:12 },
  btnSecondary:  {
    flexDirection:"row", alignItems:"center", gap:5,
    borderRadius:12, paddingHorizontal:12, paddingVertical:8,
    borderWidth:1, borderColor:"rgba(212,175,55,0.40)",
    backgroundColor:"rgba(212,175,55,0.08)",
  },
  btnSecondaryTxt:{ color:"#D4AF37", fontWeight:"800", fontSize:12 },
  btnDisabled:    { opacity:0.38 },

  // Preview
  preview:      { position:"relative", backgroundColor:"#000" },
  noSegOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor:"rgba(0,0,0,0.55)", alignItems:"center", justifyContent:"center", gap:8 },
  noSegTxt:     { color:"rgba(255,255,255,0.40)", fontWeight:"700", fontSize:12, textAlign:"center", paddingHorizontal:24 },

  // Play button
  playBtn:    { position:"absolute", top:"50%", left:"50%", marginTop:-30, marginLeft:-30, zIndex:10 },
  playCircle: { width:60, height:60, borderRadius:30, backgroundColor:"rgba(0,0,0,0.60)", borderWidth:2, borderColor:"#D4AF37", alignItems:"center", justifyContent:"center" },
  playActive: { borderColor:"#FFF", backgroundColor:"rgba(0,0,0,0.75)" },

  // Progress bar
  barWrap:  { position:"absolute", bottom:0, left:0, right:0, paddingHorizontal:14, paddingBottom:8, backgroundColor:"rgba(0,0,0,0.48)" },
  barBg:    { height:5, backgroundColor:"rgba(255,255,255,0.18)", borderRadius:3, marginBottom:5, position:"relative" },
  barFill:  { height:5, backgroundColor:"#D4AF37", borderRadius:3 },
  barThumb: { position:"absolute", top:-7, width:18, height:18, borderRadius:9, backgroundColor:"#D4AF37", shadowColor:"#D4AF37", shadowOpacity:0.90, shadowRadius:6, elevation:8 },
  barTimes: { flexDirection:"row", justifyContent:"space-between" },
  barTime:  { color:"rgba(255,255,255,0.58)", fontSize:10, fontWeight:"800" },

  // Timeline
  tlWrap:     { backgroundColor:"#0C0C0C", position:"relative", paddingVertical:6, borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.05)" },
  playhead:   { position:"absolute", top:0, bottom:0, width:2.5, backgroundColor:"#D4AF37", zIndex:20, shadowColor:"#D4AF37", shadowOpacity:1, shadowRadius:5, elevation:10 },
  phCapTop:   { position:"absolute", top:0,    width:16, height:9, backgroundColor:"#D4AF37", borderRadius:3, zIndex:21 },
  phCapBot:   { position:"absolute", bottom:0, width:16, height:9, backgroundColor:"#D4AF37", borderRadius:3, zIndex:21 },
  videoStrip: { height:THUMB_H, flexDirection:"row", borderRadius:6, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.09)" },
  thumb:      { height:THUMB_H, alignItems:"center", justifyContent:"center", borderRightWidth:StyleSheet.hairlineWidth, borderRightColor:"rgba(255,255,255,0.05)" },
  audioStrip: { height:WAVE_H, position:"relative", borderRadius:6, borderWidth:1, borderColor:"rgba(255,255,255,0.07)", backgroundColor:"rgba(0,0,0,0.28)" },

  // Segment picker
  segSection:     { flex:1, backgroundColor:"#0A0A0A", paddingBottom:14, borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.06)" },
  segHeader:      { flexDirection:"row", alignItems:"center", gap:7, paddingHorizontal:14, paddingTop:8, paddingBottom:6 },
  segHeaderTitle: { flex:1, color:"#FFF", fontWeight:"800", fontSize:12 },
  segHeaderDur:   { color:"rgba(255,255,255,0.38)", fontSize:10, fontWeight:"600" },
  segRow:         { flexDirection:"row", gap:10, paddingHorizontal:12 },
  segCard:        { flex:1, backgroundColor:"#111", borderRadius:14, borderWidth:1.5, borderColor:"rgba(255,255,255,0.09)", overflow:"hidden" },
  segTop:         { height:3 },
  segHead:        { flexDirection:"row", alignItems:"center", gap:7, paddingHorizontal:10, paddingTop:8, paddingBottom:4 },
  segBadge:       { borderRadius:6, paddingHorizontal:7, paddingVertical:2, borderWidth:1 },
  segBadgeTxt:    { fontSize:10, fontWeight:"900" },
  segTime:        { fontSize:10, fontWeight:"800" },
  segDur:         { color:"rgba(255,255,255,0.28)", fontSize:9, marginTop:1 },
  listenBtn:      { width:30, height:30, borderRadius:15, backgroundColor:"rgba(255,255,255,0.07)", borderWidth:1, borderColor:"rgba(255,255,255,0.11)", alignItems:"center", justifyContent:"center" },
  waveRow:        { flexDirection:"row", alignItems:"center", height:34, paddingHorizontal:8 },
  segFoot:        { paddingHorizontal:10, paddingBottom:4, minHeight:14 },
  segInfo:        { color:"rgba(255,255,255,0.24)", fontSize:9, fontWeight:"600" },
  chosenBadge:    { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, margin:8, marginTop:2, borderRadius:8, paddingVertical:8, borderWidth:1 },
  chosenTxt:      { fontSize:11, fontWeight:"900" },
  selectBtn:      { margin:8, marginTop:2, backgroundColor:"rgba(255,255,255,0.07)", borderRadius:8, paddingVertical:9, alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.11)" },
  selectBtnTxt:   { color:"#FFF", fontSize:11, fontWeight:"800" },
  warning:        { flexDirection:"row", alignItems:"flex-start", gap:6, marginHorizontal:12, marginTop:8, backgroundColor:"rgba(255,149,0,0.08)", borderRadius:8, padding:10, borderWidth:1, borderColor:"rgba(255,149,0,0.25)" },
  warningTxt:     { color:"#FF9500", fontSize:10, fontWeight:"700", flex:1, lineHeight:16 },

  // Preview panel
  previewPanel:    { flex:1, backgroundColor:"#000", paddingHorizontal:16, paddingTop:18, gap:14 },
  previewInfoRow:  { flexDirection:"row", gap:8, flexWrap:"wrap" },
  previewBadge:    { flexDirection:"row", alignItems:"center", gap:6, borderRadius:10, borderWidth:1, paddingHorizontal:10, paddingVertical:6 },
  previewBadgeTxt: { fontSize:11, fontWeight:"800" },
  previewHint:     { color:"rgba(255,255,255,0.28)", fontSize:11, lineHeight:18, fontWeight:"600" },
  publishBigBtn:   {
    flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10,
    backgroundColor:"#D4AF37", borderRadius:18,
    paddingVertical:16, paddingHorizontal:24,
    shadowColor:"#D4AF37", shadowOpacity:0.45, shadowRadius:12, elevation:8,
  },
  publishBigTxt:   { color:"#000", fontWeight:"900", fontSize:16, flex:1, textAlign:"center" },
  publishNote:     { color:"rgba(255,255,255,0.22)", fontSize:10, fontWeight:"600", textAlign:"center", lineHeight:16 },
});