// server.js — RHAZN Video Server ✅ FINAL

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

// ✅ config multer (plus propre)
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

    // ⚠️ ici tu peux améliorer plus tard (download audio URL)
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
      // ✅ supprimer le fichier upload temporaire
      fs.unlink(videoPath, () => {});

      if (err) {
        console.error("FFmpeg error:", err);
        return res.status(500).send("ffmpeg error");
      }

      res.json({
        success: true,
        url: `http://${getLocalIP()}:3000/outputs/${outputFile}`,
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).send("server error");
  }
});

// ✅ servir fichiers statiques
app.use("/outputs", express.static(OUTPUT_DIR));

// ✅ fonction pour IP locale
function getLocalIP() {
  const os = require("os");
  const interfaces = os.networkInterfaces();

  for (let name of Object.keys(interfaces)) {
    for (let net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

// ✅ IMPORTANT → accessible réseau
app.listen(3000, "0.0.0.0", () => {
  console.log("🚀 Server running:");
  console.log(`👉 Local: http://localhost:3000`);
  console.log(`👉 Network: http://${getLocalIP()}:3000`);
});
