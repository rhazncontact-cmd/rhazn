import { AppState, AppStateStatus, Platform } from "react-native";
import { rzSecure } from "./rzSecure";

// Keys
const FAIL_COUNT_KEY = "RHAZN_PIN_FAIL_COUNT";
const LOCK_UNTIL_KEY = "RHAZN_PIN_LOCK_UNTIL_MS";

// Policy
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000; // 5 minutes

let appStateSub: any = null;

export async function rzIsPinTemporarilyLocked(): Promise<boolean> {
  const untilStr = await rzSecure.get(LOCK_UNTIL_KEY);
  const until = untilStr ? Number(untilStr) : 0;
  return !!until && until > Date.now();
}

export async function rzLockRemainingMs(): Promise<number> {
  const untilStr = await rzSecure.get(LOCK_UNTIL_KEY);
  const until = untilStr ? Number(untilStr) : 0;
  return Math.max(0, until - Date.now());
}

export async function rzRegisterPinFailure(): Promise<{ locked: boolean; remainingMs: number }> {
  const locked = await rzIsPinTemporarilyLocked();
  if (locked) return { locked: true, remainingMs: await rzLockRemainingMs() };

  const cStr = await rzSecure.get(FAIL_COUNT_KEY);
  const c = cStr ? Number(cStr) : 0;
  const next = c + 1;

  await rzSecure.set(FAIL_COUNT_KEY, String(next));

  if (next >= MAX_FAILS) {
    const until = Date.now() + LOCK_MS;
    await rzSecure.set(LOCK_UNTIL_KEY, String(until));
    await rzSecure.set(FAIL_COUNT_KEY, "0");
    return { locked: true, remainingMs: LOCK_MS };
  }

  return { locked: false, remainingMs: 0 };
}

export async function rzClearPinFailures() {
  await rzSecure.set(FAIL_COUNT_KEY, "0");
  await rzSecure.del(LOCK_UNTIL_KEY);
}

/**
 * Banque centrale: lock immédiat dès background
 * callbackLockNow = ta fonction lockNow() dans RzPinLock
 */
export function rzBindBackgroundAutoLock(callbackLockNow: () => void) {
  if (appStateSub) return;

  const onChange = (st: AppStateStatus) => {
    if (st !== "active") callbackLockNow();
  };

  appStateSub = AppState.addEventListener("change", onChange);
}

export function rzUnbindBackgroundAutoLock() {
  try {
    appStateSub?.remove?.();
  } catch {}
  appStateSub = null;
}

export const rzSupportsAppleScreenShield = Platform.OS === "ios";
