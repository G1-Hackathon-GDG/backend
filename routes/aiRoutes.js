import express from "express";
import {
  allocateFuel,
  fraudCheck,
  getAllocationLogs,
  simulateShortage,
  runAllocation,
  aiFraudCheck,
  getAILogs,
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

// If you need to support both legacy and new AI endpoints, rename or refactor as needed.

export default router;
