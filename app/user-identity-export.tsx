import * as Sharing from "expo-sharing";
import { useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { RZIdentityCard } from "./components/RZIdentityCard";

export default function IdentityExport({ profile }: { profile: any }) {
  const cardRef = useRef<View>(null);

  const exportImage = async () => {
    if (!cardRef.current) return;

    const uri = await captureRef(cardRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });

    await Sharing.shareAsync(uri, {
      dialogTitle: "Partager mon identité RHAZN",
    });
  };

  return (
    <View style={{ alignItems: "center" }}>
      <View ref={cardRef} collapsable={false}>
        <RZIdentityCard profile={profile} />
      </View>

      <TouchableOpacity
        onPress={exportImage}
        style={{
          marginTop: 18,
          backgroundColor: "#000",
          paddingVertical: 14,
          paddingHorizontal: 28,
          borderRadius: 14,
        }}
      >
        <Text style={{ color: "#FFF", fontWeight: "800" }}>
          Exporter en image
        </Text>
      </TouchableOpacity>
    </View>
  );
}
