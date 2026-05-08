// lib/notifSound.ts
// ✅ Service son global notifications — Apple-like
// ✅ playsInSilentModeIOS: true — joue même en mode silencieux

import { Audio } from "expo-av";

class NotifSoundService {
  private _sound: Audio.Sound | null = null;
  private _ready  = false;
  private _loading = false;

  async init() {
    if (this._ready || this._loading) return;
    this._loading = true;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:      false,
        playsInSilentModeIOS:    true,
        staysActiveInBackground: false,
        shouldDuckAndroid:       true,
      });

      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/success.mp3"),
        { shouldPlay: false, volume: 1.0 }
      );
      this._sound = sound;
      this._ready  = true;
      console.log("🔔 notifSound — son chargé ✅");
    } catch (e: any) {
      console.log("🔔 notifSound — erreur init:", e?.message);
    } finally {
      this._loading = false;
    }
  }

  async play() {
    console.log("🔔 notifSound.play() appelé — ready:", this._ready);
    try {
      // Re-charger si nécessaire
      if (!this._ready || !this._sound) {
        await this.init();
      }
      if (this._sound) {
        await this._sound.setPositionAsync(0);
        await this._sound.playAsync();
        console.log("🔔 notifSound — SON JOUÉ ✅");
      } else {
        console.log("🔔 notifSound — son null après init");
      }
    } catch (e: any) {
      console.log("🔔 notifSound — erreur play:", e?.message);
    }
  }

  async unload() {
    try {
      if (this._sound) {
        await this._sound.unloadAsync();
        this._sound  = null;
        this._ready  = false;
        console.log("🔔 notifSound — déchargé");
      }
    } catch (_e) {}
  }
}

export const notifSound = new NotifSoundService();