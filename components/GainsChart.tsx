import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

type Point = { date: string; tan: number };

export default function GainsChart({ data }: { data: Point[] }) {
  if (!data?.length) {
    return <Text style={styles.empty}>Aucune donnée</Text>;
  }

  const values = data.map(d => d.tan);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const W = 320;
  const H = 120;
  const pad = 16;

  const step = (W - pad * 2) / Math.max(data.length - 1, 1);

  const y = (v: number) =>
    H - pad - ((v - min) / range) * (H - pad * 2);

  const path = data
    .map((p, i) => {
      const X = pad + i * step;
      const Y = y(p.tan);
      return `${i === 0 ? "M" : "L"} ${X} ${Y}`;
    })
    .join(" ");

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Évolution des gains (TAN)</Text>
      <Svg width={W} height={H}>
        <Path d={path} stroke="#007AFF" strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F6F7F9",
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    fontWeight: "900",
    marginBottom: 8,
  },
  empty: {
    color: "#6B7280",
    marginTop: 10,
  },
});
