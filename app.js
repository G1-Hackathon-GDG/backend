import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import voucherRoutes from "./routes/voucherRoutes.js";
import cycleRoutes from "./routes/cycleRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/cycles", cycleRoutes);

app.get("/", (req, res) => {
  res.json({ message: "FuelPass API is running" });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error.",
  });
});

export default app;
