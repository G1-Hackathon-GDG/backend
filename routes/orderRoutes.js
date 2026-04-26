import express from "express";
import {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateStatus,
} from "../controllers/orderController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Student routes
router.post("/", authMiddleware, placeOrder);
router.get("/my", authMiddleware, getMyOrders);

// Admin routes
router.get("/", authMiddleware, adminMiddleware, getAllOrders);
router.patch("/:id/status", authMiddleware, adminMiddleware, updateStatus);

export default router;