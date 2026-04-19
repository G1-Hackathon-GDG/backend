const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    plateNumber: { type: String, required: true },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
    },
    stationName: { type: String, required: true },
    cycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cycle",
      required: true,
    },
    fuelLiters: { type: Number, required: true },
    validDate: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    qrToken: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "redeemed", "expired", "cancelled"],
      default: "pending",
    },
    issuedAt: { type: Date, default: Date.now },
    redeemedAt: { type: Date },
    redeemedBy: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Voucher", voucherSchema);
