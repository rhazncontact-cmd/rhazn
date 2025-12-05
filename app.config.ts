import "dotenv/config";
import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const ENV = process.env.EXPO_PUBLIC_ENV || "development";

  const isProd = ENV === "production";
  const isPreview = ENV === "preview";

  const androidPackage = isProd
    ? "com.rhzn.app"
    : isPreview
    ? "com.rhzn.preview"
    : "com.rhzn.dev";

  return {
    ...config,

    name: "RHAZN",
    slug: "rhazn-app",
    version: "1.0.0",
    orientation: "portrait",

    scheme: "rhazn",

    newArchEnabled: true,
    userInterfaceStyle: "automatic",

    icon: "./assets/images/rhazn-logo.png",
    assetBundlePatterns: ["**/*"],

    /** ✅ ANDROID — COMPILATION 36 OBLIGATOIRE */
    android: {
      package: androidPackage,

      adaptiveIcon: {
        foregroundImage: "./assets/images/rhazn-logo.png",
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

    /** ✅ iOS */
    ios: {
      supportsTablet: true,
      bundleIdentifier: androidPackage,
    },

    web: {
      favicon: "./assets/images/rhazn-logo.png",
    },

    /** ✅ PLUGINS */
    plugins: [
      "expo-router",
      "expo-video",
      "expo-web-browser",
      "expo-local-authentication",
      "expo-secure-store",
      "expo-barcode-scanner",

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
