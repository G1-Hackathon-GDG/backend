import mongoose from "mongoose";
import Station from "../models/Station.js";
import Voucher from "../models/Voucher.js";
import StationLog from "../models/StationLog.js";

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function parseBooleanQuery(value) {
  if (value === undefined) return undefined;
  const normalized = String(value).toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

function parseHour(hourText, fallback) {
  const parsed = Number(String(hourText || "").split(":")[0]);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) return fallback;
  return parsed;
}

function formatHour(hour) {
  return String(hour).padStart(2, "0");
}

function getDayBounds(dateInput) {
  const referenceDate = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(referenceDate.getTime())) return null;

  const dayStart = new Date(referenceDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return {
    dayStart,
    dayEnd,
    isoDate: dayStart.toISOString().slice(0, 10),
  };
}

function buildStationSlots(station, reservedCounts) {
  const openHour = parseHour(station.operatingHours?.open, 6);
  let closeHour = parseHour(station.operatingHours?.close, 20);
  if (closeHour <= openHour) closeHour = openHour + 1;

  const slots = [];
  for (let hour = openHour; hour < closeHour; hour += 1) {
    const slotLabel = `${formatHour(hour)}:00-${formatHour(hour + 1)}:00`;
    const reserved = reservedCounts[slotLabel] || 0;
    const capacity = station.slotsPerHour || 0;

    slots.push({
      timeSlot: slotLabel,
      capacity,
      reserved,
      available: Math.max(capacity - reserved, 0),
    });
  }

  return slots;
}

export async function getStations(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    const activeQuery = parseBooleanQuery(req.query.active);
    if (activeQuery !== undefined) {
      filter.isActive = activeQuery;
    }

    if (req.query.city) {
      filter.city = new RegExp(String(req.query.city).trim(), "i");
    }

    const [stations, total] = await Promise.all([
      Station.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Station.countDocuments(filter),
    ]);

    return res.json({
      page,
      limit,
      total,
      stations,
    });
  } catch (error) {
    console.error("Get stations error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while fetching stations." });
  }
}

export async function getStationById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid station ID." });
    }

    const station = await Station.findById(id);
    if (!station) {
      return res.status(404).json({ message: "Station not found." });
    }

    return res.json(station);
  } catch (error) {
    console.error("Get station by ID error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while fetching station." });
  }
}

export async function getStationSlots(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid station ID." });
    }

    const station = await Station.findById(id).select(
      "name operatingHours slotsPerHour",
    );
    if (!station) {
      return res.status(404).json({ message: "Station not found." });
    }

    const bounds = getDayBounds(req.query.date);
    if (!bounds) {
      return res.status(400).json({ message: "Invalid date query format." });
    }

    const reservations = await Voucher.aggregate([
      {
        $match: {
          stationId: new mongoose.Types.ObjectId(id),
          validDate: { $gte: bounds.dayStart, $lt: bounds.dayEnd },
          status: { $in: ["pending", "redeemed"] },
        },
      },
      {
        $group: {
          _id: "$timeSlot",
          reserved: { $sum: 1 },
        },
      },
    ]);

    const reservedCounts = reservations.reduce((acc, reservation) => {
      acc[reservation._id] = reservation.reserved;
      return acc;
    }, {});

    const slots = buildStationSlots(station, reservedCounts);

    return res.json({
      stationId: station._id,
      stationName: station.name,
      date: bounds.isoDate,
      slots,
    });
  } catch (error) {
    console.error("Get station slots error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while fetching slots." });
  }
}

export async function getStationLog(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid station ID." });
    }

    const stationExists = await Station.exists({ _id: id });
    if (!stationExists) {
      return res.status(404).json({ message: "Station not found." });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [fuelEvents, redeemedVouchers] = await Promise.all([
      StationLog.find({ stationId: id }).sort({ createdAt: -1 }).lean(),
      Voucher.find({ stationId: id, status: "redeemed" })
        .select("fuelLiters plateNumber redeemedAt qrToken status")
        .sort({ redeemedAt: -1, updatedAt: -1 })
        .lean(),
    ]);

    const fuelEventItems = fuelEvents.map((event) => ({
      id: event._id.toString(),
      source: "station_log",
      eventType: event.eventType,
      timestamp: event.createdAt,
      litersDelta: event.litersDelta,
      beforeLiters: event.beforeLiters,
      afterLiters: event.afterLiters,
      voucherId: event.voucherId || null,
      actorUserId: event.actorUserId || null,
      notes: event.notes || "",
    }));

    const voucherEventItems = redeemedVouchers.map((voucher) => ({
      id: voucher._id.toString(),
      source: "voucher",
      eventType: "voucher_redeem",
      timestamp: voucher.redeemedAt || voucher.updatedAt,
      litersDelta: -Math.abs(voucher.fuelLiters || 0),
      beforeLiters: null,
      afterLiters: null,
      voucherId: voucher._id,
      actorUserId: null,
      notes: `Redeemed voucher for plate ${voucher.plateNumber}.`,
      qrToken: voucher.qrToken,
    }));

    const combinedEvents = [...fuelEventItems, ...voucherEventItems].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const paginatedEvents = combinedEvents.slice(skip, skip + limit);

    return res.json({
      page,
      limit,
      total: combinedEvents.length,
      events: paginatedEvents,
    });
  } catch (error) {
    console.error("Get station log error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while fetching station log." });
  }
}

export async function createStation(req, res) {
  try {
    const {
      name,
      city,
      location,
      currentFuelLiters,
      dailyCapacity,
      slotsPerHour,
    } = req.body;

    if (!name?.trim() || !city?.trim()) {
      return res
        .status(400)
        .json({ message: "Station name and city are required." });
    }

    const parsedDailyCapacity = Number(dailyCapacity);
    if (!Number.isFinite(parsedDailyCapacity) || parsedDailyCapacity <= 0) {
      return res
        .status(400)
        .json({ message: "dailyCapacity must be a positive number." });
    }

    const station = await Station.create({
      name: String(name).trim(),
      city: String(city).trim(),
      location: location ? String(location).trim() : "",
      currentFuelLiters: Number(currentFuelLiters) || 0,
      dailyCapacity: parsedDailyCapacity,
      slotsPerHour: Number(slotsPerHour) || 30,
    });

    return res.status(201).json({
      message: "Station created successfully.",
      station,
    });
  } catch (error) {
    console.error("Create station error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while creating station." });
  }
}

export async function updateStationFuel(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid station ID." });
    }

    const operation = String(req.body?.operation || "")
      .trim()
      .toLowerCase();
    if (!["increment", "decrement"].includes(operation)) {
      return res.status(400).json({
        message: "operation must be either 'increment' or 'decrement'.",
      });
    }

    const liters = Number(req.body?.liters);
    if (!Number.isFinite(liters) || liters <= 0) {
      return res
        .status(400)
        .json({ message: "liters must be a positive number." });
    }

    let station;
    let beforeLiters;

    if (operation === "decrement") {
      station = await Station.findOneAndUpdate(
        { _id: id, currentFuelLiters: { $gte: liters } },
        { $inc: { currentFuelLiters: -liters } },
        { new: true, runValidators: true },
      );

      if (!station) {
        const stationExists = await Station.exists({ _id: id });
        if (!stationExists) {
          return res.status(404).json({ message: "Station not found." });
        }

        return res.status(400).json({
          message: "Insufficient station fuel for decrement operation.",
        });
      }

      beforeLiters = station.currentFuelLiters + liters;
    } else {
      station = await Station.findByIdAndUpdate(
        id,
        { $inc: { currentFuelLiters: liters } },
        { new: true, runValidators: true },
      );

      if (!station) {
        return res.status(404).json({ message: "Station not found." });
      }

      beforeLiters = station.currentFuelLiters - liters;
    }

    const fuelEvent = await StationLog.create({
      stationId: id,
      eventType:
        operation === "increment" ? "fuel_increment" : "fuel_decrement",
      litersDelta: operation === "increment" ? liters : -liters,
      beforeLiters,
      afterLiters: station.currentFuelLiters,
      voucherId: req.body?.voucherId || undefined,
      actorUserId: req.user?.id || undefined,
      notes: String(req.body?.notes || req.body?.reason || "").trim(),
    });

    return res.json({
      message: "Station fuel updated successfully.",
      station,
      fuelEvent,
    });
  } catch (error) {
    console.error("Update station fuel error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while updating fuel." });
  }
}

export async function toggleStationStatus(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid station ID." });
    }

    const station = await Station.findById(id);
    if (!station) {
      return res.status(404).json({ message: "Station not found." });
    }

    const explicitStatus =
      req.body?.isActive === undefined ? undefined : Boolean(req.body.isActive);
    station.isActive = explicitStatus ?? !station.isActive;
    await station.save();

    return res.json({
      message: `Station is now ${station.isActive ? "active" : "inactive"}.`,
      station,
    });
  } catch (error) {
    console.error("Toggle station status error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while toggling station." });
  }
}
