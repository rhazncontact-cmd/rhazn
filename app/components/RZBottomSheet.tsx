import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function RZBottomSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const lastTap = useRef(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 250) openFullScreen();
    lastTap.current = now;
  };

  const openFullScreen = () => {
    setIsOpen(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6
    }).start();
  };

  const closeFullScreen = () => {
    Animated.spring(translateY, {
      toValue: SCREEN_HEIGHT,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0
    }).start(() => setIsOpen(false));
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120) closeFullScreen();
      else openFullScreen();
    }
  });

  return (
    <>
      {/* ✅ Footer button ONLY — not the sheet */}
      <Pressable onPress={handleDoubleTap} style={styles.footer}>
        <Text style={styles.footerText}>RZ-Communication</Text>
      </Pressable>

      {/* ✅ Single fullscreen sheet */}
      {isOpen && (
        <Animated.View
          style={[styles.fullscreen, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.grabber} />

          <Text style={styles.title}>📡 RZ-Communication</Text>
          <Text style={styles.desc}>
            Espace global de connexion humaine.
            Messages en temps réel. Interaction universelle.
          </Text>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderTopColor: "#222",
    borderTopWidth: 1
  },
  footerText: {
    color: "#FFD700",
    fontWeight: "600",
    fontSize: 14
  },
  fullscreen: {
    position: "absolute",
    top: 0,
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: "#000",
    paddingTop: 40,
    paddingHorizontal: 18
  },
  grabber: {
    width: 50,
    height: 5,
    backgroundColor: "#444",
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 12
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 10
  },
  desc: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 22
  }
});
