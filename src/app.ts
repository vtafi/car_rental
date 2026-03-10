import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import carRoutes from "./routes/carRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import authRoutes from "./routes/authRoutes";
import authViewRoutes from "./routes/authViewRoutes";
import viewRoutes from "./routes/viewRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI =
<<<<<<< HEAD
  process.env.MONGO_URI ||
  "mongodb+srv://car:car123@nodejs.fwsxclm.mongodb.net/car_rental";
=======
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/car_rental";

>>>>>>> 689bf4cd295bf396834d4f99decf7bd06c39309c
// ── View engine ───────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Static files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../public")));

// ── CORS ──────────────────────────────────────────────────────
// Allow specified origins (configurable per environment)
<<<<<<< HEAD
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  "https://car-production-9d28.up.railway.app,http://localhost:3001"
)
=======
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3001")
>>>>>>> 689bf4cd295bf396834d4f99decf7bd06c39309c
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true, // Allow cookies to be sent cross-origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

// ── Core Middleware ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse JWT from req.cookies.token

// ── Health check (no auth, used by Railway/Docker) ────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Auth View Routes (login/register pages — no auth required) ─
app.use("/", authViewRoutes);

// ── API Routes (REST) ─────────────────────────────────────────
app.use("/api/auth", authRoutes); // POST /api/auth/login, register, logout, GET /me
app.use("/api/cars", carRoutes); // Protected by authenticateJWT at route level if needed
app.use("/api/bookings", bookingRoutes);

// ── UI (EJS) Routes — protected by requireAuth ────────────────
app.use("/", viewRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res
    .status(404)
    .send(
      "<h2 style='font-family:sans-serif'>404 – Trang không tồn tại</h2><a href='/'>Về trang chủ</a>",
    );
});

// ── Connect DB & Start ────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected:", MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Server: http://localhost:${PORT}`);
      console.log(`\n📄 UI Pages:`);
      console.log(`   http://localhost:${PORT}/login`);
      console.log(`   http://localhost:${PORT}/register`);
      console.log(`   http://localhost:${PORT}/         (Dashboard)`);
      console.log(`   http://localhost:${PORT}/cars`);
      console.log(`   http://localhost:${PORT}/bookings`);
      console.log(`\n🔌 API Endpoints:`);
      console.log(`   POST /api/auth/login`);
      console.log(`   POST /api/auth/register`);
      console.log(`   POST /api/auth/logout`);
      console.log(`   GET  /api/auth/me`);
      console.log(`   GET  /api/cars`);
      console.log(`   GET  /api/bookings`);
    });
  })
  .catch((err: Error) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

export default app;
