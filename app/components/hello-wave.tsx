// components/haptic-tab.tsx
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

export function HapticTab({ onPress, children, style }) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} style={style}>
      {children}
    </Pressable>
  );
}
