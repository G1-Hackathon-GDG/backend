import express from "express";
import {
  allocateFuel,
  fraudCheck,
  getAllocationLogs,
  simulateShortage,
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.post("/allocate", allocateFuel);
router.post("/simulate-shortage", simulateShortage);
router.post("/fraud-check", fraudCheck);
router.get("/logs", getAllocationLogs);

export default router;
