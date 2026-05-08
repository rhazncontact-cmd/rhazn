// app/services/videoStorageService.ts

import * as FileSystem from "expo-file-system";
import { supabase } from "../../lib/supabase";

/**
 * 🎥 Upload sécurisé d’une vidéo vers Supabase Storage (bucket: store)
 */
export async function uploadFluxVideo(
  localUri: string,
  destinationPath: string,
  mimeType: string = "video/mp4"
): Promise<string> {
  if (!localUri) {
    throw new Error("No local video URI provided");
  }

  // Lire le fichier en base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Conversion en ArrayBuffer
  const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from("store")
    .upload(destinationPath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("Video upload error:", error);
    throw error;
  }

  // On retourne le path stocké (PAS une URL)
  return destinationPath;
}
