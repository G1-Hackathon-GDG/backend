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

router.use(protect);

router.get("/", getStations);
router.get("/:id", getStationById);
router.get("/:id/slots", getStationSlots);
router.get("/:id/log", staffOrAdmin, getStationLog);
router.post("/", adminOnly, createStation);
router.put("/:id/fuel", staffOrAdmin, updateStationFuel);
router.patch("/:id/toggle", adminOnly, toggleStationStatus);

export default router;

