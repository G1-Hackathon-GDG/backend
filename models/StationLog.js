import mongoose from "mongoose";

const stationLogSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
    },
    eventType: {
      type: String,
      enum: ["fuel_increment", "fuel_decrement", "voucher_redeem"],
      required: true,
    },
    litersDelta: { type: Number, required: true },
    beforeLiters: { type: Number },
    afterLiters: { type: Number },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("StationLog", stationLogSchema);

