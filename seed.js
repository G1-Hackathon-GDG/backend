import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Station from "./models/Station.js";
import Vehicle from "./models/Vehicle.js";
import Cycle from "./models/Cycle.js";

async function seed() {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany({}),
      Station.deleteMany({}),
      Vehicle.deleteMany({}),
      Cycle.deleteMany({}),
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
