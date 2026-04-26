import mongoose from "mongoose";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import { clearCart } from "./cartController.js";

const statusFlow = ["pending", "preparing", "ready", "completed"];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/orders
export const placeOrder = async (req, res) => {
  try {
    const user = req.user;

    if (!user.isVerified) {
      return res.status(403).json({ message: "User is not verified" });
    }

    const cart = await Cart.findOne({ userId: user.id }).populate(
      "items.menuItemId",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const orderItems = cart.items.map((item) => ({
      name: item.menuItemId?.name,
      price: item.menuItemId?.price,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions,
    }));

    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = new Order({
      userId: user.id,
      items: orderItems,
      totalPrice,
    });

    await order.save();
    await clearCart(user.id);

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to place order" });
  }
};

// GET /api/orders/my
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// GET /api/orders (Admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("userId", "name phoneNumber");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch all orders" });
  }
};

// PATCH /api/orders/:id/status (Admin)
export const updateStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    if (!statusFlow.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentIndex = statusFlow.indexOf(order.status);
    const newIndex = statusFlow.indexOf(status);

    if (newIndex <= currentIndex) {
      return res.status(400).json({ message: "Invalid status transition" });
    }

    order.status = status
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to update status" });
  }
};