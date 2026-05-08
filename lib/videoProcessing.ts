/**
 * lib/videoProcessing.ts
 * ─────────────────────────────────────────────────────────────
 * Traitement vidéo professionnel — modèle TikTok
 *
 * INSTALL :
 *   npx expo install ffmpeg-kit-react-native
 *   (nécessite un development build — pas Expo Go)
 *
 * DEUX FONCTIONS :
 *  1. compressVideo   — H.264 CRF28, 720p max, sans audio (micro supprimé)
 *  2. mergeAudioVideo — fusionne la vidéo compressée + audio studio numérique
 * ─────────────────────────────────────────────────────────────
 */

import * as FileSystem from "expo-file-system/legacy";

// ── Lazy import FFmpegKit (évite le crash si pas installé) ──
let FFmpegKit: any = null;
let ReturnCode: any = null;

const loadFFmpeg = async () => {
  if (FFmpegKit) return true;
  try {
    const mod = await import("ffmpeg-kit-react-native");
    FFmpegKit  = mod.FFmpegKit;
    ReturnCode = mod.ReturnCode;
    return true;
  } catch {
    console.warn("⚠️ ffmpeg-kit-react-native non installé. Run: npx expo install ffmpeg-kit-react-native");
    return false;
  }
};

const runCmd = async (cmd: string): Promise<boolean> => {
  const ok = await loadFFmpeg();
  if (!ok) return false;
  try {
    const session = await FFmpegKit.execute(cmd);
    const rc      = await session.getReturnCode();
    const success = ReturnCode.isSuccess(rc);
    if (!success) {
      const logs = await session.getAllLogsAsString().catch(() => "");
      console.warn("FFmpeg failed:", logs?.slice(-500));
    }
    return success;
  } catch (e) {
    console.warn("FFmpeg error:", e);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// 1. COMPRESSION VIDÉO — H.264 CRF28, 720p max, PAS d'audio
//    On supprime délibérément le micro (-an) pour ne garder
//    que l'image propre, sans son de "Dictaphone".
// ─────────────────────────────────────────────────────────────
export const compressVideo = async (inputUri: string): Promise<string> => {
  const output = `${FileSystem.cacheDirectory}rz_compressed_${Date.now()}.mp4`;

  // scale : max 720p en gardant le ratio
  // crf 28 : qualité/taille TikTok-like (~1–3 MB/min)
  // -an : SUPPRIME la piste micro (son Dictaphone éliminé)
  const cmd = [
    `-y`,
    `-i "${inputUri}"`,
    `-vf "scale='if(gt(iw,1280),1280,iw)':'-2':flags=lanczos"`,
    `-c:v libx264`,
    `-crf 28`,
    `-preset fast`,
    `-profile:v baseline`,
    `-level 3.1`,
    `-movflags +faststart`,
    `-an`,              // ← clé : supprime audio micro
    `"${output}"`,
  ].join(" ");

  const success = await runCmd(cmd);
  if (!success) {
    console.warn("Compression échouée — utilisation vidéo originale");
    return inputUri;
  }

  // Vérifier que le fichier existe
  try {
    const info = await FileSystem.getInfoAsync(output);
    if (!info.exists || info.size === 0) return inputUri;
  } catch { return inputUri; }

  return output;
};

// ─────────────────────────────────────────────────────────────
// 2. FUSION AUDIO STUDIO — qualité numérique, zéro dégradation
//    - Vidéo : piste image seulement (micro déjà supprimé)
//    - Audio : fichier studio téléchargé localement, découpé
//              depuis audioStartSec sur la durée de la vidéo
//    - Résultat : MP4 final avec son studio parfait
// ─────────────────────────────────────────────────────────────
export const mergeAudioVideo = async (
  videoUri: string,   // vidéo compressée sans audio
  audioUrl: string,   // URL HTTPS du fichier studio RHAZN
  audioStartSec: number,
): Promise<string> => {

  const ts         = Date.now();
  const audioLocal = `${FileSystem.cacheDirectory}rz_audio_${ts}.m4a`;
  const output     = `${FileSystem.cacheDirectory}rz_final_${ts}.mp4`;

  // ── Étape 1 : téléchargement local de la piste studio ──
  try {
    await FileSystem.downloadAsync(audioUrl, audioLocal);
  } catch (e) {
    console.warn("Téléchargement audio échoué:", e);
    return videoUri; // fallback : vidéo sans son propre
  }

  // Vérifier le fichier audio
  try {
    const info = await FileSystem.getInfoAsync(audioLocal);
    if (!info.exists || info.size === 0) {
      console.warn("Fichier audio vide");
      return videoUri;
    }
  } catch { return videoUri; }

  // ── Étape 2 : fusion FFmpeg ──
  // -map 0:v  → image de la vidéo compressée
  // -map 1:a  → audio studio (depuis audioStartSec)
  // -ss sur l'input audio = seek précis avant decode (rapide)
  // -c:v copy → copie le stream vidéo sans réencoder (= rapide + sans perte)
  // -c:a aac -b:a 192k → encode audio studio en AAC 192kbps (qualité CD)
  // -shortest → tronque à la durée la plus courte (vidéo généralement)
  const cmd = [
    `-y`,
    `-i "${videoUri}"`,
    `-ss ${audioStartSec.toFixed(3)}`,
    `-i "${audioLocal}"`,
    `-map 0:v`,
    `-map 1:a`,
    `-c:v copy`,
    `-c:a aac`,
    `-b:a 192k`,
    `-shortest`,
    `-movflags +faststart`,
    `"${output}"`,
  ].join(" ");

  const success = await runCmd(cmd);

  // Nettoyage audio temp
  FileSystem.deleteAsync(audioLocal, { idempotent: true }).catch(() => {});

  if (!success) {
    console.warn("Fusion audio échouée — vidéo sans musique");
    return videoUri;
  }

  // Vérifier le fichier final
  try {
    const info = await FileSystem.getInfoAsync(output);
    if (!info.exists || info.size === 0) return videoUri;
  } catch { return videoUri; }

  // Nettoyage vidéo compressée intermédiaire (si différente de l'originale)
  if (videoUri !== output && videoUri.includes("rz_compressed_")) {
    FileSystem.deleteAsync(videoUri, { idempotent: true }).catch(() => {});
  }

  return output;
};

// ─────────────────────────────────────────────────────────────
// 3. UTILITAIRE — nettoyer les fichiers temporaires RHAZN
// ─────────────────────────────────────────────────────────────
export const cleanTempFiles = async () => {
  try {
    const dir = FileSystem.cacheDirectory ?? "";
    const { exists, isDirectory } = await FileSystem.getInfoAsync(dir);
    if (!exists || !isDirectory) return;
    const files = await FileSystem.readDirectoryAsync(dir);
    const rzFiles = files.filter(f => f.startsWith("rz_"));
    await Promise.all(
      rzFiles.map(f => FileSystem.deleteAsync(`${dir}${f}`, { idempotent: true }).catch(() => {}))
    );
  } catch {}
};