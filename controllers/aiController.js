import Vehicle from "../models/Vehicle.js";
import Station from "../models/Station.js";
import Cycle from "../models/Cycle.js";
import Voucher from "../models/Voucher.js";
import AllocationLog from "../models/AllocationLog.js";
import { runAllocationEngine } from "../utils/allocationEngine.js";
import { callGemini } from "../utils/geminiClient.js";
import { generateQRToken } from "../utils/generateQR.js";

// Helper: build Gemini prompt from live data
function buildAllocationPrompt(vehicles, stations, cycle, context = "") {
  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  vehicles.forEach((v) => {
    if (tierCounts[v.tierLevel] !== undefined) tierCounts[v.tierLevel]++;
  });

  const stationSummary = stations.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    city: s.city,
    currentFuelLiters: s.currentFuelLiters,
    dailyCapacity: s.dailyCapacity,
    slotsPerHour: s.slotsPerHour,
    operatingHours: s.operatingHours,
  }));

  const vehicleList = vehicles.map((v) => ({
    plateNumber: v.plateNumber,
    vehicleType: v.vehicleType,
    tierLevel: v.tierLevel,
  }));

  return `
CURRENT SYSTEM STATE:
- Active Cycle: #${cycle.cycleNumber} (${cycle.startDate.toISOString().slice(0, 10)} → ${cycle.endDate.toISOString().slice(0, 10)})
- Total Fuel Available: ${cycle.totalFuelAvailable} liters
- Priority Weights: Tier1=${cycle.distributionRules?.priorityWeights?.[0] ?? 60}%, Tier2=${cycle.distributionRules?.priorityWeights?.[1] ?? 25}%, Tier3=${cycle.distributionRules?.priorityWeights?.[2] ?? 12}%, Tier4=${cycle.distributionRules?.priorityWeights?.[3] ?? 3}%

VEHICLES TO ALLOCATE (${vehicles.length} total):
- Tier 1: ${tierCounts[1]} vehicles
- Tier 2: ${tierCounts[2]} vehicles
- Tier 3: ${tierCounts[3]} vehicles
- Tier 4: ${tierCounts[4]} vehicles
Vehicle list: ${JSON.stringify(vehicleList)}

STATIONS (${stations.length} active):
${JSON.stringify(stationSummary, null, 2)}

${context ? `ADDITIONAL CONTEXT: ${context}` : ""}

Based on the Ethiopian government fuel rationing policy, generate the optimal allocation plan including time slot distribution across all stations. Assign each vehicle to exactly one station and one time slot. Respect slotsPerHour limits per station.
  `.trim();
}

// POST /api/ai/allocate
// Admin: run full AI allocation — creates all vouchers for the active cycle
export async function runAllocation(req, res) {
  try {
    // 1. Load active cycle
    const cycle = await Cycle.findOne({ status: "active" });
    if (!cycle) {
      return res
        .status(404)
        .json({ message: "No active cycle found. Create one first." });
    }

    // 2. Load all verified, unflagged vehicles
    const vehicles = await Vehicle.find({ isVerified: true, flagged: false });
    if (vehicles.length === 0) {
      return res
        .status(400)
        .json({ message: "No verified vehicles available for allocation." });
    }

    // 3. Load all active stations with fuel
    const stations = await Station.find({
      isActive: true,
      currentFuelLiters: { $gt: 0 },
    });
    if (stations.length === 0) {
      return res
        .status(400)
        .json({ message: "No active stations with fuel available." });
    }

    // 4. Run deterministic rule engine first
    const { assignments, unserved, summary } = runAllocationEngine(
      vehicles,
      cycle,
    );

    // 5. Call Gemini for time slot optimization
    const prompt = buildAllocationPrompt(vehicles, stations, cycle);
    let aiDecision;
    try {
      aiDecision = await callGemini(prompt);
    } catch (geminiError) {
      console.error("Gemini call failed:", geminiError.message);
      // Fall back — continue without AI time slot plan
      aiDecision = {
        alertLevel: "warning",
        recommendation:
          "AI time slot optimization unavailable. Default slots assigned.",
        fuelExhaustionTime: "N/A",
        canServe: summary.tierBreakdown,
        cannotServe: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 },
        timeSlotPlan: [],
        tierFuelAllocation: summary.tierFuelBudget,
      };
    }

    // 6. Build time slot lookup from Gemini plan: plateNumber → { stationId, stationName, timeSlot }
    const slotLookup = {};
    for (const stationPlan of aiDecision.timeSlotPlan || []) {
      for (const slot of stationPlan.slots || []) {
        for (const plate of slot.vehicles || []) {
          slotLookup[plate] = {
            stationId: stationPlan.stationId,
            stationName: stationPlan.stationName,
            timeSlot: slot.timeSlot,
          };
        }
      }
    }

    // 7. Fallback: round-robin stations + default slots for any vehicle Gemini missed
    const defaultTimeSlots = [
      "08:00-09:00",
      "09:00-10:00",
      "10:00-11:00",
      "11:00-12:00",
      "13:00-14:00",
      "14:00-15:00",
      "15:00-16:00",
      "16:00-17:00",
    ];
    let stationIndex = 0;
    let slotIndex = 0;

    for (const { vehicle } of assignments) {
      if (!slotLookup[vehicle.plateNumber]) {
        const station = stations[stationIndex % stations.length];
        slotLookup[vehicle.plateNumber] = {
          stationId: station._id.toString(),
          stationName: station.name,
          timeSlot: defaultTimeSlots[slotIndex % defaultTimeSlots.length],
        };
        stationIndex++;
        slotIndex++;
      }
    }

    // 8. Create voucher documents in bulk
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 1); // valid for tomorrow

    const voucherDocs = assignments.map(({ vehicle, fuelLiters }) => {
      const slotInfo = slotLookup[vehicle.plateNumber] || {
        stationId: stations[0]._id.toString(),
        stationName: stations[0].name,
        timeSlot: "08:00-09:00",
      };

      return {
        vehicleId: vehicle._id,
        plateNumber: vehicle.plateNumber,
        stationId: slotInfo.stationId,
        stationName: slotInfo.stationName,
        cycleId: cycle._id,
        fuelLiters,
        validDate,
        timeSlot: slotInfo.timeSlot,
        qrToken: generateQRToken(),
        status: "pending",
      };
    });

    const createdVouchers = await Voucher.insertMany(voucherDocs, {
      ordered: false,
    });

    // 9. Save AllocationLog
    const log = await AllocationLog.create({
      cycleId: cycle._id,
      triggeredBy: req.user.id,
      inputSummary: {
        vehicleCount: vehicles.length,
        stationCount: stations.length,
        tierCounts: summary.tierBreakdown,
      },
      totalFuelAvailable: cycle.totalFuelAvailable,
      aiDecision,
      alertLevel: aiDecision.alertLevel,
      vouchersGenerated: createdVouchers.length,
    });

    // 10. Emit real-time voucher_issued to each driver
    const io = req.app.get("io");
    if (io) {
      for (const voucher of createdVouchers) {
        io.to(voucher.vehicleId.toString()).emit("voucher_issued", {
          voucherId: voucher._id,
          plateNumber: voucher.plateNumber,
          stationName: voucher.stationName,
          fuelLiters: voucher.fuelLiters,
          timeSlot: voucher.timeSlot,
          validDate: voucher.validDate,
          qrToken: voucher.qrToken,
        });
      }

      // Emit global alert if warning or critical
      if (aiDecision.alertLevel !== "normal") {
        io.emit("shortage_alert", {
          alertLevel: aiDecision.alertLevel,
          message: aiDecision.recommendation,
        });
      }
    }

    return res.status(201).json({
      message: "Allocation complete.",
      summary: {
        ...summary,
        vouchersCreated: createdVouchers.length,
        alertLevel: aiDecision.alertLevel,
      },
      aiDecision,
      allocationLogId: log._id,
    });
  } catch (error) {
    console.error("Run allocation error:", error.message);
    return res.status(500).json({ message: "Server error during allocation." });
  }
}

// POST /api/ai/simulate-shortage
// Admin: reduce all station fuel by 50%, re-run Gemini, cancel lowest tier vouchers
export async function simulateShortage(req, res) {
  try {
    const cycle = await Cycle.findOne({ status: "active" });
    if (!cycle) {
      return res.status(404).json({ message: "No active cycle found." });
    }

    // 1. Reduce all station fuel by 50%
    const stations = await Station.find({ isActive: true });
    const updatedStations = await Promise.all(
      stations.map((s) =>
        Station.findByIdAndUpdate(
          s._id,
          {
            $set: { currentFuelLiters: Math.floor(s.currentFuelLiters * 0.5) },
          },
          { new: true },
        ),
      ),
    );

    // 2. Re-call Gemini with shortage context
    const vehicles = await Vehicle.find({ isVerified: true, flagged: false });
    const prompt = buildAllocationPrompt(
      vehicles,
      updatedStations,
      cycle,
      "SHORTAGE SIMULATION: All station fuel levels have been reduced by 50%. Re-evaluate allocation priority. Cancel lowest tier vouchers first.",
    );

    let aiDecision;
    try {
      aiDecision = await callGemini(prompt);
    } catch (geminiError) {
      console.error("Gemini shortage call failed:", geminiError.message);
      aiDecision = {
        alertLevel: "critical",
        recommendation:
          "Critical shortage. Tier 4 vouchers cancelled. AI optimization unavailable.",
        fuelExhaustionTime: "N/A",
        canServe: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 },
        cannotServe: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 },
        timeSlotPlan: [],
        tierFuelAllocation: {},
      };
    }

    // 3. Cancel Tier 4 pending vouchers first
    const tier4Vehicles = await Vehicle.find({ tierLevel: 4 }).distinct("_id");
    const cancelledTier4 = await Voucher.find({
      vehicleId: { $in: tier4Vehicles },
      cycleId: cycle._id,
      status: "pending",
    });

    await Voucher.updateMany(
      { _id: { $in: cancelledTier4.map((v) => v._id) } },
      { $set: { status: "cancelled" } },
    );

    // 4. If still critical, also cancel Tier 3
    let cancelledTier3 = [];
    if (aiDecision.alertLevel === "critical") {
      const tier3Vehicles = await Vehicle.find({ tierLevel: 3 }).distinct(
        "_id",
      );
      cancelledTier3 = await Voucher.find({
        vehicleId: { $in: tier3Vehicles },
        cycleId: cycle._id,
        status: "pending",
      });

      await Voucher.updateMany(
        { _id: { $in: cancelledTier3.map((v) => v._id) } },
        { $set: { status: "cancelled" } },
      );
    }

    const allCancelled = [...cancelledTier4, ...cancelledTier3];

    // 5. Emit Socket.io events
    const io = req.app.get("io");
    if (io) {
      // Global shortage alert to all connected clients
      io.emit("shortage_alert", {
        alertLevel: aiDecision.alertLevel,
        message: aiDecision.recommendation,
        stationFuelReduced: true,
      });

      // Individual cancellation notice to each affected driver
      for (const voucher of allCancelled) {
        io.to(voucher.vehicleId.toString()).emit("voucher_cancelled", {
          voucherId: voucher._id,
          plateNumber: voucher.plateNumber,
          reason: "Fuel shortage simulation — your voucher has been cancelled.",
        });
      }
    }

    // 6. Save log
    await AllocationLog.create({
      cycleId: cycle._id,
      triggeredBy: req.user.id,
      inputSummary: {
        type: "shortage_simulation",
        stationsAffected: stations.length,
      },
      totalFuelAvailable: updatedStations.reduce(
        (s, st) => s + st.currentFuelLiters,
        0,
      ),
      aiDecision,
      alertLevel: aiDecision.alertLevel,
      vouchersGenerated: -allCancelled.length,
    });

    return res.json({
      message: "Shortage simulation complete.",
      alertLevel: aiDecision.alertLevel,
      aiDecision,
      cancelled: {
        tier4: cancelledTier4.length,
        tier3: cancelledTier3.length,
        total: allCancelled.length,
      },
      stationFuelAfter: updatedStations.map((s) => ({
        name: s.name,
        currentFuelLiters: s.currentFuelLiters,
      })),
    });
  } catch (error) {
    console.error("Simulate shortage error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error during shortage simulation." });
  }
}

// POST /api/ai/fraud-check
// Admin: AI-assisted fraud analysis beyond the rule-based fraudChecker
export async function aiFraudCheck(req, res) {
  try {
    const flaggedVehicles = await Vehicle.find({ flagged: true }).lean();

    if (flaggedVehicles.length === 0) {
      return res.json({
        message: "No flagged vehicles to analyse.",
        analysis: null,
      });
    }

    const prompt = `
You are analysing suspicious vehicle registrations in the Ethiopian FuelPass system.
These vehicles have been flagged by the rule-based system:
${JSON.stringify(flaggedVehicles, null, 2)}

For each vehicle, provide:
1. Risk level: low | medium | high
2. Likely fraud type
3. Recommended action: keep_flagged | unflag | escalate

Respond ONLY with a JSON array, no markdown:
[{ "vehicleId": "string", "plateNumber": "string", "riskLevel": "low|medium|high", "likelyFraudType": "string", "recommendedAction": "keep_flagged|unflag|escalate", "reasoning": "string" }]
    `.trim();

    let analysis;
    try {
      const raw = await callGemini(prompt);
      analysis = Array.isArray(raw) ? raw : [raw];
    } catch {
      // callGemini validates JSON — if it fails here it returned an object not array
      analysis = flaggedVehicles.map((v) => ({
        vehicleId: v._id.toString(),
        plateNumber: v.plateNumber,
        riskLevel: "medium",
        likelyFraudType: v.flagReason || "Unknown",
        recommendedAction: "keep_flagged",
        reasoning: "AI analysis unavailable. Manual review recommended.",
      }));
    }

    return res.json({
      flaggedCount: flaggedVehicles.length,
      analysis,
    });
  } catch (error) {
    console.error("AI fraud check error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error during AI fraud check." });
  }
}

// GET /api/ai/logs
// Admin: all AllocationLog documents, most recent first
export async function getAILogs(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AllocationLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("cycleId", "cycleNumber startDate endDate"),
      AllocationLog.countDocuments(),
    ]);

    return res.json({ page, limit, total, logs });
  } catch (error) {
    console.error("Get AI logs error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while fetching AI logs." });
  }
}
