import mongoose from "mongoose";
import Voucher from "../models/Voucher.js";
import Vehicle from "../models/Vehicle.js";
import Station from "../models/Station.js";
import Cycle from "../models/Cycle.js";
import User from "../models/User.js";
import StationLog from "../models/StationLog.js";
import { generateQRToken } from "../utils/generateQR.js";
import {
  emitVoucherCancelled,
  emitVoucherIssued,
  emitVoucherRedeemed,
} from "../sockets/socketHandler.js";

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

async function getRequestStaffStationId(req) {
  if (req.user?.role !== "staff") return null;

  const staffUser = await User.findById(req.user.id).select("stationId").lean();
  return staffUser?.stationId ? staffUser.stationId.toString() : null;
}

export async function issueVoucher(req, res) {
  try {
    const {
      vehicleId,
      stationId,
      cycleId,
      fuelLiters,
      validDate,
      timeSlot,
    } = req.body;

    const [vehicle, station, cycle] = await Promise.all([
      Vehicle.findById(vehicleId).lean(),
      Station.findById(stationId).lean(),
      Cycle.findById(cycleId).lean(),
    ]);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found." });
    }
    if (!vehicle.isVerified || vehicle.flagged) {
      return res.status(400).json({
        message: "Voucher can only be issued for verified and unflagged vehicles.",
      });
    }

    if (!station) {
      return res.status(404).json({ message: "Station not found." });
    }
    if (!station.isActive) {
      return res.status(400).json({ message: "Station is inactive." });
    }

    if (!cycle) {
      return res.status(404).json({ message: "Cycle not found." });
    }
    if (cycle.status !== "active") {
      return res.status(400).json({ message: "Cycle must be active." });
    }

    const voucher = await Voucher.create({
      vehicleId: vehicle._id,
      plateNumber: vehicle.plateNumber,
      vehicleType: vehicle.vehicleType,
      tierLevel: vehicle.tierLevel,
      stationId: station._id,
      stationName: station.name,
      cycleId: cycle._id,
      fuelLiters,
      validDate,
      timeSlot,
      qrToken: generateQRToken(),
      status: "pending",
    });

    const io = req.app.get("io");
    if (io) {
      emitVoucherIssued(io, vehicle.ownerId, {
        voucherId: voucher._id,
        vehicleId: voucher.vehicleId,
        plateNumber: voucher.plateNumber,
        stationId: voucher.stationId,
        stationName: voucher.stationName,
        fuelLiters: voucher.fuelLiters,
        timeSlot: voucher.timeSlot,
        validDate: voucher.validDate,
        qrToken: voucher.qrToken,
      });
    }

    return res.status(201).json({
      message: "Voucher issued successfully.",
      voucher,
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.qrToken) {
      return res.status(409).json({ message: "QR token collision. Try again." });
    }

    console.error("Issue voucher error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
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
    const staffStationId = await getRequestStaffStationId(req);

    const voucher = await Voucher.findOne({ qrToken: token }).lean();
    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found." });
    }

    if (req.user.role === "staff") {
      if (!staffStationId) {
        return res.status(403).json({
          message: "Staff account is not assigned to a station.",
        });
      }

      if (staffStationId !== voucher.stationId.toString()) {
        return res.status(403).json({
          message: "This voucher is assigned to another station.",
        });
      }
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
      .select("plateNumber ownerName vehicleType tierLevel ownerId phone")
      .lean();

    const station = await Station.findById(voucher.stationId)
      .select("name city location currentFuelLiters dailyCapacity isActive")
      .lean();
    if (!station) {
      return res.status(404).json({ message: "Station not found." });
    }
    if (!station.isActive) {
      return res.status(400).json({ message: "Station is inactive." });
    }

    const cycle = await Cycle.findById(voucher.cycleId)
      .select("cycleNumber startDate endDate status")
      .lean();
    if (!cycle) {
      return res.status(404).json({ message: "Cycle not found." });
    }
    if (cycle.status !== "active") {
      return res.status(400).json({ message: "Voucher cycle is not active." });
    }

    return res.json({
      voucher,
      vehicle,
      station,
      cycle,
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
    const staffStationId = await getRequestStaffStationId(req);

    if (!token) {
      return res.status(400).json({ message: "token is required." });
    }

    let redeemedVoucher;
    let redeemedStation;

    await session.withTransaction(async () => {
      const voucher = await Voucher.findOne({ qrToken: token }).session(session);

      if (!voucher) {
        throw new Error("NOT_FOUND");
      }

      if (req.user.role === "staff") {
        if (!staffStationId) {
          throw new Error("STAFF_STATION_MISSING");
        }
        if (staffStationId !== voucher.stationId.toString()) {
          throw new Error("WRONG_STATION");
        }
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
      if (!station.isActive) {
        throw new Error("STATION_INACTIVE");
      }

      const cycle = await Cycle.findById(voucher.cycleId).session(session);
      if (!cycle) {
        throw new Error("CYCLE_NOT_FOUND");
      }
      if (cycle.status !== "active") {
        throw new Error("CYCLE_CLOSED");
      }

      const beforeLiters = station.currentFuelLiters;
      if (station.currentFuelLiters < voucher.fuelLiters) {
        throw new Error("INSUFFICIENT_STATION_FUEL");
      }

      if (cycle.totalFuelAvailable < voucher.fuelLiters) {
        throw new Error("INSUFFICIENT_CYCLE_FUEL");
      }

      station.currentFuelLiters -= voucher.fuelLiters;
      await station.save({ session });
      redeemedStation = station;

      cycle.totalFuelAvailable -= voucher.fuelLiters;
      await cycle.save({ session });

      voucher.status = "redeemed";
      voucher.redeemedAt = new Date();
      voucher.redeemedBy = req.user.id;
      await voucher.save({ session });

      await StationLog.create(
        [
          {
            stationId: station._id,
            eventType: "voucher_redeem",
            litersDelta: -Math.abs(voucher.fuelLiters),
            beforeLiters,
            afterLiters: station.currentFuelLiters,
            voucherId: voucher._id,
            actorUserId: req.user.id,
            notes: `Redeemed voucher for plate ${voucher.plateNumber}.`,
          },
        ],
        { session },
      );

      redeemedVoucher = voucher;
    });

    const io = req.app.get("io");
    if (io) {
      const redeemedVehicle = await Vehicle.findById(redeemedVoucher.vehicleId)
        .select("ownerId plateNumber")
        .lean();

      emitVoucherRedeemed(io, {
        voucherId: redeemedVoucher._id,
        userId: redeemedVehicle?.ownerId?.toString() || null,
        stationId: redeemedVoucher.stationId,
        vehicleId: redeemedVoucher.vehicleId,
        plateNumber: redeemedVehicle?.plateNumber || redeemedVoucher.plateNumber,
        fuelLiters: redeemedVoucher.fuelLiters,
        redeemedAt: redeemedVoucher.redeemedAt,
      });
    }

    return res.json({
      message: "Voucher redeemed successfully.",
      voucher: {
        id: redeemedVoucher._id,
        status: redeemedVoucher.status,
        redeemedAt: redeemedVoucher.redeemedAt,
        redeemedBy: redeemedVoucher.redeemedBy,
      },
      station: redeemedStation
        ? {
            id: redeemedStation._id,
            name: redeemedStation.name,
            currentFuelLiters: redeemedStation.currentFuelLiters,
          }
        : null,
    });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ message: "Voucher not found." });
    }
    if (error.message === "ALREADY_REDEEMED") {
      return res.status(400).json({ message: "Voucher already redeemed." });
    }
    if (error.message === "STAFF_STATION_MISSING") {
      return res
        .status(403)
        .json({ message: "Staff account is not assigned to a station." });
    }
    if (error.message === "WRONG_STATION") {
      return res
        .status(403)
        .json({ message: "This voucher is assigned to another station." });
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
    if (error.message === "CYCLE_NOT_FOUND") {
      return res.status(404).json({ message: "Cycle not found." });
    }
    if (error.message === "STATION_INACTIVE") {
      return res.status(400).json({ message: "Station is inactive." });
    }
    if (error.message === "CYCLE_CLOSED") {
      return res.status(400).json({ message: "Cycle is not active." });
    }
    if (error.message === "INSUFFICIENT_STATION_FUEL") {
      return res
        .status(400)
        .json({ message: "Station does not have enough fuel for this voucher." });
    }
    if (error.message === "INSUFFICIENT_CYCLE_FUEL") {
      return res
        .status(400)
        .json({ message: "Cycle does not have enough fuel for this voucher." });
    }

    console.error("Redeem voucher error:", error.message);
    return res.status(500).json({ message: "Server error." });
  } finally {
    session.endSession();
  }
}

export async function getAllVouchers(req, res) {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = String(req.query.status).trim();
    }
    if (req.query.tierLevel) {
      filter.tierLevel = Number(req.query.tierLevel);
    }
    if (mongoose.Types.ObjectId.isValid(req.query.stationId)) {
      filter.stationId = req.query.stationId;
    }
    if (mongoose.Types.ObjectId.isValid(req.query.cycleId)) {
      filter.cycleId = req.query.cycleId;
    }

    const vouchers = await Voucher.find(filter)
      .sort({ createdAt: -1 })
      .populate("vehicleId", "ownerId ownerName plateNumber vehicleType tierLevel")
      .lean();
    return res.json({ count: vouchers.length, vouchers });
  } catch (error) {
    console.error("Get all vouchers error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function getVoucherStats(req, res) {
  try {
    const [statusStats, tierStats, totalFuelAllocated] = await Promise.all([
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
            _id: "$tierLevel",
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

    const byTier = tierStats.reduce((acc, item) => {
      acc[`tier${item._id}`] = item.count;
      return acc;
    }, {});

    return res.json({
      byStatus,
      byTier,
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

    voucher.cancelReason = String(req.body?.reason || "Cancelled by admin").trim();
    voucher.cancelledAt = new Date();
    voucher.cancelledBy = req.user.id;
    voucher.status = "cancelled";
    await voucher.save();

    const io = req.app.get("io");
    if (io) {
      const vehicle = await Vehicle.findById(voucher.vehicleId)
        .select("ownerId")
        .lean();

      emitVoucherCancelled(io, vehicle?.ownerId, {
        voucherId: voucher._id,
        stationId: voucher.stationId,
        stationName: voucher.stationName,
        vehicleId: voucher.vehicleId,
        reason: voucher.cancelReason,
      });
    }

    return res.json({ message: "Voucher cancelled successfully.", voucher });
  } catch (error) {
    console.error("Cancel voucher error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}
