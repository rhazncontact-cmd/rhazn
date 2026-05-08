import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const GOLD = "#D4AF37";

type Props = {
  visible: boolean;
  title: string;
  description: string;
  priceTan: number;
  warning?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmPaymentModal({
  visible,
  title,
  description,
  priceTan,
  warning,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.desc}>{description}</Text>

          <View style={styles.priceBox}>
            <Text style={styles.price}>{priceTan} TAN</Text>
          </View>

          {warning && (
            <Text style={styles.warning}>{warning}</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancel}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirm}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.confirmText}>Confirmer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 26,
  },
  box: {
    backgroundColor: "#111",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#333",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  desc: {
    color: "#ccc",
    fontSize: 13,
    marginBottom: 14,
  },
  priceBox: {
    alignItems: "center",
    marginBottom: 12,
  },
  price: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
  },
  warning: {
    color: "#F9A825",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#222",
    alignItems: "center",
  },
  cancelText: {
    color: "#aaa",
    fontWeight: "700",
  },
  confirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: "center",
  },
  confirmText: {
    color: "#000",
    fontWeight: "900",
  },
});
