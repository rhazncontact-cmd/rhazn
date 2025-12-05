// app.config.ts — Configuration officielle RHAZN (VERSION FINALE DÉFINITIVE SDK 36)
import "dotenv/config";
import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const ENV = process.env.EXPO_PUBLIC_ENV || "development";

  const isProd = ENV === "production";
  const isPreview = ENV === "preview";

  // ID dynamiques selon l’environnement
  const androidPackage = isProd
    ? "com.rhzn.app"
    : isPreview
    ? "com.rhzn.preview"
    : "com.rhzn.dev";

  const iosBundleId = androidPackage;

  return {
    ...config,

    /** IDENTITÉ */
    name: "RHAZN",
    slug: "rhazn-app",
    version: "1.0.0",
    orientation: "portrait",

    /** ✅ SCHEME DEEPLINK OFFICIEL */
    scheme: "rhazn",

    newArchEnabled: true,
    userInterfaceStyle: "automatic",

    /** VISUELS */
    icon: "./assets/images/rhazn-logo.png",
    assetBundlePatterns: ["**/*"],

    /** ✅ ANDROID — SDK 36 FORCÉ */
    android: {
      package: androidPackage,

      adaptiveIcon: {
        foregroundImage: "./assets/images/rhazn-logo.png",
        backgroundColor: "#000000",
      },

      permissions: [
        "android.permission.INTERNET",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],

      softwareKeyboardLayoutMode: "pan",
      edgeToEdge: true,

      // ✅ FORÇAGE DÉFINITIF
      compileSdkVersion: 36,
      targetSdkVersion: 36,
      minSdkVersion: 24,

      statusBar: {
        hidden: false,
        translucent: true,
        backgroundColor: "transparent",
        barStyle: "light-content",
      },

      navigationBar: {
        visible: "leanback",
        backgroundColor: "#000000",
        barStyle: "light-content",
      },

      /** ✅ DEEPLINK ANDROID COMPLET */
      intentFilters: [
        {
          action: "VIEW",
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            { scheme: "rhazn" },
            {
              scheme: "https",
              host: "rhazn.org",
              pathPrefix: "/open",
            },
          ],
        },
      ],
    },

    /** IOS */
    ios: {
      supportsTablet: true,
      bundleIdentifier: iosBundleId,

      /** ✅ DEEPLINK iOS COMPLET */
      infoPlist: {
        CFBundleURLTypes: [
          { CFBundleURLSchemes: ["rhazn"] },
        ],

        NSCameraUsageDescription:
          "RHAZN requires camera access to scan QR codes and record videos.",
        NSMicrophoneUsageDescription:
          "RHAZN requires microphone access for audio recording.",
        NSPhotoLibraryUsageDescription:
          "RHAZN requires access to your photos for uploading content.",
        NSFaceIDUsageDescription:
          "Allow Face ID to authenticate securely in RHAZN.",

        /** ✅ AUTORISE https://rhazn.org/open */
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
    },

    /** WEB */
    web: {
      favicon: "./assets/images/rhazn-logo.png",
    },

    /** ✅ PLUGINS OFFICIELS — VERSION FINALE DÉFINITIVE */
    plugins: [
      "expo-router",
      "expo-video",
      "expo-web-browser",
      "expo-local-authentication",

      "expo-secure-store", // ✅ PIN & Sécurité
      "expo-barcode-scanner",

      [
        "expo-splash-screen",
        {
          image: "./assets/images/rhazn-logo.png",
          resizeMode: "contain",
          backgroundColor: "#000000",
          dark: { backgroundColor: "#000000" },
        },
      ],

      [
        "expo-build-properties",
        {
          android: {
            // ✅ BLOQUE DÉFINITIVEMENT L’ERREUR GRADLE
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            minSdkVersion: 24,
            buildToolsVersion: "36.0.0"
          },
          ios: {
            useFrameworks: "static",
          },
        },
      ],
    ],

    /** EXPERIMENTAL FEATURES */
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    /** ✅ VARIABLES DEV / PROD */
    extra: {
      env: ENV,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      eas: {
        projectId: "43ced0cc-a4aa-41e3-8784-0d5f5f1682e0",
      },
    },
  };
};
