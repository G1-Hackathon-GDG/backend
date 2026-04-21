import mongoose from "mongoose";
import Voucher from "../models/Voucher.js";
import Vehicle from "../models/Vehicle.js";
import Station from "../models/Station.js";

function endOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);
  return date;
}

function isVoucherExpired(voucher) {
  return new Date() > endOfDay(voucher.validDate);
}

async function getDriverVehicleIds(userId) {
  const vehicles = await Vehicle.find({ ownerId: userId }).select("_id");
  return vehicles.map((vehicle) => vehicle._id);
}

export async function getMyVoucher(req, res) {
  try {
    if (req.user.role !== "driver") {
      return res
        .status(403)
        .json({ message: "Access denied. Drivers only." });
    }

    const vehicleIds = await getDriverVehicleIds(req.user.id);

    const voucher = await Voucher.findOne({
      vehicleId: { $in: vehicleIds },
      status: { $in: ["pending"] },
    })
      .sort({ validDate: 1, createdAt: -1 })
      .lean();

    if (!voucher) {
      return res.json({ voucher: null });
    }

    if (voucher.status === "pending" && isVoucherExpired(voucher)) {
      await Voucher.findByIdAndUpdate(voucher._id, { status: "expired" });
      return res.json({ voucher: { ...voucher, status: "expired" } });
    }

    return res.json({ voucher });
  } catch (error) {
    console.error("Get my voucher error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function getVoucherHistory(req, res) {
  try {
    if (req.user.role !== "driver") {
      return res
        .status(403)
        .json({ message: "Access denied. Drivers only." });
    }

    const vehicleIds = await getDriverVehicleIds(req.user.id);

    const vouchers = await Voucher.find({ vehicleId: { $in: vehicleIds } })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ count: vouchers.length, vouchers });
  } catch (error) {
    console.error("Get voucher history error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function verifyVoucherByToken(req, res) {
  try {
    const { token } = req.params;

    const voucher = await Voucher.findOne({ qrToken: token }).lean();
    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found." });
    }

    if (voucher.status === "redeemed") {
      return res.status(400).json({ message: "Voucher already redeemed." });
    }

    if (voucher.status === "cancelled") {
      return res.status(400).json({ message: "Voucher is cancelled." });
    }

    if (isVoucherExpired(voucher)) {
      await Voucher.findByIdAndUpdate(voucher._id, { status: "expired" });
      return res.status(400).json({ message: "Voucher is expired." });
    }

    const vehicle = await Vehicle.findById(voucher.vehicleId)
      .select("plateNumber ownerName vehicleType tierLevel")
      .lean();

    return res.json({
      voucher,
      vehicle,
    });
  } catch (error) {
    console.error("Verify voucher error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function redeemVoucher(req, res) {
  const session = await mongoose.startSession();

  try {
    const token = req.body?.token || req.body?.qrToken;

    if (!token) {
      return res.status(400).json({ message: "token is required." });
    }

    let redeemedVoucher;

    await session.withTransaction(async () => {
      const voucher = await Voucher.findOne({ qrToken: token }).session(session);

      if (!voucher) {
        throw new Error("NOT_FOUND");
      }

      if (voucher.status === "redeemed") {
        throw new Error("ALREADY_REDEEMED");
      }

      if (voucher.status === "cancelled") {
        throw new Error("CANCELLED");
      }

      if (isVoucherExpired(voucher)) {
        voucher.status = "expired";
        await voucher.save({ session });
        throw new Error("EXPIRED");
      }

      const station = await Station.findById(voucher.stationId).session(session);
      if (!station) {
        throw new Error("STATION_NOT_FOUND");
      }

      if (station.currentFuelLiters < voucher.fuelLiters) {
        throw new Error("INSUFFICIENT_STATION_FUEL");
      }

      station.currentFuelLiters -= voucher.fuelLiters;
      await station.save({ session });

      voucher.status = "redeemed";
      voucher.redeemedAt = new Date();
      voucher.redeemedBy = req.user.id;
      await voucher.save({ session });

      redeemedVoucher = voucher;
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("voucher_redeemed", {
        voucherId: redeemedVoucher._id,
        vehicleId: redeemedVoucher.vehicleId,
        redeemedAt: redeemedVoucher.redeemedAt,
      });
    }

    return res.json({ message: "Voucher redeemed successfully." });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ message: "Voucher not found." });
    }
    if (error.message === "ALREADY_REDEEMED") {
      return res.status(400).json({ message: "Voucher already redeemed." });
    }
    if (error.message === "CANCELLED") {
      return res.status(400).json({ message: "Voucher is cancelled." });
    }
    if (error.message === "EXPIRED") {
      return res.status(400).json({ message: "Voucher is expired." });
    }
    if (error.message === "STATION_NOT_FOUND") {
      return res.status(404).json({ message: "Station not found." });
    }
    if (error.message === "INSUFFICIENT_STATION_FUEL") {
      return res
        .status(400)
        .json({ message: "Station does not have enough fuel for this voucher." });
    }

    console.error("Redeem voucher error:", error.message);
    return res.status(500).json({ message: "Server error." });
  } finally {
    session.endSession();
  }
}

export async function getAllVouchers(req, res) {
  try {
    const vouchers = await Voucher.find().sort({ createdAt: -1 }).lean();
    return res.json({ count: vouchers.length, vouchers });
  } catch (error) {
    console.error("Get all vouchers error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function getVoucherStats(req, res) {
  try {
    const [statusStats, totalFuelAllocated] = await Promise.all([
      Voucher.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Voucher.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$fuelLiters" },
          },
        },
      ]),
    ]);

    const byStatus = statusStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return res.json({
      byStatus,
      totalFuelAllocated: totalFuelAllocated[0]?.total ?? 0,
    });
  } catch (error) {
    console.error("Get voucher stats error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function cancelVoucher(req, res) {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findById(id);

    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found." });
    }

    if (voucher.status === "redeemed") {
      return res.status(400).json({ message: "Redeemed voucher cannot be cancelled." });
    }

    voucher.status = "cancelled";
    await voucher.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("voucher_cancelled", {
        voucherId: voucher._id,
        vehicleId: voucher.vehicleId,
        reason: req.body?.reason || "Cancelled by admin",
      });
    }

    return res.json({ message: "Voucher cancelled successfully.", voucher });
  } catch (error) {
    console.error("Cancel voucher error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}
