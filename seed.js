import "dotenv/config";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Station from "./models/Station.js";
import Cycle from "./models/Cycle.js";
import Vehicle from "./models/Vehicle.js";
import Voucher from "./models/Voucher.js";
import { generateQRToken } from "./utils/generateQR.js";

async function ensureUser({ name, email, password, role, stationId }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name, email, password, role, stationId });
  }
  return user;
}

async function runSeed() {
  await connectDB();

  const station = await Station.findOneAndUpdate(
    { name: "Bole Main Station" },
    {
      name: "Bole Main Station",
      city: "Addis Ababa",
      location: "Bole Road",
      currentFuelLiters: 10000,
      dailyCapacity: 12000,
      slotsPerHour: 30,
      isActive: true,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  await ensureUser({
    name: "FuelPass Admin",
    email: "admin@fuelpass.local",
    password: "admin123",
    role: "admin",
  });

  await ensureUser({
    name: "Bole Staff",
    email: "staff@fuelpass.local",
    password: "staff123",
    role: "staff",
    stationId: station._id,
  });

  const driver = await ensureUser({
    name: "Demo Driver",
    email: "driver@fuelpass.local",
    password: "driver123",
    role: "driver",
  });

  const vehicle = await Vehicle.findOneAndUpdate(
    { plateNumber: "AA-12345" },
    {
      ownerId: driver._id,
      ownerName: "Demo Driver",
      phone: "0911000001",
      plateNumber: "AA-12345",
      vehicleType: "urban_public_transport",
      isVerified: true,
      flagged: false,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  let cycle = await Cycle.findOne({ status: "active" });
  if (!cycle) {
    const latest = await Cycle.findOne().sort({ cycleNumber: -1 }).lean();
    cycle = await Cycle.create({
      cycleNumber: (latest?.cycleNumber || 0) + 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalFuelAvailable: 50000,
      status: "active",
    });
  }

  const existingPending = await Voucher.findOne({
    vehicleId: vehicle._id,
    cycleId: cycle._id,
    status: "pending",
  });

  if (!existingPending) {
    const voucher = await Voucher.create({
      vehicleId: vehicle._id,
      plateNumber: vehicle.plateNumber,
      stationId: station._id,
      stationName: station.name,
      cycleId: cycle._id,
      fuelLiters: 50,
      validDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      timeSlot: "09:00 - 10:00",
      qrToken: generateQRToken(),
      status: "pending",
    });

    console.log("Created test voucher token:", voucher.qrToken);
  } else {
    console.log("Existing pending voucher token:", existingPending.qrToken);
  }

  const issueRoutePayload = {
    vehicleId: String(vehicle._id),
    stationId: String(station._id),
    cycleId: String(cycle._id),
    fuelLiters: 50,
    validDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    timeSlot: "09:00 - 10:00",
  };

  console.log("\nTemporary IDs for /api/vouchers/issue:");
  console.log("vehicleId:", issueRoutePayload.vehicleId);
  console.log("stationId:", issueRoutePayload.stationId);
  console.log("cycleId:", issueRoutePayload.cycleId);
  console.log("\nCopy this request body:");
  console.log(JSON.stringify(issueRoutePayload, null, 2));

  console.log("Seed complete.");
  process.exit(0);
}

runSeed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
