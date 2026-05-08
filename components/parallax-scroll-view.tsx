import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export function ParallaxScrollView({ children }) {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      <View style={{ width: '100%' }}>
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 80,
    backgroundColor: "#000"
  }
});
