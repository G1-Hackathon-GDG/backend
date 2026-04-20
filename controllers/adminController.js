import Vehicle from "../models/Vehicle.js";
import Station from "../models/Station.js";
import Voucher from "../models/Voucher.js";
import AllocationLog from "../models/AllocationLog.js";

export async function getAdminStats(_req, res) {
  try {
    const [
      totalVehicles,
      verifiedVehicles,
      flaggedVehicles,
      voucherStatusRows,
      activeStations,
      distributedFuelRows,
      latestLog,
    ] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ isVerified: true }),
      Vehicle.countDocuments({ flagged: true }),
      Voucher.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Station.countDocuments({ isActive: true }),
      Voucher.aggregate([
        { $match: { status: "redeemed" } },
        {
          $group: {
            _id: null,
            liters: { $sum: "$fuelLiters" },
          },
        },
      ]),
      AllocationLog.findOne()
        .sort({ timestamp: -1 })
        .select("alertLevel timestamp"),
    ]);

    const vouchersByStatus = {
      pending: 0,
      redeemed: 0,
      expired: 0,
      cancelled: 0,
    };

    for (const row of voucherStatusRows) {
      vouchersByStatus[row._id] = row.count;
    }

    const totalFuelDistributed = distributedFuelRows[0]?.liters ?? 0;

    return res.json({
      totalVehicles,
      verifiedVehicles,
      flaggedVehicles,
      vouchersByStatus,
      activeStations,
      totalFuelDistributed,
      currentAlertLevel: latestLog?.alertLevel ?? "normal",
      lastAllocationAt: latestLog?.timestamp ?? null,
    });
  } catch (error) {
    console.error("Get admin stats error:", error.message);
    return res.status(500).json({ message: "Failed to load admin stats." });
  }
}
