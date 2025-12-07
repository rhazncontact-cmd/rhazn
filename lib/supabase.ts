import { createClient } from "@supabase/supabase-js";
import * as Linking from "expo-linking";

// ---------------------------------------------------------------------------
// 📌 URL de callback pour l’app RHAZN (dans app.config.js: scheme: "rhazn")
// ---------------------------------------------------------------------------
const redirectUrl = Linking.createURL("auth/callback", {
  scheme: "rhazn",
});

// ---------------------------------------------------------------------------
// 🚀 Client Supabase pour Expo Mobile (Magic Link + OAuth + PKCE)
// ---------------------------------------------------------------------------
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,

      // ESSENTIEL pour Expo Router
      detectSessionInUrl: false,

      // NE PAS FORCER PKCE, sinon les emails activations NE FONCTIONNENT PLUS
      // flowType: "pkce",

      // correct → permet MagicLink, Email Confirmation & PKCE fallback
      flowType: "magiclink",

      // CALLBACK iOS / Android
      redirectTo: redirectUrl,
    },
  }
);
