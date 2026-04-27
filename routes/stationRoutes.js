import express from "express";
import {
  createStation,
  getStationById,
  getStationLog,
  getStations,
  getStationSlots,
  toggleStationStatus,
  updateStationFuel,
} from "../controllers/stationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { staffOrAdmin } from "../middleware/staffMiddleware.js";

const router = express.Router();

router.get("/", getStations);
router.get("/:id", protect, getStationById);
router.get("/:id/slots", protect, getStationSlots);
router.get("/:id/log", protect, staffOrAdmin, getStationLog);
router.post("/", protect, adminOnly, createStation);
router.put("/:id/fuel", protect, adminOnly, updateStationFuel);
router.patch("/:id/toggle", protect, adminOnly, toggleStationStatus);

export default router;
