// components/AudioScrubber.tsx
// ✅ RHAZN — Premium Audio Segment Selector
// Apple-like design · TikTok scroll mechanic · Zero cacophony

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ─── Palette ─────────────────────────────────────────────────
const GOLD       = "#D4AF37";
const GOLD_DIM   = "rgba(212,175,55,0.15)";
const GOLD_BD    = "rgba(212,175,55,0.40)";
const WHITE      = "#FFFFFF";
const GRAY       = "#9A9A9A";
const MUTED      = "rgba(255,255,255,0.45)";
const BG         = "#0A0A0A";
const CARD       = "#111111";
const GREEN      = "#34C759";
const DANGER     = "#FF453A";

const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// ─── Pseudo-waveform deterministe ────────────────────────────
// Génère des hauteurs de barres cohérentes pour un index donné
const waveHeight = (i: number, total: number): number => {
  const base =
    Math.abs(Math.sin(i * 0.37)) * 0.4 +
    Math.abs(Math.sin(i * 1.13)) * 0.3 +
    Math.abs(Math.sin(i * 2.71)) * 0.3;
  return 8 + Math.round(base * 36); // entre 8 et 44 px
};

// ─── Types ───────────────────────────────────────────────────
export type Props = {
  trackDurationSec:  number;   // durée totale de la piste
  windowDurationSec: number;   // durée de la vidéo (segment à sélectionner)
  startSec:          number;   // position actuelle
  onStartChange:     (sec: number) => void;
  audioUri:          string | null;
};

// ─── Constantes layout ───────────────────────────────────────
const BAR_W     = 3;   // largeur d'une barre waveform
const BAR_GAP   = 2;   // espace entre barres
const BAR_STEP  = BAR_W + BAR_GAP; // 5px par barre
const BARS_PER_SEC = 10; // 10 barres par seconde

export default function AudioScrubber({
  trackDurationSec,
  windowDurationSec,
  startSec,
  onStartChange,
  audioUri,
}: Props) {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // ─── Sound (UN seul, jamais recréé pendant le drag) ──────
  const soundRef      = useRef<Audio.Sound | null>(null);
  const loadingRef    = useRef(false);
  const loopTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [isLooping,   setIsLooping]   = useState(false);

  const clearLoop = () => {
    if (loopTimerRef.current) { clearTimeout(loopTimerRef.current); loopTimerRef.current = null; }
  };

  const ensureSound = async (): Promise<Audio.Sound | null> => {
    if (soundRef.current) return soundRef.current;
    if (!audioUri || loadingRef.current) return null;
    loadingRef.current = true;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: false, volume: 1 });
      soundRef.current = sound;
    } catch {}
    loadingRef.current = false;
    return soundRef.current;
  };

  const stopSound = async () => {
    clearLoop();
    setIsPlaying(false);
    setIsLooping(false);
    try { if (soundRef.current) await soundRef.current.pauseAsync(); } catch {}
  };

  // Jouer le segment une fois
  const playOnce = async (fromSec: number) => {
    const sound = await ensureSound();
    if (!sound) return;
    clearLoop();
    try {
      await sound.setPositionAsync(Math.round(fromSec * 1000));
      await sound.playAsync();
      setIsPlaying(true);
      loopTimerRef.current = setTimeout(async () => {
        try { await sound.pauseAsync(); } catch {}
        setIsPlaying(false);
      }, Math.max(500, windowDurationSec * 1000));
    } catch { setIsPlaying(false); }
  };

  // Jouer en boucle
  const playLoop = async (fromSec: number) => {
    const sound = await ensureSound();
    if (!sound) return;
    setIsLooping(true);
    const loop = async () => {
      if (!isLoopRef.current) return;
      try {
        await sound.setPositionAsync(Math.round(fromSec * 1000));
        await sound.playAsync();
        loopTimerRef.current = setTimeout(loop, Math.max(500, windowDurationSec * 1000));
      } catch { setIsLooping(false); }
    };
    isLoopRef.current = true;
    setIsPlaying(true);
    loop();
  };

  const isLoopRef = useRef(false);

  const stopLoop = async () => {
    isLoopRef.current = false;
    await stopSound();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      isLoopRef.current = false;
      clearLoop();
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [audioUri]);

  // ─── Layout waveform ─────────────────────────────────────
  const totalBars      = Math.ceil(trackDurationSec * BARS_PER_SEC);
  const windowBars     = Math.ceil(windowDurationSec * BARS_PER_SEC);
  const totalWidth     = totalBars * BAR_STEP;
  const windowWidth    = windowBars * BAR_STEP;

  // ─── ScrollView ref (scroll programmatique) ──────────────
  const scrollRef      = useRef<ScrollView>(null);
  const scrollXRef     = useRef(0); // offset courant en px
  const containerW     = useRef(320);
  const isDragging     = useRef(false);

  // Scroll initial basé sur startSec
  useEffect(() => {
    const targetOffset = startSec * BARS_PER_SEC * BAR_STEP;
    scrollRef.current?.scrollTo({ x: targetOffset, animated: false });
    scrollXRef.current = targetOffset;
  }, []); // une seule fois au mount

  // ─── Animation "pulse" quand on joue ─────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isPlaying]);

  // ─── Calculs position ────────────────────────────────────
  const currentSec = clamp(startSec, 0, Math.max(0, trackDurationSec - windowDurationSec));
  const endSec     = Math.min(trackDurationSec, currentSec + windowDurationSec);
  const progress   = trackDurationSec > 0 ? currentSec / trackDurationSec : 0;

  if (trackDurationSec <= 0) return null;

  return (
    <View style={s.card}>

      {/* ════════════════════════════════════════════════════
          HEADER — titre + timecode
      ════════════════════════════════════════════════════ */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.iconWrap}>
            <Ionicons name="cut-outline" size={16} color={GOLD} />
          </View>
          <View>
            <Text style={s.headerTitle}>Segment audio</Text>
            <Text style={s.headerSub}>Choisissez la partie à utiliser</Text>
          </View>
        </View>
        {/* Timecode badge */}
        <View style={s.timecode}>
          <Text style={s.timecodeStart}>{fmtTime(currentSec)}</Text>
          <View style={s.timecodeDivider} />
          <Text style={s.timecodeEnd}>{fmtTime(endSec)}</Text>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════
          BARRE DE PROGRESSION GLOBALE
      ════════════════════════════════════════════════════ */}
      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
          {/* Curseur de position */}
          <View style={[s.progressThumb, { left: `${progress * 100}%` as any }]} />
        </View>
        <View style={s.progressLabels}>
          <Text style={s.progressLabel}>0:00</Text>
          <Text style={[s.progressLabel, { color: GOLD }]}>{fmtTime(windowDurationSec)}</Text>
          <Text style={s.progressLabel}>{fmtTime(trackDurationSec)}</Text>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════
          WAVEFORM — ScrollView horizontal
          La fenêtre dorée est FIXE au centre,
          la waveform défile en dessous
      ════════════════════════════════════════════════════ */}
      <View
        style={s.waveWrap}
        onLayout={(e) => { containerW.current = e.nativeEvent.layout.width; }}
      >
        {/* Padding gauche/droite pour centrer la fenêtre au début/fin */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          bounces={false}
          onScrollBeginDrag={() => {
            isDragging.current = true;
            stopSound();
          }}
          onScroll={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            scrollXRef.current = x;
            const newSec = clamp(
              x / (BARS_PER_SEC * BAR_STEP),
              0,
              trackDurationSec - windowDurationSec
            );
            onStartChange(newSec);
          }}
          onScrollEndDrag={async (e) => {
            isDragging.current = false;
            const x = e.nativeEvent.contentOffset.x;
            const newSec = clamp(
              x / (BARS_PER_SEC * BAR_STEP),
              0,
              trackDurationSec - windowDurationSec
            );
            onStartChange(newSec);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            // ✅ Lecture APRÈS relâchement — propre, une seule fois
            await playOnce(newSec);
          }}
          onMomentumScrollEnd={async (e) => {
            if (isDragging.current) return;
            const x = e.nativeEvent.contentOffset.x;
            const newSec = clamp(
              x / (BARS_PER_SEC * BAR_STEP),
              0,
              trackDurationSec - windowDurationSec
            );
            onStartChange(newSec);
            await playOnce(newSec);
          }}
          contentContainerStyle={{
            paddingHorizontal: (containerW.current - windowWidth) / 2,
          }}
        >
          {/* Barres de la waveform */}
          <View style={[s.waveInner, { width: totalWidth }]}>
            {Array.from({ length: totalBars }, (_, i) => {
              const barSec     = i / BARS_PER_SEC;
              const inWindow   = barSec >= currentSec && barSec < currentSec + windowDurationSec;
              const h          = waveHeight(i, totalBars);
              return (
                <View
                  key={i}
                  style={[
                    s.bar,
                    { height: h },
                    inWindow ? s.barActive : s.barInactive,
                  ]}
                />
              );
            })}
          </View>
        </ScrollView>

        {/* ── Fenêtre fixe dorée (overlay) ── */}
        <Animated.View
          pointerEvents="none"
          style={[
            s.window,
            {
              left:  (containerW.current - windowWidth) / 2,
              width: windowWidth,
              transform: [{ scaleY: pulseAnim }],
            },
            isPlaying && s.windowPlaying,
          ]}
        >
          {/* Bordure haut */}
          <View style={[s.windowBorder, { top: 0 }]} />
          {/* Bordure bas */}
          <View style={[s.windowBorder, { bottom: 0 }]} />
          {/* Poignée gauche */}
          <View style={s.grip}>
            <View style={s.gripLine} />
            <View style={s.gripLine} />
            <View style={s.gripLine} />
          </View>
          {/* Poignée droite */}
          <View style={[s.grip, s.gripRight]}>
            <View style={s.gripLine} />
            <View style={s.gripLine} />
            <View style={s.gripLine} />
          </View>
          {/* Label durée au centre */}
          <View style={s.windowLabel}>
            <Text style={s.windowLabelTxt}>{windowDurationSec}s</Text>
          </View>
        </Animated.View>

        {/* Curseur central — ligne blanche fixe */}
        <View pointerEvents="none" style={s.centerCursor} />

        {/* Dégradés gauche/droite */}
        <View pointerEvents="none" style={s.fadeLeft} />
        <View pointerEvents="none" style={s.fadeRight} />
      </View>

      {/* ════════════════════════════════════════════════════
          INSTRUCTION
      ════════════════════════════════════════════════════ */}
      <View style={s.instructionRow}>
        <Ionicons name="hand-left-outline" size={12} color={MUTED} />
        <Text style={s.instructionTxt}>
          Faites glisser la piste pour positionner le segment doré
        </Text>
      </View>

      {/* ════════════════════════════════════════════════════
          CONTRÔLES DE LECTURE
      ════════════════════════════════════════════════════ */}
      <View style={s.controls}>

        {/* Info segment */}
        <View style={s.segmentInfo}>
          <Text style={s.segmentLabel}>SEGMENT</Text>
          <Text style={s.segmentValue}>
            {fmtTime(currentSec)} → {fmtTime(endSec)}
          </Text>
        </View>

        {/* Boutons */}
        <View style={s.controlBtns}>
          {/* Bouton Écouter / Stop */}
          {!isLooping ? (
            <Pressable
              onPress={() => isPlaying ? stopSound() : playOnce(currentSec)}
              style={({ pressed }) => [s.btnPlay, pressed && { opacity: 0.85 }]}
            >
              <Ionicons
                name={isPlaying ? "stop" : "play"}
                size={15}
                color="#000"
              />
              <Text style={s.btnPlayTxt}>
                {isPlaying ? "Stop" : "Écouter"}
              </Text>
            </Pressable>
          ) : null}

          {/* Bouton Loop */}
          <Pressable
            onPress={() => isLooping ? stopLoop() : playLoop(currentSec)}
            style={({ pressed }) => [
              s.btnLoop,
              isLooping && s.btnLoopActive,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name="repeat"
              size={15}
              color={isLooping ? "#000" : GOLD}
            />
            <Text style={[s.btnLoopTxt, isLooping && { color: "#000" }]}>
              {isLooping ? "Arrêter" : "Boucle"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════
          VALIDATION — segment confirmé
      ════════════════════════════════════════════════════ */}
      <View style={s.validationBand}>
        <Ionicons name="checkmark-circle" size={14} color={GREEN} />
        <Text style={s.validationTxt}>
          Segment confirmé ·{" "}
          <Text style={{ color: WHITE }}>{fmtTime(currentSec)}</Text>
          {" → "}
          <Text style={{ color: WHITE }}>{fmtTime(endSec)}</Text>
          {"  ·  "}
          <Text style={{ color: GOLD }}>{windowDurationSec}s</Text>
        </Text>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════
   STYLES
════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({

  card: {
    backgroundColor: BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GOLD_BD,
    marginBottom: 14,
    overflow: "hidden",
  },

  // ── Header ──
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap:   { width: 36, height: 36, borderRadius: 11, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  headerTitle:{ color: WHITE, fontWeight: "900", fontSize: 15 },
  headerSub:  { color: GRAY,  fontWeight: "600", fontSize: 11, marginTop: 1 },

  timecode:      { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.40)", borderRadius: 10, borderWidth: 1, borderColor: GOLD_BD, overflow: "hidden" },
  timecodeStart: { color: GOLD, fontWeight: "900", fontSize: 12, paddingHorizontal: 10, paddingVertical: 6 },
  timecodeDivider:{ width: 1, height: 28, backgroundColor: GOLD_BD },
  timecodeEnd:   { color: GOLD, fontWeight: "900", fontSize: 12, paddingHorizontal: 10, paddingVertical: 6 },

  // ── Progress bar globale ──
  progressWrap:   { paddingHorizontal: 16, marginBottom: 16 },
  progressBg:     { height: 3, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 99, position: "relative" },
  progressFill:   { height: 3, backgroundColor: GOLD, borderRadius: 99, position: "absolute", top: 0, left: 0 },
  progressThumb:  { position: "absolute", top: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD, marginLeft: -5, shadowColor: GOLD, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  progressLabel:  { color: MUTED, fontSize: 9, fontWeight: "700" },

  // ── Waveform zone ──
  waveWrap:   { height: 80, position: "relative", marginBottom: 0 },
  waveInner:  { flexDirection: "row", alignItems: "center", height: "100%", paddingVertical: 8 },

  bar:        { width: BAR_W, borderRadius: 2, marginHorizontal: BAR_GAP / 2 },
  barActive:  { backgroundColor: GOLD },
  barInactive:{ backgroundColor: "rgba(255,255,255,0.18)" },

  // ── Fenêtre fixe ──
  window: {
    position: "absolute", top: 0, bottom: 0,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderLeftWidth: 0, borderRightWidth: 0,
  },
  windowPlaying: { backgroundColor: "rgba(212,175,55,0.14)" },
  windowBorder:  { position: "absolute", left: 22, right: 22, height: 2, backgroundColor: GOLD },

  grip:      { position: "absolute", left: 0, top: 0, bottom: 0, width: 22, alignItems: "center", justifyContent: "center", backgroundColor: GOLD, gap: 4 },
  gripRight: { right: 0, left: undefined },
  gripLine:  { width: 2, height: 9, backgroundColor: "#000", borderRadius: 1 },

  windowLabel:    { position: "absolute", top: 0, bottom: 0, left: 22, right: 22, alignItems: "center", justifyContent: "center" },
  windowLabelTxt: { color: "rgba(212,175,55,0.55)", fontWeight: "900", fontSize: 10 },

  // ── Curseur central ──
  centerCursor: {
    position: "absolute", top: 8, bottom: 8,
    width: 1.5, backgroundColor: "rgba(255,255,255,0.55)",
    alignSelf: "center", left: "50%",
  },

  // ── Dégradés ──
  fadeLeft: {
    position: "absolute", left: 0, top: 0, bottom: 0, width: 40,
    // pas de LinearGradient disponible — on simule avec opacity
    backgroundColor: "rgba(10,10,10,0.60)",
  },
  fadeRight: {
    position: "absolute", right: 0, top: 0, bottom: 0, width: 40,
    backgroundColor: "rgba(10,10,10,0.60)",
  },

  // ── Instruction ──
  instructionRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  instructionTxt: { color: MUTED, fontSize: 11, fontWeight: "600", flex: 1 },

  // ── Contrôles ──
  controls:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  segmentInfo: { gap: 3 },
  segmentLabel:{ color: MUTED, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  segmentValue:{ color: WHITE, fontSize: 14, fontWeight: "900" },

  controlBtns: { flexDirection: "row", gap: 10 },

  btnPlay:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GOLD, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  btnPlayTxt: { color: "#000", fontWeight: "900", fontSize: 13 },

  btnLoop:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GOLD_DIM, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: GOLD_BD },
  btnLoopActive: { backgroundColor: GOLD, borderColor: GOLD },
  btnLoopTxt:    { color: GOLD, fontWeight: "900", fontSize: 13 },

  // ── Validation ──
  validationBand: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,199,89,0.08)", borderTopWidth: 1, borderTopColor: "rgba(52,199,89,0.20)", paddingHorizontal: 16, paddingVertical: 10 },
  validationTxt:  { color: "rgba(52,199,89,0.80)", fontSize: 11, fontWeight: "700", flex: 1 },
});