import express from "express";
import {
  cancelVoucher,
  getAllVouchers,
  getMyVoucher,
  getVoucherHistory,
  getVoucherStats,
  redeemVoucher,
  verifyVoucherByToken,
} from "../controllers/voucherController.js";
import { protect } from "../middleware/authMiddleware.js";
import { staffOrAdmin } from "../middleware/staffMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import {
  validateCancelVoucherBody,
  validateMongoIdParam,
  validateRedeemVoucherBody,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.get("/my", protect, getMyVoucher);
router.get("/history", protect, getVoucherHistory);

router.get("/verify/:token", protect, staffOrAdmin, verifyVoucherByToken);
router.post(
  "/redeem",
  protect,
  staffOrAdmin,
  validateRedeemVoucherBody,
  redeemVoucher,
);

router.get("/all", protect, adminOnly, getAllVouchers);
router.get("/stats", protect, adminOnly, getVoucherStats);
router.patch(
  "/:id/cancel",
  protect,
  adminOnly,
  validateMongoIdParam("id"),
  validateCancelVoucherBody,
  cancelVoucher,
);

export default router;
