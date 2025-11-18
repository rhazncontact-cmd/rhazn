import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";

export default function LayoutWithFooter({ children }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {children}
      </View>

      {/* footer vide pour l'instant */}
      <View style={styles.footer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
  },
  footer: {
    width: "100%",
  },
});
