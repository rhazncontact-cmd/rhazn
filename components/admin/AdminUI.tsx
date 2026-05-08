import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ReactNode } from "react";
import {
    StatusBar,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import AdminGuard from "./AdminGuard";

export const adminTheme = {
  bg: "#000000",
  cardBg: "#0B0B0B",
  cardBorder: "#222222",
  gold: "#FFD700",
  text: "#FFFFFF",
  textSoft: "#A1A1A1",
  textMuted: "#8b8b8b",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
};

type AdminScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean; // 👈 nouveau
};

export function AdminScreen({
  title,
  subtitle,
  children,
  showBack,
}: AdminScreenProps) {
  const router = useRouter();

  return (
    <AdminGuard>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <View style={styles.container}>
        {showBack ? (
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Feather
                name="chevron-left"
                size={22}
                color={adminTheme.gold}
              />
            </TouchableOpacity>

            <View>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? (
                <Text style={styles.subtitle}>{subtitle}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : null}
          </>
        )}

        {children}
      </View>
    </AdminGuard>
  );
}

export function AdminChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? adminTheme.gold : "#333",
          backgroundColor: active ? "#1a1a1a" : "#0B0B0B",
        },
      ]}
    >
      <Text
        style={{
          color: active ? adminTheme.gold : "#aaa",
          fontWeight: "700",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function AdminCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AdminStatusPill({
  status,
  style,
}: {
  status: string;
  style?: TextStyle;
}) {
  let color = adminTheme.textSoft;

  if (["ok", "validated"].includes(status)) color = adminTheme.success;
  else if (["pending", "flagged"].includes(status)) color = adminTheme.warning;
  else if (["failed", "blocked", "rejected"].includes(status))
    color = adminTheme.danger;

  return (
    <Text
      style={[
        {
          borderWidth: 1,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 4,
          fontSize: 11,
          fontWeight: "700",
          color,
          borderColor: color,
        },
        style,
      ]}
    >
      {status}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adminTheme.bg, paddingTop: 70 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 10,
    marginBottom: 10,
  },

  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminTheme.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: adminTheme.gold,
    fontSize: 22,
    fontWeight: "700",
  },

  subtitle: {
    color: adminTheme.textSoft,
    fontSize: 13,
    marginTop: 2,
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },

  card: {
    backgroundColor: adminTheme.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: adminTheme.cardBorder,
  },
});
