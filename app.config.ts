// ✅ RHAZN — app.json COMPLET FINAL — CORRIGÉ iOS 15.1
// Copier-coller directement dans votre projet

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
    splash: {
      image:           "./assets/images/rhazn-logo.png",
      resizeMode:      "contain",
      backgroundColor: "#000000"
    },

    // ═══════════════════════════════════════
    // ANDROID
    // ═══════════════════════════════════════
    android: {
      package: APP_ID,
      versionCode: 132,

      adaptiveIcon: {
        foregroundImage: "./assets/images/rz-logo.png",
        backgroundColor: "#000000",
      },

      softwareKeyboardLayoutMode: "pan",

      permissions: [
        "CAMERA",
        "RECORD_AUDIO",
        "INTERNET",
        "ACCESS_NETWORK_STATE",

        // ✅ Android 13+ — Media Access
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO",

        // ✅ Compat anciens Android
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",

        // ✅ Stockage documents
        "android.permission.MANAGE_EXTERNAL_STORAGE"
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
    // iOS — ⚠️ MINIMUM 15.1
    // ═══════════════════════════════════════
    ios: {
      bundleIdentifier:  APP_ID,
      buildNumber:       "132",
      supportsTablet:    false,
      requireFullScreen: true,
      deploymentTarget:  "15.1",  // ✅ MINIMUM REQUIS PAR EXPO

      associatedDomains: ["applinks:rhazn.org"],

      infoPlist: {
        NSCameraUsageDescription:
          "RHAZN utilise la caméra pour filmer vos contenus.",
        NSMicrophoneUsageDescription:
          "RHAZN utilise le micro pour enregistrer l'audio.",
        NSPhotoLibraryUsageDescription:
          "RHAZN accède à votre galerie pour sélectionner et publier des vidéos.",
        NSPhotoLibraryAddUsageDescription:
          "RHAZN peut sauvegarder des vidéos dans votre galerie.",
        NSDocumentPickerExportMessage:
          "Permettre à RHAZN de sélectionner des fichiers audio pour les publier.",
        NSAppleMusicsUsageDescription:
          "RHAZN accède à votre musique pour enrichir vos publications.",
        NSLocalNetworkUsageDescription:
          "RHAZN a besoin d'accéder à votre réseau local.",
        NSBonjourServiceTypes:
          ["_rhazn._tcp", "_rhazn._udp"],

        PHPhotoLibraryPreventAutomaticLimitedAccessAlert: false,
        ITSAppUsesNonExemptEncryption: false
      }
    },

    // ═══════════════════════════════════════
    // WEB
    // ═══════════════════════════════════════
    web: {
      favicon: "./assets/images/grape.png",
      bundler: "metro"
    },

    // ═══════════════════════════════════════
    // PLUGINS
    // ═══════════════════════════════════════
    plugins: [
      // ✅ Expo Router — NO OPTIONS
      "expo-router",

      // ✅ Multimedia
      "expo-av",
      "expo-web-browser",

      // ✅ Security & Auth
      "expo-local-authentication",
      "expo-secure-store",

      // ✅ File Selection (Images & Audio)
      [
        "expo-document-picker",
        {
          iCloudContainerEnvironment: "Production"
        }
      ],

      // ✅ Image Picker
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

      // ✅ Media Library
      [
        "expo-media-library",
        {
          photosPermission:
            "Autoriser RHAZN à sauvegarder des vidéos dans votre galerie.",
          isAccessMediaLocationEnabled: true
        }
      ],

      // ✅ Splash Screen
      [
        "expo-splash-screen",
        {
          image:           "./assets/images/rhazn-logo.png",
          resizeMode:      "contain",
          backgroundColor: "#000000"
        }
      ],

      // ✅ Build Properties — iOS 15.1 MINIMUM
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion:  36,
            minSdkVersion:     24,
            maxSdkVersion:     36,
            usesCleartextTraffic: false
          },
          ios: {
            useFrameworks: "static",
            deploymentTarget: "15.1"  // ✅ MINIMUM EXPO-BUILD-PROPERTIES
          }
        }
      ],

      // ✅ File System (pour stockage audio)
      [
        "expo-file-system",
        {
          documentDirectory: true
        }
      ]
    ],

    // ═══════════════════════════════════════
    // EXTRA — Variables d'environnement
    // ═══════════════════════════════════════
    extra: {
      env:        ENV,
      appVersion: APP_VERSION,

      // ✅ API Backend
      apiUrl:
        process.env.EXPO_PUBLIC_API_URL ||
        "https://rhazn-backend-production.up.railway.app",

      // ✅ Supabase
      supabaseUrl:     process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      // ✅ EAS
      eas: {
        projectId: "43ced0cc-a4aa-41e3-8784-0d5f5f1682e0"
      }
    },

    // ═══════════════════════════════════════
    // RUNTIME & UPDATES
    // ═══════════════════════════════════════
    runtimeVersion: {
      policy: "appVersion"
    },

    updates: {
      url:                     "https://u.expo.dev/43ced0cc-a4aa-41e3-8784-0d5f5f1682e0",
      enabled:                 true,
      checkAutomatically:      "ON_LOAD",
      fallbackToCacheTimeout:  0,
      requestHeaders: {
        "expo-channel-name": ENV
      }
    },

    // ═══════════════════════════════════════
    // PREMIUM FEATURES
    // ═══════════════════════════════════════
    privacy: "public",
    description: "RHAZN — Plateforme créative haïtienne de partage vidéo",
    homepage: "https://rhazn.org",
    githubUrl: "https://github.com/rhazncontact-cmd/rhazn"
  };
};