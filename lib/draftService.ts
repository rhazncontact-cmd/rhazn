/**
 * lib/draftService.ts — Version Expo clean (sans FFmpeg)
 *
 * ✅ Compatible Expo / EAS
 * ✅ Plus de ffmpeg-kit-react-native
 * ✅ Génération vidéo déléguée au backend (Railway)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

// ─────────────── TYPES ───────────────
export type DraftTrack = {
  id: string;
  title: string;
  file_url: string;
  duration_sec: number;
};

export type SuspentzDraft = {
  version: number;
  savedAt: string;
  step: "home" | "editor" | "form";
  videoUri: string | null;
  durationSec: number;
  selectedTrack: DraftTrack | null;
  audioSegmentIndex: number;
  audioStartSec: number;
  audioEndSec: number;
  title: string;
  theme: string;
  author: string;
  description: string;
  finalVideoUri: string | null;
  isProcessing: boolean;
};

export type GenerationProgress = {
  percent: number;
  message: string;
};

// ─────────────── CONSTANTES ───────────────
const DRAFT_KEY = "rhazn_suspentz_draft_v1";
const DRAFT_VERSION = 1;
const FINAL_DIR = `${FileSystem.cacheDirectory}rhazn_finals/`;

// ─────────────── DRAFT VIDE ───────────────
export const EMPTY_DRAFT: SuspentzDraft = {
  version: DRAFT_VERSION,
  savedAt: new Date().toISOString(),
  step: "home",
  videoUri: null,
  durationSec: 0,
  selectedTrack: null,
  audioSegmentIndex: -1,
  audioStartSec: 0,
  audioEndSec: 0,
  title: "",
  theme: "",
  author: "",
  description: "",
  finalVideoUri: null,
  isProcessing: false,
};

// ─────────────── STORAGE ───────────────
export async function saveDraft(
  draft: Omit<SuspentzDraft, "savedAt" | "version" | "isProcessing">
): Promise<void> {
  const toSave: SuspentzDraft = {
    ...draft,
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    isProcessing: false,
  };
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
}

export async function loadDraft(): Promise<SuspentzDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed: SuspentzDraft = JSON.parse(raw);

    if (parsed.version !== DRAFT_VERSION) {
      await clearDraft();
      return null;
    }

    if (parsed.finalVideoUri) {
      const info = await FileSystem.getInfoAsync(parsed.finalVideoUri);
      if (!info.exists) return { ...parsed, finalVideoUri: null };
    }

    if (parsed.videoUri) {
      const info = await FileSystem.getInfoAsync(parsed.videoUri);
      if (!info.exists) {
        await clearDraft();
        return null;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

export async function hasDraft(): Promise<boolean> {
  const draft = await loadDraft();
  return draft !== null && draft.videoUri !== null;
}

// ─────────────── DOSSIER LOCAL ───────────────
async function ensureFinalDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(FINAL_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(FINAL_DIR, { intermediates: true });
  }
}

// ─────────────── GÉNÉRATION (BACKEND) ───────────────
/**
 * ⚠️ IMPORTANT :
 * Ici on NE FAIT PLUS de FFmpeg local
 * → on envoie tout au backend Railway
 */
export async function generateFinalVideo(params: {
  videoUri: string;
  audioUri: string;
  audioStartSec: number;
  durationSec: number;
  onProgress?: (p: GenerationProgress) => void;
}): Promise<string | null> {
  const { videoUri, audioUri, audioStartSec, durationSec, onProgress } = params;

  try {
    await ensureFinalDir();

    onProgress?.({ percent: 20, message: "Upload..." });

    const formData = new FormData();

    formData.append("video", {
      uri: videoUri,
      name: "video.mp4",
      type: "video/mp4",
    } as any);

    formData.append("audioUrl", audioUri);
    formData.append("audioStart", String(audioStartSec));
    formData.append("duration", String(durationSec));

    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/create-video`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) {
      console.error("Backend error");
      return null;
    }

    onProgress?.({ percent: 70, message: "Téléchargement..." });

    const blob = await res.blob();
    const output = `${FINAL_DIR}final_${Date.now()}.mp4`;

    const reader = new FileReader();

    return await new Promise((resolve) => {
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(",")[1];

        await FileSystem.writeAsStringAsync(output, base64data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        onProgress?.({ percent: 100, message: "Terminé ✓" });

        resolve(output);
      };

      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("GENERATION ERROR:", e);
    return null;
  }
}

// ─────────────── ANNULATION (NOOP) ───────────────
export async function cancelGeneration(): Promise<void> {
  // plus de FFmpeg → rien à annuler
}

// ─────────────── NETTOYAGE ───────────────
export async function cleanOldFinals(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(FINAL_DIR);
    if (!info.exists) return;

    const files = await FileSystem.readDirectoryAsync(FINAL_DIR);
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;

    for (const file of files) {
      const path = `${FINAL_DIR}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(path);
      const modTs = (fileInfo as any).modificationTime ?? 0;

      if (modTs * 1000 < sevenDaysAgo) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    }
  } catch {}
}
