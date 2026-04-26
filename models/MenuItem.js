import mongoose from "mongoose";

const MenuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
      maxlength: [120, "Name cannot exceed 120 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    preparationTime: {
      type: Number,
      required: [true, "Preparation time is required"],
      min: [1, "Preparation time must be at least 1 minute"],
    },
  },
  { timestamps: true },
);

const MenuItem = mongoose.model("MenuItem", MenuItemSchema);
export default MenuItem;
