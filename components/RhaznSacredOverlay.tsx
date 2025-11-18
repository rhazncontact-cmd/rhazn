import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function RhaznSacredOverlay({
  onlineCount,
  qob,
  timer,
  totalTime,
  creator,
  onPausePress,
  onInvitePress,
  day,
}) {
  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">

      {/* Logo + Jours */}
      <View style={styles.topCenter}>
        <Image
          source={require("../../assets/images/logo-rhazn.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.dayText}>Jours : {day} / 30</Text>
      </View>

      {/* Left section */}
      <View style={styles.leftColumn}>
        <Text style={styles.online}>Online {onlineCount}</Text>
        <Text style={styles.timer}>{timer}s / {totalTime}s</Text>
        <Text style={styles.creator}>@{creator}</Text>
      </View>

      {/* Right section */}
      <View style={styles.rightColumn}>
        <Text style={styles.qob}>QOB {qob}</Text>

        <TouchableOpacity onPress={onPausePress}>
          <Text style={styles.action}>Pause</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onInvitePress}>
          <Text style={styles.action}>Inviter</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
  },

  topCenter: {
    position: "absolute",
    top: 35,
    width: "100%",
    alignItems: "center",
  },
  logo: {
    width: 38,
    height: 38,
    tintColor: "#D4AF37",
    opacity: 0.9,
  },
  dayText: {
    color: "#D4AF37",
    fontSize: 13,
    marginTop: 4,
  },

  leftColumn: {
    position: "absolute",
    left: 20,
    gap: 14,
  },

  rightColumn: {
    position: "absolute",
    right: 20,
    gap: 14,
    alignItems: "flex-end",
  },

  online: { color: "#D4AF37", fontSize: 15, fontWeight: "600" },
  qob: { color: "#D4AF37", fontSize: 15, fontWeight: "700" },
  timer: { color: "#fff", fontSize: 14 },
  creator: { color: "#fff", fontSize: 14, marginTop: 6 },

  action: {
    color: "#D4AF37",
    fontSize: 15,
    fontWeight: "600",
  },
});
