import "dotenv/config";
import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const ENV = process.env.EXPO_PUBLIC_ENV || "development";
  const appId = "com.rhzn.dev";

  return {
    ...config,

    /* ===================== APP ===================== */
    name: "RHAZN",
    slug: "rhazn-app",
    version: "1.0.5",   // 🔥 Version augmentée à chaque build
    orientation: "portrait",
    scheme: "rhazn",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    icon: "./assets/images/rz-logo.png",
    assetBundlePatterns: ["**/*"],

    /* ===================== ANDROID ===================== */
    android: {
      package: appId,
      versionCode: 6, // 🔥 Toujours augmenter le versionCode pour chaque mise à jour
      permissions: [
        "CAMERA",
        "RECORD_AUDIO",
        "READ_MEDIA_IMAGES",
        "READ_MEDIA_VIDEO",
      ],

      adaptiveIcon: {
        foregroundImage: "./assets/images/rz-logo.png",
        backgroundColor: "#000000",
      },

      softwareKeyboardLayoutMode: "pan",
      edgeToEdge: true,

      compileSdkVersion: 36,
      targetSdkVersion: 36,
      minSdkVersion: 24,

      statusBar: {
        translucent: true,
        backgroundColor: "transparent",
        barStyle: "light-content",
      },

      navigationBar: {
        visible: "leanback",
        backgroundColor: "#000000",
        barStyle: "light-content",
      },

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

    /* ===================== iOS ===================== */
    ios: {
      supportsTablet: true,
      bundleIdentifier: appId,

      infoPlist: {
        NSCameraUsageDescription:
          "RHAZN utilise la caméra pour permettre à l’utilisateur de prendre une photo de profil réelle.",

        NSMicrophoneUsageDescription:
          "RHAZN utilise le micro pour les contenus audio et vidéo.",

        NSPhotoLibraryUsageDescription:
          "RHAZN accède à votre galerie pour choisir votre photo de profil.",

        NSPhotoLibraryAddUsageDescription:
          "RHAZN peut enregistrer des images dans votre galerie si nécessaire.",
      },
    },

    /* ===================== WEB ===================== */
    web: {
      favicon: "./assets/images/grape.png",
    },

    /* ===================== PLUGINS ===================== */
    plugins: [
      "expo-router",
      "expo-video",
      "expo-web-browser",
      "expo-local-authentication",
      "expo-secure-store",

      /* 🔥 CAMERA + GALERIE (CRITIQUE) */
      [
        "expo-image-picker",
        {
          photosPermission:
            "RHAZN doit accéder à votre galerie pour choisir votre photo de profil.",
          cameraPermission:
            "RHAZN doit accéder à votre caméra pour prendre votre photo réelle.",
        },
      ],

      [
        "expo-splash-screen",
        {
          image: "./assets/images/rhazn-logo.png",
          resizeMode: "contain",
          backgroundColor: "#000000",
        },
      ],

      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            minSdkVersion: 24,
            buildToolsVersion: "36.0.0",
          },
          ios: {
            useFrameworks: "static",
          },
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

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