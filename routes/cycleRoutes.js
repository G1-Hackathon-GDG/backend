import express from "express";
import {
  createCycle,
  getActiveCycle,
  getAllCycles,
  closeCycle,
} from "../controllers/cycleController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/active", getActiveCycle); // all roles — frontend needs this
router.get("/", adminOnly, getAllCycles);
router.post("/", adminOnly, createCycle);
router.patch("/:id/close", adminOnly, closeCycle);

export default router;
