import { v4 as uuidv4 } from "uuid";
import Cycle from "../models/Cycle.js";
import Station from "../models/Station.js";
import Voucher from "../models/Voucher.js";
import Vehicle from "../models/Vehicle.js";
import AllocationLog from "../models/AllocationLog.js";
import { buildAllocationPlan } from "../utils/allocationEngine.js";
import { runFraudChecks } from "../utils/fraudChecker.js";
import {
  emitShortageAlert,
  emitVoucherCancelled,
  emitVoucherIssued,
} from "../sockets/socketHandler.js";

function getActiveCycle() {
  return Cycle.findOne({ status: "active" }).sort({ createdAt: -1 });
}

function getStationAssignment(stations, index) {
  if (!stations.length) return null;
  return stations[index % stations.length];
}

async function buildActiveContext() {
  const [cycle, stations, vehicles] = await Promise.all([
    getActiveCycle(),
    Station.find({ isActive: true }).sort({ createdAt: 1 }),
    Vehicle.find({ isVerified: true, flagged: false })
      .populate("ownerId", "name role")
      .sort({ tierLevel: 1, registeredAt: 1 }),
  ]);

  return { cycle, stations, vehicles };
}

export async function allocateFuel(req, res) {
  try {
    const { cycle, stations, vehicles } = await buildActiveContext();

    if (!cycle) {
      return res.status(404).json({ message: "No active cycle found." });
    }

    if (!stations.length) {
      return res.status(400).json({ message: "No active stations available." });
    }

    const { allocations, unallocatedFuel } = buildAllocationPlan({
      vehicles,
      totalFuelAvailable: cycle.totalFuelAvailable,
      maxLitersPerVehicle: Object.fromEntries(
        cycle.distributionRules?.maxLitersPerVehicle || [],
      ),
    });

    const createdVouchers = [];
    for (let index = 0; index < allocations.length; index += 1) {
      const allocation = allocations[index];
      const station = getStationAssignment(stations, index);
      if (!station) continue;

      const voucher = await Voucher.create({
        vehicleId: allocation.vehicle._id,
        plateNumber: allocation.vehicle.plateNumber,
        stationId: station._id,
        stationName: station.name,
        cycleId: cycle._id,
        fuelLiters: allocation.liters,
        validDate: new Date(),
        timeSlot: "08:00-09:00",
        qrToken: uuidv4(),
        status: "pending",
      });

      createdVouchers.push(voucher);

      const driverRoomId =
        allocation.vehicle.ownerId?._id?.toString?.() ||
        allocation.vehicle.ownerId?.toString?.();
      if (req.io && driverRoomId) {
        emitVoucherIssued(req.io, driverRoomId, {
          voucherId: voucher._id.toString(),
          qrToken: voucher.qrToken,
          fuelLiters: voucher.fuelLiters,
          stationId: station._id.toString(),
          stationName: station.name,
          plateNumber: voucher.plateNumber,
          cycleId: cycle._id.toString(),
        });
      }
    }

    const alertLevel = unallocatedFuel > 0 ? "warning" : "normal";
    const allocationLog = await AllocationLog.create({
      cycleId: cycle._id,
      triggeredBy: req.user?.id || "admin",
      inputSummary: {
        vehicleCount: vehicles.length,
        activeStationCount: stations.length,
        totalFuelAvailable: cycle.totalFuelAvailable,
      },
      totalFuelAvailable: cycle.totalFuelAvailable,
      aiDecision: {
        engine: "rule-based",
        allocations: allocations.length,
        unallocatedFuel,
      },
      alertLevel,
      vouchersGenerated: createdVouchers.length,
    });

    return res.status(201).json({
      message: "Fuel allocation completed.",
      cycleId: cycle._id,
      vouchersGenerated: createdVouchers.length,
      unallocatedFuel,
      allocationLog,
      vouchers: createdVouchers,
    });
  } catch (error) {
    console.error("Allocate fuel error:", error.message);
    return res.status(500).json({ message: "Failed to allocate fuel." });
  }
}

export async function simulateShortage(req, res) {
  try {
    const stations = await Station.find({ isActive: true }).sort({
      createdAt: 1,
    });
    if (!stations.length) {
      return res.status(400).json({ message: "No active stations found." });
    }

    const originalTotalFuel = stations.reduce(
      (sum, station) => sum + station.currentFuelLiters,
      0,
    );
    const shortageTarget = Math.floor(originalTotalFuel * 0.5);

    for (const station of stations) {
      station.currentFuelLiters = Math.floor(station.currentFuelLiters * 0.5);
      await station.save();
    }

    const shortageReport = {
      stationCount: stations.length,
      stations: stations.map((station) => ({
        stationId: station._id.toString(),
        stationName: station.name,
        currentFuelLiters: station.currentFuelLiters,
      })),
      reason: "Fuel shortage simulation applied.",
    };

    if (req.io) {
      emitShortageAlert(req.io, shortageReport);
    }

    const vouchersToCancel = await Voucher.find({ status: "pending" })
      .populate("vehicleId", "ownerId tierLevel plateNumber")
      .sort({ createdAt: 1 });

    const tierPriority = [4, 3];
    let cancelledFuel = 0;
    const cancelledVouchers = [];

    for (const tier of tierPriority) {
      for (const voucher of vouchersToCancel) {
        if ((voucher.vehicleId?.tierLevel || 4) !== tier) continue;
        if (cancelledFuel >= shortageTarget) break;

        voucher.status = "cancelled";
        await voucher.save();

        cancelledFuel += voucher.fuelLiters || 0;
        cancelledVouchers.push(voucher);

        const driverRoomId = voucher.vehicleId?.ownerId?.toString();
        if (req.io && driverRoomId) {
          emitVoucherCancelled(req.io, driverRoomId, {
            voucherId: voucher._id.toString(),
            plateNumber: voucher.plateNumber,
            fuelLiters: voucher.fuelLiters,
            reason: "Shortage simulation cancelled this voucher.",
          });
        }
      }

      if (cancelledFuel >= shortageTarget) break;
    }

    const allocationLog = await AllocationLog.create({
      cycleId: (await getActiveCycle())?._id,
      triggeredBy: req.user?.id || "admin",
      inputSummary: shortageReport,
      totalFuelAvailable: stations.reduce(
        (sum, station) => sum + station.currentFuelLiters,
        0,
      ),
      aiDecision: {
        engine: "rule-based",
        cancelledVouchers: cancelledVouchers.length,
        cancelledFuel,
        shortageTarget,
      },
      alertLevel: "critical",
      vouchersGenerated: 0,
    });

    return res.json({
      message: "Shortage simulation completed.",
      shortageReport,
      cancelledVouchers: cancelledVouchers.length,
      cancelledFuel,
      allocationLog,
    });
  } catch (error) {
    console.error("Simulate shortage error:", error.message);
    return res.status(500).json({ message: "Failed to simulate shortage." });
  }
}

export async function fraudCheck(req, res) {
  try {
    const fraudResult = await runFraudChecks({
      plateNumber: req.body?.plateNumber,
      phone: req.body?.phone,
      vehicleType: req.body?.vehicleType,
      claimedTier: req.body?.claimedTier,
    });

    return res.json(fraudResult);
  } catch (error) {
    console.error("AI fraud check error:", error.message);
    return res.status(500).json({ message: "Failed to run fraud check." });
  }
}

export async function getAllocationLogs(_req, res) {
  try {
    const logs = await AllocationLog.find().sort({ timestamp: -1 }).lean();
    return res.json({ count: logs.length, logs });
  } catch (error) {
    console.error("Get allocation logs error:", error.message);
    return res.status(500).json({ message: "Failed to load allocation logs." });
  }
}
