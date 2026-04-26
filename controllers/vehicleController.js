import mongoose from "mongoose";
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function getSuspiciousTierHit(fraudResult) {
  if (!fraudResult?.triggeredRules) return null;
  return fraudResult.triggeredRules.find(
    (rule) => rule.code === "SUSPICIOUS_TIER_CLAIM",
  );
}

function handleDuplicateKeyError(error, res) {
  if (error?.code !== 11000) return false;

  const duplicateField = Object.keys(error.keyPattern || {})[0];
  const fieldName = duplicateField || "field";

  res.status(409).json({
    message: `A vehicle with this ${fieldName} already exists.`,
  });
  return true;
}

export async function registerVehicle(req, res) {
  try {
    const user = await User.findById(req.user.id).select("name role");
    if (!user) {
      return res.status(404).json({ message: "Driver account not found." });
    }

    const suspiciousTierRule = getSuspiciousTierHit(req.fraudResult);
    const shouldFlag = Boolean(suspiciousTierRule);

    const vehicle = await Vehicle.create({
      ownerId: user._id,
      ownerName: user.name,
      phone: req.body.phone,
      plateNumber: req.body.plateNumber,
      vehicleType: req.body.vehicleType,
      flagged: shouldFlag,
      flagReason: shouldFlag
        ? suspiciousTierRule.message
        : req.body.flagReason || "",
    });

    return res.status(201).json({
      message: "Vehicle registered successfully.",
      vehicle,
      fraudResult: req.fraudResult,
    });
  } catch (error) {
    if (handleDuplicateKeyError(error, res)) return;
    console.error("Register vehicle error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while registering vehicle." });
  }
}

export async function getMyVehicles(req, res) {
  try {
    const vehicles = await Vehicle.find({ ownerId: req.user.id }).sort({
      registeredAt: -1,
    });

    return res.json({
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("Get my vehicles error:", error.message);
    return res.status(500).json({ message: "Server error while fetching vehicles." });
  }
}

export async function getAllVehicles(_req, res) {
  try {
    const vehicles = await Vehicle.find().sort({ registeredAt: -1 });
    return res.json({
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("Get all vehicles error:", error.message);
    return res.status(500).json({ message: "Server error while fetching vehicles." });
  }
}

export async function getVehicleById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid vehicle ID." });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found." });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = vehicle.ownerId.toString() === req.user.id;
    if (!isAdmin && !isOwner) {
      return res
        .status(403)
        .json({ message: "Access denied for this vehicle record." });
    }

    return res.json(vehicle);
  } catch (error) {
    console.error("Get vehicle by ID error:", error.message);
    return res.status(500).json({ message: "Server error while fetching vehicle." });
  }
}

export async function verifyVehicle(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid vehicle ID." });
    }

    const isVerified =
      req.body?.isVerified === undefined ? true : Boolean(req.body.isVerified);

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { isVerified },
      { new: true, runValidators: true },
    );

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found." });
    }

    return res.json({
      message: `Vehicle verification updated to ${isVerified}.`,
      vehicle,
    });
  } catch (error) {
    console.error("Verify vehicle error:", error.message);
    return res.status(500).json({ message: "Server error while verifying vehicle." });
  }
}

export async function flagVehicle(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid vehicle ID." });
    }

    const reason = String(req.body?.reason || "Flagged by admin review.").trim();
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { flagged: true, flagReason: reason },
      { new: true, runValidators: true },
    );

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found." });
    }

    return res.json({
      message: "Vehicle flagged successfully.",
      vehicle,
    });
  } catch (error) {
    console.error("Flag vehicle error:", error.message);
    return res.status(500).json({ message: "Server error while flagging vehicle." });
  }
}

export async function unflagVehicle(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid vehicle ID." });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { flagged: false, flagReason: "" },
      { new: true, runValidators: true },
    );

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found." });
    }

    return res.json({
      message: "Vehicle unflagged successfully.",
      vehicle,
    });
  } catch (error) {
    console.error("Unflag vehicle error:", error.message);
    return res.status(500).json({ message: "Server error while unflagging vehicle." });
  }
}

