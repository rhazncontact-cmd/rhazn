// server.js — RHAZN Video Server v6.0 🚀 HARD AUDIO REPLACEMENT

require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// ✅ CONFIG
app.use(cors());
app.use(express.json());
process.stdin.resume();

// ✅ DOSSIERS
const UPLOAD_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "outputs");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// ✅ MULTER
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 200 * 1024 * 1024 }
});

// ✅ HEALTH
app.get("/", (req, res) => {
  res.send("✅ RHAZN VIDEO SERVER RUNNING");
});

// ✅ RENDER
app.post("/render", upload.fields([
  { name: "video", maxCount: 1 },
  { name: "audio", maxCount: 1 }
]), (req, res) => {
  try {
    console.log("FILES:", req.files);

    if (!req.files?.video || !req.files?.audio) {
      return res.status(400).send("Video + audio requis");
    }

    const videoFile = req.files.video[0].path;
    const audioFile = req.files.audio[0].path;

    const outputFile = path.join(
      OUTPUT_DIR,
      `final_${Date.now()}.mp4`
    );

    console.log("📥 VIDEO:", videoFile);
    console.log("🎵 AUDIO:", audioFile);
    console.log("📤 OUTPUT:", outputFile);

    ffmpeg()
      .input(videoFile)
      .input(audioFile)

      // ✅ 💣 SUPPRESSION TOTALE AUDIO ORIGINAL + INJECTION NOUVEL AUDIO
      .outputOptions([
        "-map 0:v:0",
        "-map -0:a",
        "-map 1:a:0",
        "-c:v copy",
        "-c:a aac",
        "-b:a 192k",
        "-shortest",
        "-movflags +faststart"
      ])

      .on("start", (cmd) => {
        console.log("\n⚙️ FFMPEG CMD:\n", cmd, "\n");
      })

      .on("progress", (p) => {
        if (p.percent) {
          console.log(`⏳ ${p.percent.toFixed(2)}%`);
        }
      })

      .on("error", (err) => {
        console.error("❌ FFMPEG ERROR:", err.message);
        cleanup(videoFile, audioFile, outputFile);
        return res.status(500).send("Erreur FFmpeg");
      })

      .on("end", () => {
        console.log("✅ VIDEO READY");

        res.download(outputFile, "final_video.mp4", (err) => {
          if (err) console.error("DOWNLOAD ERROR:", err);
          cleanup(videoFile, audioFile, outputFile);
        });
      })

      .save(outputFile);

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).send("Erreur serveur");
  }
});

// ✅ CLEANUP
function cleanup(video, audio, output) {
  [video, audio, output].forEach((file) => {
    if (file && fs.existsSync(file)) {
      fs.unlink(file, () => {});
    }
  });
}

// ✅ ERRORS
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("💥 UNHANDLED:", err);
});

// ✅ START
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
