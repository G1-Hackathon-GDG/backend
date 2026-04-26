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

router.use(protect);
router.use(adminOnly);

router.post("/allocate", runAllocation);
router.post("/simulate-shortage", simulateShortage);
router.post("/fraud-check", aiFraudCheck);
router.get("/logs", getAILogs);

export default router;
