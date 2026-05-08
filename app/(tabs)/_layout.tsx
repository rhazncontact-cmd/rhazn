import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, Text } from "react-native";

const GOLD = "#FFD700";
const GREY = "#777";

export default function TabsLayout() {

  const TabButton = ({ children, onPress }: any) => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      {children}
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

      tabBarStyle: {
  backgroundColor: "#000",
  borderTopColor: "#222",
  borderTopWidth: 1,

  height: 90,
  paddingBottom: 20,
  paddingTop: 6,

  marginBottom: 10,   // 🔥 fait descendre la barre
},

        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: GREY,
      }}
    >

      {/* ===========================
          🔎 EXPLORER
      =========================== */}

      <Tabs.Screen
        name="explore"
        options={{
          title: "",

          tabBarButton: (props) => <TabButton {...props} />,

          tabBarIcon: ({ focused, size }) => (
            <>
              <Feather
                name="search"
                size={focused ? size + 6 : size}
                color={focused ? GOLD : GREY}
              />

              <Text
                style={{
                  color: focused ? GOLD : GREY,
                  fontSize: 11,
                  marginTop: 2,
                  fontWeight: focused ? "700" : "500",
                }}
              >
                Explorer
              </Text>
            </>
          ),
        }}
      />

      {/* ===========================
          🏠 DASHBOARD
      =========================== */}

      <Tabs.Screen
        name="index"
        options={{
          title: "",

          tabBarButton: (props) => <TabButton {...props} />,

          tabBarIcon: ({ focused, size }) => (
            <>
              <Ionicons
                name="grid-outline"
                size={focused ? size + 6 : size}
                color={focused ? GOLD : GREY}
              />

              <Text
                style={{
                  color: focused ? GOLD : GREY,
                  fontSize: 11,
                  marginTop: 2,
                  fontWeight: focused ? "700" : "500",
                }}
              >
                Dashboard
              </Text>
            </>
          ),
        }}
      />

    </Tabs>
  );
}