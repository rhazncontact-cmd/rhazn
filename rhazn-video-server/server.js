// server.js — RHAZN Video Server ✅ PRODUCTION READY

const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

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

// ✅ route principale
app.post("/create-video", upload.single("video"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No video uploaded");
    }

    const videoPath = req.file.path;
    const audioPath = path.join(__dirname, "audio.mp3");

    if (!fs.existsSync(audioPath)) {
      return res.status(400).send("audio.mp3 not found");
    }

    const outputFile = `output-${Date.now()}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFile);

    const cmd = `
      ffmpeg -y -i "${videoPath}" -i "${audioPath}"
      -map 0:v:0 -map 1:a:0
      -c:v copy -c:a aac -shortest
      "${outputPath}"
    `;

    exec(cmd, (err) => {
      // supprimer fichier temporaire
      fs.unlink(videoPath, () => {});

      if (err) {
        console.error("FFmpeg error:", err);
        return res.status(500).send("ffmpeg error");
      }

      res.json({
        success: true,
        url: `/outputs/${outputFile}` // ✅ FIX PRODUCTION
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).send("server error");
  }
});

// ✅ servir fichiers
app.use("/outputs", express.static(OUTPUT_DIR));

// ✅ PORT RAILWAY (IMPORTANT)
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});
