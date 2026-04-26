import express from "express";
import {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "../controllers/menuController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getMenuItems);
router.get("/:id", getMenuItemById);

// Admin routes
router.post("/", authMiddleware, adminMiddleware, createMenuItem);
router.put("/:id", authMiddleware, adminMiddleware, updateMenuItem);
router.delete("/:id", authMiddleware, adminMiddleware, deleteMenuItem);
router.patch(
  "/:id/availability",
  authMiddleware,
  adminMiddleware,
  toggleMenuItemAvailability,
);

export default router;
