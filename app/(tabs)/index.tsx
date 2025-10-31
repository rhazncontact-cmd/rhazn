import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export default function HomeScreen() {
  const router = useRouter();
  const scale = useSharedValue(1);

  // Pulsation douce du logo
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    const timer = setTimeout(() => {
      runOnJS(router.push)('/flux');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const animatedLogo = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Logo animé */}
      <Animated.View style={[styles.logoContainer, animatedLogo]} entering={FadeInUp.duration(1000).delay(200)}>
        <Image
          source={require('@/assets/images/rhazn-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Titre principal */}
      <Animated.View entering={FadeInUp.duration(1000).delay(600)}>
        <Text style={styles.title}>Bienvenue sur RHAZN</Text>
      </Animated.View>

      {/* Slogan 1 */}
      <Animated.View entering={FadeInUp.duration(1000).delay(1000)}>
        <Text style={styles.subtitle}>Le réseau où ton temps devient une récompense...</Text>
      </Animated.View>

      {/* Slogan 2 (doré) */}
      <Animated.View entering={FadeInUp.duration(1000).delay(1400)}>
        <Text style={styles.signature}>Ensemble, bâtissons une économie du mérite !</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: 6,
  },
  signature: {
    fontSize: 16,
    color: '#D4AF37', // 💛 Or doux et subtil
    fontStyle: 'italic',
    opacity: 0.9,
    marginTop: 5,
    textAlign: 'center',
  },
});
