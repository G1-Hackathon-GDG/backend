import express from "express";
import {
  runAllocation,
  simulateShortage,
  aiFraudCheck,
  getAILogs,
} from "../controllers/aiController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

/**
 * Protect all AI routes (admin only)
 */
router.use(protect, adminOnly);

/**
 * AI SYSTEM ROUTES
 */

// Run full fuel allocation (Gemini + engine + vouchers)
router.post("/allocate", runAllocation);

// Simulate fuel shortage scenario
router.post("/simulate-shortage", simulateShortage);

// AI fraud detection analysis
router.post("/fraud-check", aiFraudCheck);

// Get AI allocation logs (pagination supported)
router.get("/logs", getAILogs);

export default router;
