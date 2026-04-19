import mongoose from "mongoose";

const allocationLogSchema = new mongoose.Schema({
  cycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cycle",
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  triggeredBy: { type: String, required: true },
  inputSummary: { type: Object },
  totalFuelAvailable: { type: Number },
  aiDecision: { type: Object },
  alertLevel: {
    type: String,
    enum: ["normal", "warning", "critical"],
    default: "normal",
  },
  vouchersGenerated: { type: Number, default: 0 },
});

export default mongoose.model("AllocationLog", allocationLogSchema);
