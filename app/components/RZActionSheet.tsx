import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

const COLORS = {
  sheet: "#0E0E0E",
  border: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.70)",
  danger: "#FF453A",
};

type Action = {
  label: string;
  onPress: () => void;
  tone?: "danger";
};

export default function RZActionSheet({
  visible,
  onClose,
  title,
  subtitle,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: Action[];
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {(title || subtitle) && (
            <View style={styles.head}>
              {!!title && <Text style={styles.title}>{title}</Text>}
              {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          )}

          <View style={styles.actions}>
            {actions.map((a, i) => (
              <Pressable
                key={`${a.label}-${i}`}
                onPress={a.onPress}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    a.tone === "danger" && { color: COLORS.danger },
                  ]}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.safeBottom} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.sheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  head: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  title: { color: COLORS.text, fontWeight: "900", fontSize: 16 },
  subtitle: { color: COLORS.muted, marginTop: 6, lineHeight: 18, fontSize: 12.5 },

  actions: { paddingBottom: 8 },
  actionRow: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: COLORS.text, fontWeight: "700", fontSize: 16 },

  safeBottom: { height: 18 },
});
