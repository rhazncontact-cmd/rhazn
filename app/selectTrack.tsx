import React, { useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// 🔸 Exemple de données locales (tu peux remplacer par ton vrai fichier JSON)
const tracks = [
  { id: "1", title: "Mélodie du Matin", artist: "RHAZN" },
  { id: "2", title: "Le Souffle du Talent", artist: "RHAZN" },
  { id: "3", title: "Cycle du Mérite", artist: "RHAZN" },
];

export default function SelectTrack() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    console.log("🎵 Track sélectionné :", id);
    // Ici, tu pourras plus tard lancer la lecture audio avec expo-audio
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={[
        styles.item,
        item.id === selectedId && styles.selectedItem,
      ]}
      onPress={() => handleSelect(item.id)}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.artist}>{item.artist}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎶 Sélectionne ta piste</Text>
      <FlatList
        data={tracks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={selectedId}
      />
      {selectedId && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ✅ Piste sélectionnée : {tracks.find(t => t.id === selectedId)?.title}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  header: {
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  item: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
  },
  selectedItem: {
    borderColor: "#FFD700",
    borderWidth: 2,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
  },
  artist: {
    color: "#aaa",
    fontSize: 14,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  footerText: {
    color: "#FFD700",
    fontSize: 16,
  },
});
