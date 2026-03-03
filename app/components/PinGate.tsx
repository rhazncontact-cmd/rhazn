import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/* ===================== COLORS (safe local) ===================== */

const COLORS = {
  bg: "#FFFFFF",
  card: "#F6F7F9",
  border: "#E5E7EB",
  text: "#111111",
  muted: "#6E6E73",
  primary: "#007AFF",
};

/* ===================== COMPONENT ===================== */

export default function PinGate({
  visible,
  onSuccess,
  onClose,
}: {
  visible: boolean;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");

  /* ===================== INPUT ===================== */

  const press = (n: string) => {
    if (pin.length >= 4) return;
    setPin((p) => p + n);
  };

  const del = () => setPin((p) => p.slice(0, -1));

  /* ===================== VALIDATION ===================== */
  useEffect(() => {
    if (pin.length !== 4) return;

    // ⚠️ Remplacer plus tard par Supabase hash sécurisé
    if (pin === "1234") {
      setPin("");
      onSuccess();
    } else {
      setPin("");
    }
  }, [pin]);

  /* ===================== KEY ===================== */

  const Key = ({ n }: { n: string }) => (
    <TouchableOpacity style={styles.key} onPress={() => press(n)}>
      <Text style={styles.keyText}>{n}</Text>
    </TouchableOpacity>
  );

  /* ===================== RENDER ===================== */

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>

          <Text style={styles.title}>Entrer votre PIN</Text>

          {/* dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && { backgroundColor: COLORS.primary },
                ]}
              />
            ))}
          </View>

          {/* keypad */}
          <View style={styles.grid}>
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <Key key={n} n={String(n)} />
            ))}

            <View />

            <Key n="0" />

            <TouchableOpacity style={styles.key} onPress={del}>
              <Ionicons name="backspace-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Annuler</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: 300,
    backgroundColor: COLORS.bg,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 18,
  },

  dotsRow: {
    flexDirection: "row",
    marginBottom: 22,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
  },

  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  key: {
    width: 70,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  keyText: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
  },

  cancel: {
    marginTop: 6,
    color: COLORS.muted,
    fontWeight: "700",
  },
});
