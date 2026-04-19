import mongoose from "mongoose";

const TIER_MAP = {
  fuel_tanker: 1,
  manufacturing: 1,
  government_project: 1,
  essential_goods: 2,
  agricultural_tractor: 2,
  urban_public_transport: 3,
  diesel_public_transport: 3,
  private: 4,
};

const vehicleSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ownerName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  plateNumber: { type: String, required: true, unique: true, uppercase: true },
  vehicleType: { type: String, required: true, enum: Object.keys(TIER_MAP) },
  tierLevel: { type: Number, enum: [1, 2, 3, 4] },
  isVerified: { type: Boolean, default: false },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String, default: "" },
  allocationsThisCycle: { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now },
});

vehicleSchema.pre("save", function (next) {
  if (this.vehicleType) this.tierLevel = TIER_MAP[this.vehicleType];
  next();
});

export default mongoose.model("Vehicle", vehicleSchema);
