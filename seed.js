import "dotenv/config";
<<<<<<< HEAD
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Station from "./models/Station.js";
import Vehicle from "./models/Vehicle.js";
import Cycle from "./models/Cycle.js";
import Voucher from "./models/Voucher.js";
import AllocationLog from "./models/AllocationLog.js";

async function seed() {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany({}),
      Station.deleteMany({}),
      Vehicle.deleteMany({}),
      Cycle.deleteMany({}),
      Voucher.deleteMany({}),
      AllocationLog.deleteMany({}),
    ]);

    const stations = await Station.insertMany([
      {
        name: "Bole Fuel Hub",
        city: "Addis Ababa",
        location: "Bole Sub City, Africa Ave",
        currentFuelLiters: 120000,
        dailyCapacity: 40000,
        operatingHours: { open: "06:00", close: "22:00" },
        isActive: true,
      },
      {
        name: "Piassa Central Station",
        city: "Addis Ababa",
        location: "Arada, Piassa",
        currentFuelLiters: 90000,
        dailyCapacity: 30000,
        operatingHours: { open: "06:00", close: "20:00" },
        isActive: true,
      },
    ]);

    const adminUser = await User.create({
      name: "FuelPass Admin",
      email: "admin@fuelpass.et",
      password: "Admin@123",
      role: "admin",
    });

    const [staffOne, staffTwo] = await User.create([
      {
        name: "Bole Staff",
        email: "staff.bole@fuelpass.et",
        password: "Staff@123",
        role: "staff",
        stationId: stations[0]._id,
      },
      {
        name: "Piassa Staff",
        email: "staff.piassa@fuelpass.et",
        password: "Staff@123",
        role: "staff",
        stationId: stations[1]._id,
      },
    ]);

    const drivers = await User.create([
      {
        name: "Tanker Driver",
        email: "driver.tanker@fuelpass.et",
        password: "Driver@123",
        role: "driver",
      },
      {
        name: "Bus Driver",
        email: "driver.bus@fuelpass.et",
        password: "Driver@123",
        role: "driver",
      },
      {
        name: "Private Driver 1",
        email: "driver.private1@fuelpass.et",
        password: "Driver@123",
        role: "driver",
      },
      {
        name: "Private Driver 2",
        email: "driver.private2@fuelpass.et",
        password: "Driver@123",
        role: "driver",
      },
    ]);

    const [tankerDriver, busDriver, privateDriverOne, privateDriverTwo] =
      drivers;

    await Vehicle.insertMany([
      {
        ownerId: tankerDriver._id,
        ownerName: tankerDriver.name,
        phone: "+251911000001",
        plateNumber: "AA-50001",
        vehicleType: "fuel_tanker",
        isVerified: true,
      },
      {
        ownerId: busDriver._id,
        ownerName: busDriver.name,
        phone: "+251911000002",
        plateNumber: "AA-50002",
        vehicleType: "urban_public_transport",
        isVerified: true,
      },
      {
        ownerId: privateDriverOne._id,
        ownerName: privateDriverOne.name,
        phone: "+251911000003",
        plateNumber: "AA-50003",
        vehicleType: "private",
        isVerified: true,
      },
      {
        ownerId: privateDriverTwo._id,
        ownerName: privateDriverTwo.name,
        phone: "+251911000004",
        plateNumber: "AA-50004",
        vehicleType: "private",
        isVerified: false,
      },
    ]);

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 14);

    await Cycle.create({
      cycleNumber: 1,
      startDate: now,
      endDate,
      totalFuelAvailable: 210000,
      distributionRules: {
        priorityWeights: [60, 25, 12, 3],
      },
      status: "active",
    });

    console.log("Seed complete.");
    console.log("Users:");
    console.log(`- Admin: ${adminUser.email} / Admin@123`);
    console.log(`- Staff: ${staffOne.email} / Staff@123`);
    console.log(`- Staff: ${staffTwo.email} / Staff@123`);
    console.log(
      "- Drivers: driver.tanker@fuelpass.et, driver.bus@fuelpass.et, driver.private1@fuelpass.et, driver.private2@fuelpass.et / Driver@123",
    );

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
=======
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
>>>>>>> 617a9a4d4302f6f28d3a23bda9af34bfb745b931
