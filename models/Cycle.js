import mongoose from "mongoose";

const cycleSchema = new mongoose.Schema(
  {
    cycleNumber: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalFuelAvailable: { type: Number, required: true },
    distributionRules: {
      priorityWeights: { type: [Number], default: [60, 25, 12, 3] },
      maxLitersPerVehicle: {
        type: Map,
        of: Number,
        default: {
          fuel_tanker: 999999,
          manufacturing: 200,
          government_project: 150,
          essential_goods: 60,
          agricultural_tractor: 80,
          urban_public_transport: 50,
          diesel_public_transport: 50,
          private: 20,
        },
      },
    },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true },
);

export default mongoose.model("Cycle", cycleSchema);
