// lib/useAppUpdate.ts
// ✅ Version FIXED — Supabase client (plus de fetch REST ❌)
// ✅ Stable production — fonctionne avec RLS + auth

import Constants from "expo-constants";
import { supabase } from "../lib/supabase"; // ✅ IMPORTANT

// ─────────────────────────────────────────────────────────────
// VERSION APP (compatible DEV + PROD)
// ─────────────────────────────────────────────────────────────
const APP_VERSION: string =
  (Constants.expoConfig as any)?.version ||
  (Constants.manifest2 as any)?.extra?.appVersion ||
  (Constants.manifest as any)?.version ||
  "0.0.0";

const CHECK_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type UpdateInfo = {
  available:     boolean;
  latestVersion: string | null;
  releaseNotes:  string | null;
  storeUrl:      string | null;
};

type Listener = (info: UpdateInfo) => void;

// ─────────────────────────────────────────────────────────────
// STORE GLOBAL
// ─────────────────────────────────────────────────────────────
class UpdateStore {
  private _info: UpdateInfo = {
    available:     false,
    latestVersion: null,
    releaseNotes:  null,
    storeUrl:      null,
  };

  private _listeners = new Set<Listener>();
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _checking = false;

  get info() {
    return this._info;
  }

  subscribe(fn: Listener) {
    this._listeners.add(fn);
    fn(this._info);
    return () => this._listeners.delete(fn);
  }

  private _emit() {
    this._listeners.forEach(fn => fn(this._info));
  }

  // ─────────────────────────────────────────────────────────
  // CHECK UPDATE (🔥 VERSION CORRIGÉE)
  // ─────────────────────────────────────────────────────────
  async check() {
    if (this._checking) return;
    this._checking = true;

    try {
      const { data, error } = await supabase
        .from("app_config")
        .select("latest_version, release_notes, store_url, force_update")
        .limit(1)
        .single();

      if (error) {
        console.log("❌ Supabase ERROR:", error.message);
        return;
      }

      console.log("📡 DB RESPONSE:", data);

      if (!data?.latest_version) {
        console.log("❌ No version found in DB");
        return;
      }

      const latest = String(data.latest_version).trim();

      console.log("📦 APP VERSION:", APP_VERSION);
      console.log("🚀 LATEST VERSION:", latest);

      const isNew =
        latest !== APP_VERSION &&
        isNewerVersion(latest, APP_VERSION);

      console.log("⚡ UPDATE AVAILABLE:", isNew);

      this._info = {
        available:     isNew,
        latestVersion: isNew ? latest : null,
        releaseNotes:  data.release_notes ?? null,
        storeUrl:      data.store_url ?? null,
      };

      this._emit();

    } catch (e) {
      console.log("❌ Update check error:", e);
    } finally {
      this._checking = false;
    }
  }

  // ─────────────────────────────────────────────────────────
  // POLLING
  // ─────────────────────────────────────────────────────────
  startPolling() {
    if (this._timer) return;
    this.check();
    this._timer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
  }

  stopPolling() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// COMPARAISON VERSION (SEMVER)
// ─────────────────────────────────────────────────────────────
function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.split(".").map(n => parseInt(n, 10));

  const [lMaj = 0, lMin = 0, lPat = 0] = parse(latest);
  const [cMaj = 0, cMin = 0, cPat = 0] = parse(current);

  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

// ─────────────────────────────────────────────────────────────
export const updateStore = new UpdateStore();
export { APP_VERSION };
