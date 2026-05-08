import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const GOLD = "#D4AF37";

export default function RhaznTabBar({ state, descriptors, navigation }: BottomTabBarProps) {

  return (

    <View style={styles.container}>

      {state.routes.map((route, index) => {

        const isFocused = state.index === index;

        const iconMap:any = {
          suspentz:"home",
          notifications:"notifications",
          publish:"add-circle",
          espace:"grid",
          settings:"settings"
        };

        const icon = iconMap[route.name];

        const onPress = () => {

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

          navigation.navigate(route.name);

        };

        return (

          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
          >

            <Ionicons
              name={icon}
              size={24}
              color={isFocused ? GOLD : "rgba(255,255,255,0.6)"}
            />

            <Text style={[
              styles.label,
              {color:isFocused ? GOLD : "rgba(255,255,255,0.6)"}
            ]}>
              {descriptors[route.key].options.title}
            </Text>

          </Pressable>

        );

      })}

    </View>

  );

}

const styles = StyleSheet.create({

  container:{
    flexDirection:"row",
    height:78,
    backgroundColor:"#000",
    borderTopWidth:0.5,
    borderTopColor:"rgba(255,255,255,0.15)",
  },

  tab:{
    flex:1,
    alignItems:"center",
    justifyContent:"center",
  },

  label:{
    fontSize:10,
    marginTop:2,
    fontWeight:"700"
  }

});