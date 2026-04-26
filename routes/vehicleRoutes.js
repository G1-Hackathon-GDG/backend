import express from "express";
import {
  flagVehicle,
  getAllVehicles,
  getMyVehicles,
  getVehicleById,
  registerVehicle,
  unflagVehicle,
  verifyVehicle,
} from "../controllers/vehicleController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { fraudMiddleware } from "../middleware/fraudMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", allowRoles("driver"), fraudMiddleware, registerVehicle);
router.get("/me", allowRoles("driver"), getMyVehicles);
router.get("/all", adminOnly, getAllVehicles);
router.get("/:id", allowRoles("driver", "admin"), getVehicleById);
router.patch("/:id/verify", adminOnly, verifyVehicle);
router.patch("/:id/flag", adminOnly, flagVehicle);
router.patch("/:id/unflag", adminOnly, unflagVehicle);

export default router;

