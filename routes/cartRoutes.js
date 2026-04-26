import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeItem,
} from "../controllers/cartController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getCart);
router.post("/", authMiddleware, addToCart);
router.put("/:itemId", authMiddleware, updateCartItem);
router.delete("/:itemId", authMiddleware, removeItem);

export default router;