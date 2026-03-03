// lib/supabase.ts — FINAL JWT-SAFE / RLS-SAFE / EXPO-SAFE

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * 🚀 Supabase client RHAZN — MOBILE FIRST (JWT SAFE)
 *
 * - Auth: email + mot de passe uniquement
 * - Pas de magic link
 * - Pas de OAuth
 * - Pas de PKCE
 * - Pas de callback URL
 * - Session persistante fiable (AsyncStorage)
 * - JWT toujours injecté dans PostgREST
 * - Compatible Expo Router + RLS
 * - ✅ Suppression définitive du warning navigatorLock (Expo / Android)
 */
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // 💾 STOCKAGE NATIF OBLIGATOIRE (clé de la correction)
      storage: AsyncStorage,

      // 🔁 Rafraîchissement auto des tokens
      autoRefreshToken: true,

      // 💾 Persistance locale réelle de la session
      persistSession: true,

      // ❌ NE PAS lire la session depuis l’URL (mobile)
      detectSessionInUrl: false,

      // ✅ Flow classique email/password (stable)
      flowType: "implicit",

      // 🆕 IMPORTANT — Expo / React Native fix
      // ➜ empêche Supabase d’attendre navigator.locks (inexistant en RN)
      // ➜ supprime définitivement :
      //    "@supabase/gotrue-js: navigatorLock acquire timed out"
      lockTimeout: 0,
    },

    // 🧠 Info client utile debug PostgREST
    global: {
      headers: {
        "X-Client-Info": "rhazn-mobile",
      },
    },
  }
);
