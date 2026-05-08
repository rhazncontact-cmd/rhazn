// components/MusicCatalogModal.tsx
// ✅ RHAZN — Catalogue de musiques pour Suspentz
// ✅ Un seul morceau à la fois — stop immédiat à la fermeture — lecture instantanée
// ✅ FIX — Stop auto quand on quitte l'interface (AppState + visible=false)

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const C = {
  bg:      "#000000",
  card:    "#0E0E0E",
  card2:   "#111111",
  gold:    "#D4AF37",
  goldDim: "rgba(212,175,55,0.12)",
  goldBd:  "rgba(212,175,55,0.28)",
  white:   "#FFFFFF",
  gray:    "#9A9A9A",
  muted:   "rgba(255,255,255,0.55)",
  border:  "rgba(255,255,255,0.12)",
  hairline:"rgba(255,255,255,0.07)",
  ok:      "#34C759",
};

const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export type MusicTrack = {
  id:           string;
  title:        string;
  artist:       string;
  duration_sec: number;
  file_url:     string;
  genre:        string | null;
};

type Props = {
  visible:     boolean;
  onClose:     () => void;
  onSelect:    (track: MusicTrack) => void;
  selectedId?: string | null;
};

export default function MusicCatalogModal({ visible, onClose, onSelect, selectedId }: Props) {
  const [tracks,    setTracks]    = useState<MusicTrack[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  // ✅ Ref unique — jamais deux sons en même temps
  const soundRef    = useRef<Audio.Sound | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Configurer le mode audio pour lecture immédiate
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  }, []);

  // ✅ FIX — Stop quand visible passe à false (navigation vers autre écran)
  useEffect(() => {
    if (visible) {
      loadTracks();
    } else {
      killSound();
    }
  }, [visible]);

  // ✅ FIX — Stop quand l'app passe en arrière-plan (AppState)
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        killSound();
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => {
      sub.remove();
    };
  }, []);

  // ✅ FIX — Cleanup complet au démontage du composant
  useEffect(() => {
    return () => {
      killSound();
    };
  }, []);

  const loadTracks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("music_tracks")
      .select("id, title, artist, duration_sec, file_url, genre")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setTracks((data ?? []) as MusicTrack[]);
    setLoading(false);
  };

  // ✅ killSound — arrêt brutal immédiat, sans await pour ne pas bloquer
  const killSound = () => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    const s = soundRef.current;
    soundRef.current = null;
    setPlayingId(null);
    if (s) {
      s.stopAsync().catch(() => {});
      s.unloadAsync().catch(() => {});
    }
  };

  const handleClose = () => {
    killSound(); // ✅ FIX — Stop immédiat à la fermeture
    onClose();
  };

  // ✅ Lecture instantanée — on charge avec shouldPlay: true directement
  const togglePreview = async (track: MusicTrack) => {
    // Même morceau → pause
    if (playingId === track.id) {
      killSound();
      return;
    }

    // Tuer l'ancien immédiatement (sans attendre)
    killSound();

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.file_url },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 500,
        },
        null,
        true
      );

      // Vérifier qu'on n'a pas déjà changé entre temps
      if (soundRef.current !== null) {
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
        return;
      }

      soundRef.current = sound;
      setPlayingId(track.id);

      // ✅ Auto-stop après 30 secondes
      autoStopRef.current = setTimeout(() => {
        if (soundRef.current === sound) killSound();
      }, 30_000);

      // ✅ Détecter fin naturelle
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (soundRef.current === sound) killSound();
        }
      });

    } catch (e) {
      console.warn("MusicCatalog preview error:", e);
      killSound();
    }
  };

  const handleSelect = async (track: MusicTrack) => {
    killSound(); // ✅ FIX — Stop avant de sélectionner

    let finalTrack = track;

    if (!track.duration_sec || track.duration_sec <= 0) {
      try {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: track.file_url },
          { shouldPlay: false }
        );
        const realDur = Math.round(((status as any)?.durationMillis ?? 0) / 1000);
        await sound.unloadAsync();

        if (realDur > 0) {
          supabase.from("music_tracks")
            .update({ duration_sec: realDur })
            .eq("id", track.id)
            .then(() => {});
          finalTrack = { ...track, duration_sec: realDur };
        }
      } catch {}
    }

    onSelect(finalTrack);
    onClose();
  };

  const filtered = tracks.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.genre ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={m.overlay}>
        <Pressable style={m.backdrop} onPress={handleClose} />
        <View style={m.sheet}>

          {/* Handle */}
          <View style={m.handle} />

          {/* Header */}
          <View style={m.header}>
            <View style={m.headerLeft}>
              <View style={m.iconWrap}>
                <Ionicons name="musical-notes" size={18} color={C.gold} />
              </View>
              <View>
                <Text style={m.headerTitle}>Catalogue Musique</Text>
                <Text style={m.headerSub}>
                  {filtered.length} piste{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <Pressable onPress={handleClose} style={m.closeBtn}>
              <Ionicons name="close" size={18} color={C.muted} />
            </Pressable>
          </View>

          {/* Recherche */}
          <View style={m.searchWrap}>
            <Ionicons name="search-outline" size={15} color={C.gray} />
            <TextInput
              placeholder="Rechercher titre, artiste, genre…"
              placeholderTextColor={C.gray}
              style={m.searchInput}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={15} color={C.gray} />
              </Pressable>
            )}
          </View>

          {/* Liste */}
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
              <ActivityIndicator color={C.gold} size="large" />
              <Text style={{ color: C.gray, fontWeight: "700" }}>Chargement du catalogue…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 }}>
              <View style={m.emptyIcon}>
                <Ionicons name="musical-notes-outline" size={32} color={C.gold} />
              </View>
              <Text style={{ color: C.white, fontWeight: "900", fontSize: 16 }}>
                {search ? "Aucun résultat" : "Catalogue vide"}
              </Text>
              <Text style={{ color: C.muted, fontWeight: "600", fontSize: 13, textAlign: "center", lineHeight: 19 }}>
                {search
                  ? `Aucune piste ne correspond à "${search}"`
                  : "L'administrateur RHAZN n'a pas encore ajouté de pistes musicales."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(t) => t.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => {
                const isSelected = selectedId === item.id;
                const isPlaying  = playingId === item.id;

                return (
                  <View style={[m.trackCard, isSelected && m.trackCardSelected]}>

                    {/* Bouton preview */}
                    <Pressable
                      onPress={() => togglePreview(item)}
                      style={[m.previewBtn, isPlaying && m.previewBtnActive]}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={16}
                        color={isPlaying ? "#000" : C.gold}
                      />
                    </Pressable>

                    {/* Infos */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={m.trackTitle} numberOfLines={1}>{item.title}</Text>
                        {isSelected && (
                          <View style={m.selectedBadge}>
                            <Ionicons name="checkmark" size={9} color="#000" />
                            <Text style={m.selectedBadgeTxt}>Sélectionné</Text>
                          </View>
                        )}
                      </View>
                      <Text style={m.trackMeta}>
                        {item.artist}
                        {item.genre ? ` · ${item.genre}` : ""}
                        {item.duration_sec > 0 ? ` · ${fmtTime(item.duration_sec)}` : ""}
                      </Text>

                      {isPlaying && (
                        <View style={m.waveRow}>
                          {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                            <View key={i} style={[m.waveLine, { height: h * 3 }]} />
                          ))}
                          <Text style={m.playingTxt}>Écoute en cours…</Text>
                        </View>
                      )}
                    </View>

                    {/* Bouton choisir */}
                    <Pressable
                      onPress={() => handleSelect(item)}
                      style={[m.selectBtn, isSelected && m.selectBtnActive]}
                    >
                      <Text style={[m.selectBtnTxt, isSelected && m.selectBtnTxtActive]}>
                        {isSelected ? "✓ Choisi" : "Choisir"}
                      </Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 0,
    height: "85%",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.20)", alignSelf: "center", marginBottom: 16 },

  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap:   { width: 38, height: 38, borderRadius: 11, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBd, alignItems: "center", justifyContent: "center" },
  headerTitle:{ color: C.white, fontWeight: "900", fontSize: 17 },
  headerSub:  { color: C.gray,  fontWeight: "600", fontSize: 11, marginTop: 1 },
  closeBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },

  searchWrap:  { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#111", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", marginBottom: 12 },
  searchInput: { flex: 1, color: C.white, fontSize: 14, fontWeight: "600" },

  emptyIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBd, alignItems: "center", justifyContent: "center" },

  trackCard:         { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0E0E0E", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  trackCardSelected: { borderColor: C.gold, backgroundColor: "rgba(212,175,55,0.06)" },

  previewBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBd, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  previewBtnActive: { backgroundColor: C.gold, borderColor: C.gold },

  trackTitle: { color: C.white, fontWeight: "800", fontSize: 14, flex: 1 },
  trackMeta:  { color: C.gray,  fontWeight: "600", fontSize: 11, marginTop: 3 },

  selectedBadge:    { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  selectedBadgeTxt: { color: "#000", fontWeight: "900", fontSize: 9 },

  waveRow:    { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
  waveLine:   { width: 3, backgroundColor: C.gold, borderRadius: 2 },
  playingTxt: { color: C.gold, fontWeight: "700", fontSize: 10, marginLeft: 4 },

  selectBtn:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1, borderColor: C.goldBd, flexShrink: 0 },
  selectBtnActive:    { backgroundColor: C.gold, borderColor: C.gold },
  selectBtnTxt:       { color: C.gold, fontWeight: "900", fontSize: 12 },
  selectBtnTxtActive: { color: "#000" },
});
