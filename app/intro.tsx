import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

// ✅ Simulation ACSET (à connecter Firebase plus tard)
async function getUserACSET() {
  return 3; // ➜ mettre 0 pour tester
}

export default function IntroScreen() {
  const router = useRouter();
  const [hasACSET, setHasACSET] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const acset = await getUserACSET();
      setHasACSET(acset > 0);

      if (acset === 0) {
        setTimeout(() => {
          router.replace('/no-acset');
        }, 2500);
      } else {
        setTimeout(() => {
          router.replace('/dashboard'); // ✅ Aller au dashboard
        }, 4000);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      {hasACSET === null ? (
        <Text style={styles.loading}>Chargement...</Text>
      ) : hasACSET ? (
        <>
          <Animated.Image
            entering={FadeInDown.duration(1200).delay(200)}
            exiting={FadeOut.duration(800)}
            source={require('../assets/images/grape.png')}
            style={styles.icon}
            resizeMode="contain"
          />

          <Animated.View entering={FadeInDown.duration(1200).delay(800)}>
            <Text style={styles.title}>Bravo ! Vous êtes maintenant dans RHAZN — l’Espace d’Exploration.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(1200).delay(1600)}>
            <Text style={styles.signature}>Ici, chaque seconde a un sens,chaque regard crée de la valeur...</Text>
          </Animated.View>
        </>
      ) : (
        <View>
          <Text style={styles.errorText}>⚠️ Aucun ACSET détecté</Text>
          <Text style={styles.subText}>Veuillez contacter un agent RHAZN</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  icon: { width: 120, height: 120, marginBottom: 30 },
  title: { fontSize: 22, color: '#D3D3D3', fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  signature: { fontSize: 18, color: '#FFD700', textAlign: 'center', fontWeight: '600', marginTop: 10 },
  loading: { color: '#fff', fontSize: 18 },
  errorText: { color: '#ff5555', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subText: { color: '#FFD700', fontSize: 16, textAlign: 'center', marginTop: 8 },
});
