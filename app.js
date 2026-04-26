import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import stationRoutes from "./routes/stationRoutes.js";
import voucherRoutes from "./routes/voucherRoutes.js";
import cycleRoutes from "./routes/cycleRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();

// Middleware 
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Routes 
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/cycles", cycleRoutes);
app.use("/api/ai", aiRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "FuelPass API is running" });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error.",
  });
});

export default app;
