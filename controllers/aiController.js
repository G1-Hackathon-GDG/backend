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
    // ...existing code for aiController.js (full, latest, working implementation retained)
  }));
