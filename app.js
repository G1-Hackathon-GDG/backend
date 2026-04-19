const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ message: "⛽ FuelPass API is running" });
});

// Routes will be mounted here later
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/vehicles', require('./routes/vehicleRoutes'));
// etc.

module.exports = app;
