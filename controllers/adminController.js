import Vehicle from "../models/Vehicle.js";
import Station from "../models/Station.js";
import Voucher from "../models/Voucher.js";
import AllocationLog from "../models/AllocationLog.js";

export async function getAdminStats(_req, res) {
  try {
    const [vehicleStatsRows, voucherStatsRows, stationStatsRows, latestLog] =
      await Promise.all([
        Vehicle.aggregate([
          {
            $group: {
              _id: null,
              totalVehicles: { $sum: 1 },
              verifiedVehicles: {
                $sum: {
                  $cond: [{ $eq: ["$isVerified", true] }, 1, 0],
                },
              },
              flaggedVehicles: {
                $sum: {
                  $cond: [{ $eq: ["$flagged", true] }, 1, 0],
                },
              },
            },
          },
        ]),
        Voucher.aggregate([
          {
            $facet: {
              byStatus: [
                {
                  $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                  },
                },
              ],
              fuelDistributed: [
                { $match: { status: "redeemed" } },
                {
                  $group: {
                    _id: null,
                    liters: { $sum: "$fuelLiters" },
                  },
                },
              ],
            },
          },
        ]),
        Station.aggregate([{ $match: { isActive: true } }, { $count: "count" }]),
        AllocationLog.findOne()
          .sort({ timestamp: -1 })
          .select("alertLevel timestamp"),
      ]);

    const vehicleStats = vehicleStatsRows[0] ?? {
      totalVehicles: 0,
      verifiedVehicles: 0,
      flaggedVehicles: 0,
    };

    const voucherStats = voucherStatsRows[0] ?? {
      byStatus: [],
      fuelDistributed: [],
    };

    const vouchersByStatus = {
      pending: 0,
      redeemed: 0,
      expired: 0,
      cancelled: 0,
    };

    for (const row of voucherStats.byStatus) {
      if (row._id in vouchersByStatus) {
        vouchersByStatus[row._id] = row.count;
      }
    }

    const totalFuelDistributed = voucherStats.fuelDistributed[0]?.liters ?? 0;
    const activeStations = stationStatsRows[0]?.count ?? 0;

    return res.json({
      totalVehicles: vehicleStats.totalVehicles,
      verifiedVehicles: vehicleStats.verifiedVehicles,
      flaggedVehicles: vehicleStats.flaggedVehicles,
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
