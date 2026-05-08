import "dotenv/config";
import { ConfigContext, ExpoConfig } from "expo/config";

// ─────────────────────────────────────────
// RHAZN — App Configuration
// ─────────────────────────────────────────

const APP_ID      = "com.rhzn.dev";
const APP_VERSION = "1.3.2";

export default ({ config }: ConfigContext): ExpoConfig => {
  const ENV = process.env.EXPO_PUBLIC_ENV || "production";

  return {
    ...config,

    // ═══════════════════════════════════════
    // IDENTITÉ
    // ═══════════════════════════════════════
    name:               "RHAZN",
    slug:               "rhazn-app",
    version:            APP_VERSION,
    orientation:        "portrait",
    scheme:             "rhazn",
    userInterfaceStyle: "dark",

    // ═══════════════════════════════════════
    // ASSETS
    // ═══════════════════════════════════════
    icon:                "./assets/images/rz-logo.png",
    assetBundlePatterns: ["**/*"],

    // ═══════════════════════════════════════
    // ANDROID
    // ═══════════════════════════════════════
    android: {
      package: APP_ID,

      adaptiveIcon: {
        foregroundImage: "./assets/images/rz-logo.png",
        backgroundColor: "#000000",
      },

      softwareKeyboardLayoutMode: "pan",

      permissions: [
        "CAMERA",
        "RECORD_AUDIO",

        // ✅ Android 13+
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",

        // ✅ compat anciens Android
        "android.permission.READ_EXTERNAL_STORAGE"
      ],

      intentFilters: [
        {
          action:     "VIEW",
          autoVerify: true,
          category:   ["BROWSABLE", "DEFAULT"],
          data: [
            { scheme: "rhazn", host: "suspentz" },
            { scheme: "rhazn" }
          ]
        },
        {
          action:     "VIEW",
          autoVerify: true,
          category:   ["BROWSABLE", "DEFAULT"],
          data: [
            {
              scheme:     "https",
              host:       "rhazn.org",
              pathPrefix: "/open"
            },
            {
              scheme:     "https",
              host:       "rhazn.org",
              pathPrefix: "/suspentz"
            }
          ]
        }
      ]
    },

    // ═══════════════════════════════════════
    // iOS
    // ═══════════════════════════════════════
    ios: {
      bundleIdentifier:  APP_ID,
      supportsTablet:    false,
      requireFullScreen: true,

      associatedDomains: ["applinks:rhazn.org"],

      infoPlist: {
        NSCameraUsageDescription:
          "RHAZN utilise la caméra pour filmer vos contenus.",
        NSMicrophoneUsageDescription:
          "RHAZN utilise le micro pour enregistrer l’audio.",
        NSPhotoLibraryUsageDescription:
          "RHAZN accède à votre galerie pour sélectionner et publier des vidéos.",
        NSPhotoLibraryAddUsageDescription:
          "RHAZN peut sauvegarder des vidéos dans votre galerie.",

        PHPhotoLibraryPreventAutomaticLimitedAccessAlert: false
      }
    },

    // ═══════════════════════════════════════
    // WEB
    // ═══════════════════════════════════════
    web: {
      favicon: "./assets/images/grape.png"
    },

    // ═══════════════════════════════════════
    // PLUGINS
    // ═══════════════════════════════════════
    plugins: [
      "expo-router",
      "expo-av",
      "expo-web-browser",
      "expo-local-authentication",
      "expo-secure-store",

      [
        "expo-image-picker",
        {
          photosPermission:
            "RHAZN accède à votre galerie pour publier du contenu.",
          cameraPermission:
            "RHAZN utilise votre caméra pour créer des vidéos.",
          isAccessMediaLocationEnabled: true
        }
      ],

      [
        "expo-media-library",
        {
          photosPermission:
            "Autoriser RHAZN à sauvegarder des vidéos dans votre galerie."
        }
      ],

      [
        "expo-splash-screen",
        {
          image:           "./assets/images/rhazn-logo.png",
          resizeMode:      "contain",
          backgroundColor: "#000000"
        }
      ],

      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion:  36,
            minSdkVersion:     24
          },
          ios: {
            useFrameworks: "static"
          }
        }
      ]
    ],

    // ═══════════════════════════════════════
    // EXTRA
    // ═══════════════════════════════════════
    extra: {
      env:        ENV,
      appVersion: APP_VERSION,

      // ✅ API sécurisée avec fallback
      apiUrl:
        process.env.EXPO_PUBLIC_API_URL ||
        "https://rhazn-video-production.up.railway.app",

      supabaseUrl:     process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      eas: {
        projectId: "43ced0cc-a4aa-41e3-8784-0d5f5f1682e0"
      }
    },

    // ═══════════════════════════════════════
    // STABILITY
    // ═══════════════════════════════════════
    runtimeVersion: {
      policy: "appVersion"
    },

    updates: {
      fallbackToCacheTimeout: 0
    }
  };
};
