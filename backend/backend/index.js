import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// load env
dotenv.config();

const app = express();

// middlewares
app.use(cors({
  origin: "*", // tu peux restreindre plus tard
}));
app.use(express.json());

// route test
app.get("/", (req, res) => {
  res.send("API RHAZN OK ✅");
});

// health check (important pour Railway)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// example route (test API)
app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend fonctionne ✅",
  });
});

// gestion erreurs 404
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// gestion erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
  });
});

// start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
