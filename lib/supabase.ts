// lib/supabase.ts — RHAZN ELITE · YouTube-like Session
// ✅ Session permanente — jamais de déconnexion fantôme
// ✅ Offline-safe — app visible même sans internet
// ✅ Token refresh silencieux en arrière-plan

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("❌ Supabase ENV manquant — vérifiez .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // ❌ Supprimé : flowType: "implicit"
    debug: false,
  },

  global: {
    headers: { "X-Client-Info": "rhazn-mobile" },
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
    },
  },

  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ✅ Refresh silencieux façon YouTube
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});