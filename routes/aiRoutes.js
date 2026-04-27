import express from "express";
import {
<<<<<<< HEAD
  allocateFuel,
  fraudCheck,
  getAllocationLogs,
  simulateShortage,
=======
  runAllocation,
  simulateShortage,
  aiFraudCheck,
  getAILogs,
>>>>>>> 617a9a4d4302f6f28d3a23bda9af34bfb745b931
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

<<<<<<< HEAD
router.use(protect, adminOnly);

router.post("/allocate", allocateFuel);
router.post("/simulate-shortage", simulateShortage);
router.post("/fraud-check", fraudCheck);
router.get("/logs", getAllocationLogs);
=======
router.use(protect);
router.use(adminOnly);

router.post("/allocate", runAllocation);
router.post("/simulate-shortage", simulateShortage);
router.post("/fraud-check", aiFraudCheck);
router.get("/logs", getAILogs);
>>>>>>> 617a9a4d4302f6f28d3a23bda9af34bfb745b931

export default router;
