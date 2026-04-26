import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  specialInstructions: String,
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "completed"],
      default: "pending",
    },
    orderNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;