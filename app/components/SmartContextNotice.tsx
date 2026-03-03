import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

function SmartContextNotice({
  context,
  visible,
  message,
}: {
  context:
    | "info"
    | "success"
    | "error"
    | "warning"
    | "payment"
    | "security"
    | "cadna";
  visible: boolean;
  message?: string;
}) {
  if (!visible) return null;

  const MAP: any = {
    info: {
      bg: "#F5F5F7",
      accent: "#8E8E93",
      title: "Information",
    },
    success: {
      bg: "rgba(52,199,89,0.12)",
      accent: "#34C759",
      title: "Succès",
    },
    error: {
      bg: "rgba(255,59,48,0.12)",
      accent: "#FF3B30",
      title: "Erreur",
    },
    warning: {
      bg: "rgba(255,149,0,0.14)",
      accent: "#FF9500",
      title: "Attention",
    },
    payment: {
      bg: "rgba(212,175,55,0.14)",
      accent: "#D4AF37",
      title: "Transaction",
    },
    security: {
      bg: "rgba(88,86,214,0.14)",
      accent: "#5856D6",
      title: "Sécurité",
    },
    cadna: {
      bg: "rgba(10,132,255,0.14)",
      accent: "#0A84FF",
      title: "Validation CADNA",
    },
  };

  const c = MAP[context];

  return (
    <Animated.View
      entering={FadeInUp.duration(240)}
      exiting={FadeOutUp.duration(200)}
      style={{
        backgroundColor: c.bg,
        borderRadius: 18,
        padding: 16,
        marginVertical: 14,
        borderLeftWidth: 4,
        borderLeftColor: c.accent,
      }}
    >
      <Text style={{ fontWeight: "800", color: "#1C1C1E", marginBottom: 4 }}>
        {c.title}
      </Text>
      {message && (
        <Text style={{ color: "#6e6e73", fontSize: 13, lineHeight: 18 }}>
          {message}
        </Text>
      )}
    </Animated.View>
  );
}
