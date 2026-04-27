import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    plateNumber: { type: String, required: true },
    vehicleType: { type: String, required: true },
    tierLevel: { type: Number, enum: [1, 2, 3, 4], required: true },
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
    cancelledAt: { type: Date },
    cancelledBy: { type: String },
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Voucher", voucherSchema);
