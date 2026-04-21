import express from "express";
import {
  closeCycle,
  createCycle,
  getActiveCycle,
} from "../controllers/cycleController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get("/active", protect, getActiveCycle);
router.post("/", protect, adminOnly, createCycle);
router.patch("/:id/close", protect, adminOnly, closeCycle);

export default router;
