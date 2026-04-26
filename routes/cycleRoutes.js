import express from "express";
import {
  closeCycle,
  createCycle,
  getActiveCycle,
} from "../controllers/cycleController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import {
  validateCreateCycleBody,
  validateMongoIdParam,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.get("/active", protect, getActiveCycle);
router.post("/", protect, adminOnly, validateCreateCycleBody, createCycle);
router.patch("/:id/close", protect, adminOnly, validateMongoIdParam("id"), closeCycle);

export default router;
