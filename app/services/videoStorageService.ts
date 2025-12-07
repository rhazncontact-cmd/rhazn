import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { supabase } from "../../lib/supabase"; // 👈 ton client Supabase

export async function uploadFluxVideo(uri, onProgress, title, code) {
  try {
    const fileName = `flux_${Date.now()}.mp4`;
    const filePath = `flux-videos/${fileName}`;

    // 1️⃣ Lire la vidéo en base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    // 2️⃣ Convertir base64 → buffer
    const videoData = decode(base64);

    // 3️⃣ Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from("videos") // 👈 TON BUCKET
      .upload(filePath, videoData, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (error) {
      console.log("🔥 Upload storage error:", error);
      throw error;
    }

    // 4️⃣ Récupérer l’URL publique
    const { data: publicUrl } = supabase.storage
      .from("videos")
      .getPublicUrl(filePath);

    // 5️⃣ Enregistrer dans la table Supabase "fluxVideos"
    const { error: dbError } = await supabase
      .from("fluxVideos")
      .insert({
        title,
        code,
        video_url: publicUrl.publicUrl,
        status: "pending",
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.log("🔥 Insert DB error:", dbError);
      throw dbError;
    }

    return publicUrl.publicUrl;
  } catch (err) {
    console.log("🔥 Video Upload Error:", err);
    throw err;
  }
}
