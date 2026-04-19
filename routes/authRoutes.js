import express from "express";
import {
  register,
  login,
  adminLogin,
  getMe,
  refresh,
  logout,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/admin/login", adminLogin);
router.post("/refresh", refresh);

// Protected routes
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

export default router;
