// components/TimeSearchBar.tsx
// ✅ RHAZN — Time Search Bar · Barre de recherche temporelle
// ✅ Input texte pour taper date exacte
// ✅ Slider auto-avançant
// ✅ Suggestions rapides
// ✅ Validation en temps réel
// ✅ Auto-complétion

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ─────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#0A0A0A",
  sub: "#6E6E73",
  muted: "#AEAEB2",
  border: "#E5E5EA",
  gold: "#D4AF37",
  goldLight: "rgba(212,175,55,0.13)",
  goldBorder: "rgba(212,175,55,0.32)",
  blue: "#007AFF",
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Format: YYYY/MM/JJ HH:MM:SS
 */
const formatDateTime = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}/${m}/${d} ${h}:${min}:${s}`;
};

/**
 * Parse: "2026/05/28 14:32:45" → Date | null
 */
const parseDateTime = (text: string): Date | null => {
  const match = text.match(/^(\d{4})\/(\d{2})\/(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, m, d, h, min, s] = match;
  const date = new Date(
    parseInt(y),
    parseInt(m) - 1,
    parseInt(d),
    parseInt(h),
    parseInt(min),
    parseInt(s)
  );
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

/**
 * Formate pour affichage : "28 mai 2026 · 14:32"
 */
const formatDisplayDate = (date: Date): string => {
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${d} ${m} ${y} · ${h}:${min}`;
};

/**
 * Suggestions rapides de dates
 */
const getQuickSuggestions = (): Array<{ label: string; date: Date }> => {
  const now = new Date();
  
  // Maintenant
  const suggestions = [
    { label: "Maintenant", date: new Date(now) },
  ];

  // Hier à 00h
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  suggestions.push({ label: "Hier 00h", date: yesterday });

  // Aujourd'hui à 00h
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  suggestions.push({ label: "Aujourd'hui 00h", date: today });

  // Dernier jour (fin du défi hypothétique à 23:59:59)
  const lastDay = new Date(now);
  lastDay.setHours(23, 59, 59, 999);
  suggestions.push({ label: "Fin du défi (23h59)", date: lastDay });

  // Début du défi (7 jours avant)
  const startOfChallenge = new Date(now);
  startOfChallenge.setDate(startOfChallenge.getDate() - 7);
  startOfChallenge.setHours(0, 0, 0, 0);
  suggestions.push({ label: "Début du défi (-7j)", date: startOfChallenge });

  return suggestions;
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export interface TimeSearchBarProps {
  onDateChange: (date: Date) => void;
  minDate?: Date;  // Début du défi
  maxDate?: Date;  // Fin du défi (ou maintenant)
}

export default function TimeSearchBar({
  onDateChange,
  minDate,
  maxDate,
}: TimeSearchBarProps) {
  const now = new Date();
  const _minDate = minDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const _maxDate = maxDate || now;

  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [inputText, setInputText] = useState<string>(formatDateTime(now));
  const [inputError, setInputError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const sliderAnim = useRef(new Animated.Value(0)).current;

  // ── Calcul position slider ──
  const updateSliderFromDate = useCallback((date: Date) => {
    const min = _minDate.getTime();
    const max = _maxDate.getTime();
    const val = date.getTime();
    const pct = (val - min) / (max - min);
    Animated.timing(sliderAnim, {
      toValue: Math.max(0, Math.min(1, pct)),
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [_minDate, _maxDate]);

  // ── Init ──
  useEffect(() => {
    updateSliderFromDate(selectedDate);
  }, []);

  // ── Auto-avancer le curseur chaque seconde ──
  useEffect(() => {
    const interval = setInterval(() => {
      // Si la date sélectionnée est "maintenant", on avance
      if (
        selectedDate.getFullYear() === now.getFullYear() &&
        selectedDate.getMonth() === now.getMonth() &&
        selectedDate.getDate() === now.getDate() &&
        selectedDate.getHours() === now.getHours() &&
        selectedDate.getMinutes() === now.getMinutes()
      ) {
        const newDate = new Date();
        setSelectedDate(newDate);
        setInputText(formatDateTime(newDate));
        updateSliderFromDate(newDate);
        onDateChange(newDate);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedDate, onDateChange]);

  // ── Input text change ──
  const handleInputChange = (text: string) => {
    setInputText(text);
    const parsed = parseDateTime(text);

    if (!parsed) {
      if (text.length === formatDateTime(now).length) {
        setInputError("Format invalide");
      }
      return;
    }

    // Vérifier plage valide
    if (parsed < _minDate || parsed > _maxDate) {
      setInputError("Date hors de la plage disponible");
      return;
    }

    setInputError(null);
    setSelectedDate(parsed);
    updateSliderFromDate(parsed);
    onDateChange(parsed);
  };

  // ── Slider change ──
  const handleSliderChange = (value: number) => {
    const min = _minDate.getTime();
    const max = _maxDate.getTime();
    const newTime = min + value * (max - min);
    const newDate = new Date(newTime);
    setSelectedDate(newDate);
    setInputText(formatDateTime(newDate));
    setInputError(null);
    updateSliderFromDate(newDate);
    onDateChange(newDate);
  };

  // ── Quick suggestion click ──
  const handleQuickSuggestion = (date: Date) => {
    // Clamp à la plage valide
    const clamped = new Date(Math.max(_minDate.getTime(), Math.min(_maxDate.getTime(), date.getTime())));
    setSelectedDate(clamped);
    setInputText(formatDateTime(clamped));
    setInputError(null);
    updateSliderFromDate(clamped);
    onDateChange(clamped);
    setShowSuggestions(false);
  };

  const suggestions = getQuickSuggestions().filter(
    s => s.date >= _minDate && s.date <= _maxDate
  );

  const sliderWidth = sliderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      {/* ══ TITRE ══ */}
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={14} color={C.gold} />
        <Text style={styles.title}>Historique du classement</Text>
      </View>

      {/* ══ INPUT TEXTE ══ */}
      <View style={[styles.inputWrapper, inputError && styles.inputError]}>
        <Ionicons name="time-outline" size={14} color={inputError ? C.gold : C.sub} />
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="YYYY/MM/JJ HH:MM:SS"
          placeholderTextColor={C.muted}
          keyboardType="default"
        />
        {inputError && <Ionicons name="alert-circle" size={14} color={C.gold} />}
      </View>

      {inputError && <Text style={styles.errorText}>{inputError}</Text>}

      {/* ══ AFFICHAGE DATE ══ */}
      <Text style={styles.displayDate}>{formatDisplayDate(selectedDate)}</Text>

      {/* ══ SLIDER ══ */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>{formatDateTime(_minDate)}</Text>

        <SliderTrack
          anim={sliderAnim}
          min={_minDate.getTime()}
          max={_maxDate.getTime()}
          onChangeValue={handleSliderChange}
        >
          <Animated.View
            style={[
              styles.sliderFill,
              {
                width: sliderWidth,
              },
            ]}
          />
        </SliderTrack>

        <Text style={styles.sliderLabel}>{formatDateTime(_maxDate)}</Text>
      </View>

      {/* ══ SUGGESTIONS RAPIDES ══ */}
      <View style={styles.suggestionsHeader}>
        <Text style={styles.suggestionsTitle}>Dates rapides</Text>
        <TouchableOpacity
          onPress={() => setShowSuggestions(!showSuggestions)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showSuggestions ? "chevron-up" : "chevron-down"}
            size={16}
            color={C.gold}
          />
        </TouchableOpacity>
      </View>

      {showSuggestions && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionPill}
              onPress={() => handleQuickSuggestion(s.date)}
              activeOpacity={0.75}
            >
              <Text style={styles.suggestionText}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SLIDER TRACK INTERACTIF
// ─────────────────────────────────────────────────────────────
interface SliderTrackProps {
  anim: Animated.Value;
  min: number;
  max: number;
  onChangeValue: (value: number) => void;
  children: React.ReactNode;
}

function SliderTrack({ anim, min, max, onChangeValue, children }: SliderTrackProps) {
  const trackRef = useRef<View>(null);
  const [isPressed, setIsPressed] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsPressed(true);
      },
      onPanResponderMove: (evt, { moveX }) => {
        if (!trackRef.current) return;
        
        trackRef.current.measure((x, y, width, height, pageX, pageY) => {
          const touchX = moveX - pageX;
          const percent = Math.max(0, Math.min(1, touchX / width));
          
          anim.setValue(percent);
          onChangeValue(percent);
        });
      },
      onPanResponderRelease: () => {
        setIsPressed(false);
      },
    })
  ).current;

  const handlePress = (event: any) => {
    if (!trackRef.current) return;
    
    trackRef.current.measure((x, y, width, height, pageX, pageY) => {
      const touchX = event.nativeEvent.locationX;
      const percent = Math.max(0, Math.min(1, touchX / width));
      
      anim.setValue(percent);
      onChangeValue(percent);
    });
  };

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  return (
    <TouchableOpacity
      ref={trackRef}
      style={styles.sliderTrack}
      onPress={handlePress}
      activeOpacity={1}
      {...panResponder.panHandlers}
    >
      {children}
      <Animated.View
        style={[
          styles.sliderThumb,
          {
            transform: [
              {
                translateX,
              },
            ],
          },
        ]}
        pointerEvents="none"
      />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.goldBorder,
    shadowColor: C.gold,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    color: C.text,
    fontWeight: "900",
    fontSize: 14,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
  },
  inputError: {
    borderColor: C.gold,
    backgroundColor: "rgba(212,175,55,0.06)",
  },
  input: {
    flex: 1,
    color: C.text,
    fontWeight: "800",
    fontSize: 13,
    fontFamily: "Courier New",
  },
  errorText: {
    color: C.gold,
    fontWeight: "700",
    fontSize: 11,
    marginTop: 4,
  },

  displayDate: {
    color: C.gold,
    fontWeight: "900",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  sliderContainer: {
    marginVertical: 12,
  },
  sliderLabel: {
    color: C.muted,
    fontWeight: "600",
    fontSize: 10,
    marginHorizontal: 0,
  },
  sliderTrack: {
    height: 24,
    backgroundColor: C.border,
    borderRadius: 12,
    marginVertical: 8,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  sliderFill: {
    height: "100%",
    backgroundColor: C.gold,
    borderRadius: 3,
  },
  sliderThumb: {
    position: "absolute",
    left: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.gold,
    borderWidth: 2,
    borderColor: C.card,
    shadowColor: C.gold,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },

  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  suggestionsTitle: {
    color: C.sub,
    fontWeight: "800",
    fontSize: 12,
  },

  suggestionsRow: {
    marginTop: 8,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  suggestionPill: {
    backgroundColor: C.goldLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.goldBorder,
    marginRight: 8,
  },
  suggestionText: {
    color: C.gold,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.2,
  },
});