import express from "express";
import {
  getMyVoucher,
  getVoucherHistory,
  verifyVoucherByToken,
  redeemVoucher,
  getAllVouchers,
  getVoucherStats,
  cancelVoucher,
} from "../controllers/voucherController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { staffOrAdmin } from "../middleware/staffMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);

// Driver routes
router.get("/my", allowRoles("driver"), getMyVoucher);
router.get("/history", allowRoles("driver"), getVoucherHistory);

// Admin routes
router.get("/all", adminOnly, getAllVouchers);
router.get("/stats", adminOnly, getVoucherStats);
router.patch("/:id/cancel", adminOnly, cancelVoucher);

// Staff routes — verify and redeem
router.get("/verify/:token", staffOrAdmin, verifyVoucherByToken);
router.post("/redeem", staffOrAdmin, redeemVoucher);

export default router;
