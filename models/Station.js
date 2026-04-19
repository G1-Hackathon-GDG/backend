const mongoose = require("mongoose");

const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    location: { type: String },
    currentFuelLiters: { type: Number, required: true, default: 0 },
    dailyCapacity: { type: Number, required: true },
    slotsPerHour: { type: Number, default: 30 },
    operatingHours: {
      open: { type: String, default: "06:00" },
      close: { type: String, default: "20:00" },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Station", stationSchema);
