// supabase/functions/watermark-video/index.ts
// ✅ Edge Function — brûle le logo RHAZN dans la vidéo téléchargée
// Déployer : supabase functions deploy watermark-video

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ✅ Logo RHAZN en base64 (petit PNG transparent — à remplacer par le vrai logo)
// Générer avec : base64 -i rhazn-logo.png
const LOGO_B64 = Deno.env.get("RHAZN_LOGO_B64") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { videoUrl, videoId } = await req.json();

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "videoUrl requis" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // ── 1. Télécharger la vidéo source ────────────────────────────
    console.log("📥 Téléchargement vidéo:", videoUrl);
    const videoResp = await fetch(videoUrl);
    if (!videoResp.ok) throw new Error("Impossible de télécharger la vidéo");
    const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
    console.log("✅ Vidéo téléchargée:", videoBytes.length, "bytes");

    // ── 2. Charger FFmpeg WASM ─────────────────────────────────────
    // @ts-ignore
    const { createFFmpeg, fetchFile } = await import("https://esm.sh/@ffmpeg/ffmpeg@0.11.6");
    const ffmpeg = createFFmpeg({
      log: true,
      corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
    });

    await ffmpeg.load();
    console.log("✅ FFmpeg WASM chargé");

    // ── 3. Écrire la vidéo en mémoire ─────────────────────────────
    ffmpeg.FS("writeFile", "input.mp4", videoBytes);

    // ── 4. Décoder le logo base64 ──────────────────────────────────
    if (LOGO_B64) {
      const logoBytes = Uint8Array.from(atob(LOGO_B64), c => c.charCodeAt(0));
      ffmpeg.FS("writeFile", "logo.png", logoBytes);
    }

    // ── 5. Commande FFmpeg ─────────────────────────────────────────
    // Watermark en haut à droite (coin TikTok), semi-transparent
    const ffmpegCmd = LOGO_B64
      ? [
          "-i", "input.mp4",
          "-i", "logo.png",
          "-filter_complex",
          // Logo 160px large, 10px du bord haut-droit, opacité 0.75
          "[1:v]scale=160:-1,colorchannelmixer=aa=0.75[logo];[0:v][logo]overlay=W-w-10:10",
          "-codec:a", "copy",
          "-crf", "23",
          "-preset", "fast",
          "output.mp4",
        ]
      : [
          // Fallback : drawtext si pas de logo PNG
          "-i", "input.mp4",
          "-vf",
          "drawtext=text='RHAZN':fontsize=28:fontcolor=white@0.70:x=w-tw-12:y=12:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf," +
          "drawtext=text='Propriete RHAZN':fontsize=13:fontcolor=gold@0.60:x=w-tw-10:y=46",
          "-codec:a", "copy",
          "-crf", "23",
          "-preset", "fast",
          "output.mp4",
        ];

    console.log("🎬 FFmpeg en cours...");
    await ffmpeg.run(...ffmpegCmd);
    console.log("✅ FFmpeg terminé");

    // ── 6. Lire la vidéo watermarkée ───────────────────────────────
    const outputBytes = ffmpeg.FS("readFile", "output.mp4");
    console.log("✅ Output:", outputBytes.length, "bytes");

    // ── 7. Uploader dans Supabase Storage ─────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const filename = `watermarked/RHAZN_${videoId ?? Date.now()}.mp4`;
    const { data: upload, error: uploadErr } = await supabase.storage
      .from("suspentz-videos")
      .upload(filename, outputBytes, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadErr) throw new Error("Upload échoué: " + uploadErr.message);

    // ── 8. Obtenir l'URL publique ───────────────────────────────────
    const { data: { publicUrl } } = supabase.storage
      .from("suspentz-videos")
      .getPublicUrl(filename);

    console.log("✅ Vidéo watermarkée disponible:", publicUrl);

    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("❌ Erreur watermark:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});