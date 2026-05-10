// server.js — RHAZN Video Server ✅ PRODUCTION READY
const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

app.use(cors());
app.use(express.json());

// ✅ dossiers
const UPLOAD_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "outputs");

// ✅ créer dossiers si pas existants
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// ✅ config multer
const upload = multer({ dest: UPLOAD_DIR });

// ✅ route test
app.get("/", (req, res) => {
  res.send("✅ RHAZN server running");
});

// ✅ route principale — AVEC LOGS DÉTAILLÉS
app.post("/create-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No video uploaded");
    }

    const videoPath = req.file.path;
    const audioUrl = req.body.audioUrl;
    
    if (!audioUrl) {
      fs.unlink(videoPath, () => {});
      return res.status(400).send("audioUrl parameter required");
    }

    const audioPath = "/tmp/audio_" + Date.now() + ".mp3";

    // ✅ Télécharger l'audio depuis l'URL
    try {
      console.log("📥 Downloading audio from:", audioUrl);
      console.log("📥 Attempting fetch with timeout of 30 seconds...");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(audioUrl, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log("📦 Response status:", response.status);
      console.log("📦 Response headers:", Object.fromEntries(response.headers));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const buffer = await response.buffer();
      console.log("📦 Downloaded buffer size:", buffer.length, "bytes");
      
      fs.writeFileSync(audioPath, buffer);
      console.log("✅ Audio downloaded successfully:", audioPath);
      
    } catch (e) {
      console.error("❌ Error downloading audio:", e.message);
      console.error("   Error code:", e.code);
      console.error("   Error type:", e.constructor.name);
      console.error("   Full error:", JSON.stringify(e, null, 2));
      
      fs.unlink(videoPath, () => {});
      return res.status(400).send("Failed to download audio: " + e.message);
    }

    // ✅ Vérifier que l'audio existe
    if (!fs.existsSync(audioPath)) {
      console.error("❌ Audio file does not exist after write");
      fs.unlink(videoPath, () => {});
      return res.status(400).send("Audio file failed to save");
    }

    const outputFile = `output-${Date.now()}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFile);

    // ✅ FFmpeg command
    const cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "${outputPath}"`;

    console.log("🎬 Running FFmpeg...");
    console.log("🎬 Command:", cmd);
    
    exec(cmd, (err, stdout, stderr) => {
      // ✅ Nettoyer les fichiers temporaires
      fs.unlink(videoPath, () => {});
      fs.unlink(audioPath, () => {});

      if (err) {
        console.error("❌ FFmpeg error:", err.message);
        console.error("❌ FFmpeg stderr:", stderr);
        return res.status(500).send("FFmpeg error: " + err.message);
      }

      console.log("✅ Video created successfully:", outputFile);
      console.log("✅ Output path:", outputPath);
      console.log("✅ Public URL:", `/outputs/${outputFile}`);
      
      res.json({
        success: true,
        url: `/outputs/${outputFile}`
      });
    });

  } catch (e) {
    console.error("❌ Server error:", e.message);
    console.error("❌ Full error:", JSON.stringify(e, null, 2));
    res.status(500).send("Server error: " + e.message);
  }
});

// ✅ Servir fichiers statiques
app.use("/outputs", express.static(OUTPUT_DIR));

// ✅ PORT RAILWAY
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});