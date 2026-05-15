import "dotenv/config";
import { ExpoConfig } from "expo/config";

const APP_ID = "com.rhzn.dev";
const APP_VERSION = "1.3.6"; // Version mise à jour

export default (): ExpoConfig => {
  const ENV = process.env.EXPO_PUBLIC_ENV || "production";

  return {
    name: "RHAZN",
    slug: "rhazn-app",
    version: APP_VERSION,
    orientation: "portrait",
    scheme: "rhazn",
    userInterfaceStyle: "dark",
    icon: "./assets/images/rz-logo.png",
    splash: {
      image: "./assets/images/rhazn-logo.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    android: {
      package: APP_ID,
      // ✅ versionCode retiré (géré automatiquement par Expo)
      adaptiveIcon: {
        foregroundImage: "./assets/images/rz-logo.png",
        backgroundColor: "#000000",
      },
      permissions: [
        "CAMERA",
        "RECORD_AUDIO",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO",
        // ✅ RETIRÉ: MANAGE_EXTERNAL_STORAGE (rejets Google Play)
        // ✅ RETIRÉ: READ_EXTERNAL_STORAGE (remplacé par READ_MEDIA_*)
        // ✅ RETIRÉ: WRITE_EXTERNAL_STORAGE (utiliser MediaStore API)
      ],
    },
    ios: {
      bundleIdentifier: APP_ID,
      // ✅ buildNumber retiré (géré automatiquement par Expo)
      supportsTablet: false,
      requireFullScreen: true,
      deploymentTarget: "15.1",
      infoPlist: {
        NSCameraUsageDescription:
          "RHAZN utilise la caméra pour filmer vos contenus.",
        NSMicrophoneUsageDescription:
          "RHAZN utilise le micro pour enregistrer l'audio.",
        NSPhotoLibraryUsageDescription:
          "RHAZN accède à votre galerie pour sélectionner des vidéos.",
        NSPhotoLibraryAddUsageDescription:
          "RHAZN peut sauvegarder des musiques dans votre galerie.",
        NSAppleMusicUsageDescription:
          "RHAZN accède aux fichiers audio du téléphone.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    plugins: [
      "expo-router",
      "expo-av",
      [
        "expo-media-library",
        {
          photosPermission: "Autoriser RHAZN à accéder aux médias.",
          savePhotosPermission: "Autoriser RHAZN à sauvegarder des musiques.",
          isAccessMediaLocationEnabled: true,
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "RHAZN accède à votre galerie.",
          cameraPermission: "RHAZN utilise votre caméra.",
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            minSdkVersion: 24,
          },
          ios: {
            deploymentTarget: "15.1",
          },
        },
      ],
    ],
    extra: {
      env: ENV,
      appVersion: APP_VERSION,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: "43ced0cc-a4aa-41e3-8784-0d5f5f1682e0",
      },
    },
    // ✅ Changé de "appVersion" à "nativeVersion" (conforme Expo)
    rruntimeVersion: {
  policy: "appVersion",  // ✅ CORRECT
},
    updates: {
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
  };
};