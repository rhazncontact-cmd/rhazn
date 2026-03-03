import { Entypo } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    AppState,
    AppStateStatus,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

// iOS only (safe require)
let ScreenCapture: any = null;
try {
  // @ts-ignore
  ScreenCapture = require("expo-screen-capture");
} catch {}

import {
    rzBindBackgroundAutoLock,
    rzClearPinFailures,
    rzIsPinTemporarilyLocked,
    rzLockRemainingMs,
    rzRegisterPinFailure,
    rzSupportsAppleScreenShield,
} from "../../lib/rzBankGuard";
import { rzSecure } from "../../lib/rzSecure";

const PIN_KEY = "RHAZN_USER_PIN";
const UNLOCK_UNTIL_KEY = "RHAZN_UNLOCK_UNTIL_MS";
const AUTO_LOCK_MS = 50_000;

const COLORS = {
  bg: "#FFFFFF",
  gold: "#D4AF37",
  text: "#000",
  sub: "#6E6E73",
  soft: "#F2F2F7",
  border: "#E5E5EA",
};

type Props = {
  children: React.ReactNode;
  forceLock?: boolean;
};

export default function RzPinLock({ children, forceLock }: Props) {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(true);

  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [pin, setPin] = useState("");

  const [blocked, setBlocked] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const inactivityTimer = useRef<any>(null);
  const remainingTimer = useRef<any>(null);

  const shake = useRef(new Animated.Value(0)).current;

  const resetInactivity = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      lockNow();
    }, AUTO_LOCK_MS);
  };

  const lockNow = async () => {
    await rzSecure.del(UNLOCK_UNTIL_KEY);
    setPin("");
    setLocked(true);
  };

  const unlockNow = async () => {
    const until = String(Date.now() + AUTO_LOCK_MS);
    await rzSecure.set(UNLOCK_UNTIL_KEY, until);
    setLocked(false);
    setPin("");
    resetInactivity();
  };

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const startRemainingTicker = async () => {
    if (remainingTimer.current) clearInterval(remainingTimer.current);

    const tick = async () => {
      const ms = await rzLockRemainingMs();
      setRemaining(ms);
      if (ms <= 0) {
        if (remainingTimer.current) clearInterval(remainingTimer.current);
        setBlocked(false);
      }
    };

    await tick();
    remainingTimer.current = setInterval(tick, 250);
  };

  // ✅ init: pin + unlockUntil + block state
  useEffect(() => {
    (async () => {
      const p = await rzSecure.get(PIN_KEY);

      if (!p) {
        router.replace("/user-security-pin");
        return;
      }
      setSavedPin(p);

      const isBlocked = await rzIsPinTemporarilyLocked();
      setBlocked(isBlocked);
      if (isBlocked) await startRemainingTicker();

      const untilStr = await rzSecure.get(UNLOCK_UNTIL_KEY);
      const until = untilStr ? Number(untilStr) : 0;

      if (until && until > Date.now() && !isBlocked) {
        setLocked(false);
        resetInactivity();
      } else {
        setLocked(true);
      }

      setReady(true);
    })();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (remainingTimer.current) clearInterval(remainingTimer.current);
    };
  }, []);

  // ✅ BANQUE: lock immédiat au background + blur iOS si capture
  useEffect(() => {
    rzBindBackgroundAutoLock(() => {
      lockNow();
    });

    const onChange = async (st: AppStateStatus) => {
      if (st !== "active") {
        await lockNow();
      } else {
        // revient → rester lock (banque)
        setLocked(true);
        setPin("");
      }
    };

    const sub = AppState.addEventListener("change", onChange);

    // iOS: capture / record detection
    let captureSub: any = null;
    let recordSub: any = null;

    const initIOSShield = async () => {
      if (!rzSupportsAppleScreenShield || !ScreenCapture) return;

      try {
        captureSub = ScreenCapture.addScreenshotListener?.(() => {
          // blur/lock
          lockNow();
        });
      } catch {}

      try {
        // @ts-ignore
        recordSub = ScreenCapture.addScreenCaptureListener?.(({ isCaptured }: any) => {
          if (isCaptured) lockNow();
        });
      } catch {}
    };

    initIOSShield();

    return () => {
      sub.remove();
      try { captureSub?.remove?.(); } catch {}
      try { recordSub?.remove?.(); } catch {}
    };
  }, []);

  // ✅ forceLock
  useEffect(() => {
    if (forceLock) lockNow();
  }, [forceLock]);

  const push = (n: string) => {
    if (blocked) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetInactivity();

    if (pin.length >= 4) return;

    const np = pin + n;
    setPin(np);

    if (np.length === 4) setTimeout(() => verify(np), 120);
  };

  const del = () => {
    if (blocked) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetInactivity();
    setPin((v) => v.slice(0, -1));
  };

  const verify = async (p: string) => {
    if (blocked) return;

    // si bloqué côté storage
    if (await rzIsPinTemporarilyLocked()) {
      setBlocked(true);
      await startRemainingTicker();
      setPin("");
      return;
    }

    if (!savedPin || p !== savedPin) {
      setPin("");
      triggerShake();

      const res = await rzRegisterPinFailure();
      if (res.locked) {
        setBlocked(true);
        await startRemainingTicker();
      }
      return;
    }

    // ✅ success: clear failures + unlock
    await rzClearPinFailures();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await unlockNow();
  };

  const dots = useMemo(() => [0, 1, 2, 3], []);

  const remainingLabel = useMemo(() => {
    const s = Math.ceil(remaining / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [remaining]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: "#fff" }} />;

  if (locked) {
    return (
      <View style={styles.lockWrap}>
        <Animated.View
          style={[
            styles.lockCard,
            {
              transform: [
                {
                  translateX: shake.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-12, 12],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.lockTitle}>🔐 PIN RHAZN</Text>

          {blocked ? (
            <Text style={styles.lockSub}>
              Trop d’essais. Réessayez dans {remainingLabel}
            </Text>
          ) : (
            <Text style={styles.lockSub}>Entrez votre PIN sécurisé</Text>
          )}

          <View style={styles.dots}>
            {dots.map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  pin.length > i && { backgroundColor: COLORS.gold },
                ]}
              />
            ))}
          </View>

          <View style={{ marginTop: 18, opacity: blocked ? 0.35 : 1 }}>
            {[
              ["1", "2", "3"],
              ["4", "5", "6"],
              ["7", "8", "9"],
            ].map((row, idx) => (
              <View key={idx} style={styles.padRow}>
                {row.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={styles.padBtn}
                    onPress={() => push(n)}
                    activeOpacity={0.9}
                    disabled={blocked}
                  >
                    <Text style={styles.padText}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={styles.padRow}>
              <View style={styles.padBtnGhost} />
              <TouchableOpacity
                style={styles.padBtn}
                onPress={() => push("0")}
                activeOpacity={0.9}
                disabled={blocked}
              >
                <Text style={styles.padText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.padBtn}
                onPress={del}
                activeOpacity={0.9}
                disabled={blocked}
              >
                <Entypo name="erase" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.managePin}
            onPress={() => router.push("/user-security-pin")}
          >
            <Text style={styles.managePinText}>Gérer mon PIN</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={resetInactivity}
      onTouchMove={resetInactivity}
      onTouchEnd={resetInactivity}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  lockWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  lockCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  lockTitle: { color: COLORS.text, fontSize: 22, fontWeight: "900" },
  lockSub: { marginTop: 6, color: COLORS.sub, fontWeight: "700" },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 14,
  },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.border },

  padRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  padBtn: {
    width: 72,
    height: 72,
    borderRadius: 72,
    backgroundColor: COLORS.soft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  padBtnGhost: { width: 72, height: 72 },
  padText: { fontSize: 26, fontWeight: "900", color: COLORS.text },

  managePin: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#F7F7FA",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  managePinText: { color: COLORS.sub, fontWeight: "900" },
});
