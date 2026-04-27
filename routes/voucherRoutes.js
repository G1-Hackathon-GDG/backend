import express from "express";
import {
  issueVoucher,
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
import {
  validateCancelVoucherBody,
  validateIssueVoucherBody,
  validateMongoIdParam,
  validateRedeemVoucherBody,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

// Driver routes
router.get("/my", allowRoles("driver"), getMyVoucher);
router.get("/history", allowRoles("driver"), getVoucherHistory);

// Admin routes
router.get("/all", adminOnly, getAllVouchers);
router.get("/stats", adminOnly, getVoucherStats);
router.post("/issue", adminOnly, validateIssueVoucherBody, issueVoucher);
router.patch(
  "/:id/cancel",
  adminOnly,
  validateMongoIdParam("id"),
  validateCancelVoucherBody,
  cancelVoucher,
);

// Staff routes — verify and redeem
router.get("/verify/:token", staffOrAdmin, verifyVoucherByToken);
router.post("/redeem", staffOrAdmin, validateRedeemVoucherBody, redeemVoucher);

export default router;
