import { Feather, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000",
          borderTopColor: "#222",
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#FFD700",
        tabBarInactiveTintColor: "#777",
      }}
    >

      {/* ===========================
          🔎 Onglet EXPLORER
         =========================== */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "",
          tabBarIcon: ({ color, focused, size }) => (
            <>
              <Feather
                name="search"
                size={size + (focused ? 4 : 0)}
                color={focused ? "#FFD700" : "#777"}
              />
              {focused && (
                <Text style={{ color: "#FFD700", fontSize: 11, marginTop: 2 }}>
                  Explorer
                </Text>
              )}
            </>
          ),
        }}
      />

      {/* ===========================
          🏠 Onglet DASHBOARD
         =========================== */}
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarIcon: ({ color, focused, size }) => (
            <>
              <Ionicons
                name="grid-outline"
                size={size + (focused ? 4 : 0)}
                color={focused ? "#FFD700" : "#777"}
              />
              {focused && (
                <Text style={{ color: "#FFD700", fontSize: 11, marginTop: 2 }}>
                  Dashboard
                </Text>
              )}
            </>
          ),
        }}
      />

    </Tabs>
  );
}
