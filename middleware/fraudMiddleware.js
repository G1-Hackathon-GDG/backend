import {
  normalizePhone,
  normalizePlate,
  runFraudChecks,
} from "../utils/fraudChecker.js";

const REQUIRED_FIELDS = ["plateNumber", "phone", "vehicleType"];

function getMissingFields(body = {}) {
  return REQUIRED_FIELDS.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || String(value).trim() === "";
  });
}

export async function fraudMiddleware(req, res, next) {
  try {
    const missingFields = getMissingFields(req.body);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Missing required fields for fraud check.",
        missingFields,
      });
    }

    const normalizedInput = {
      plateNumber: normalizePlate(req.body.plateNumber),
      phone: normalizePhone(req.body.phone),
      vehicleType: String(req.body.vehicleType).trim(),
      claimedTier: req.body.claimedTier,
    };

    const fraudResult = await runFraudChecks(normalizedInput);

    req.body.plateNumber = normalizedInput.plateNumber;
    req.body.phone = normalizedInput.phone;
    req.body.vehicleType = normalizedInput.vehicleType;
    req.fraudResult = fraudResult;

    if (fraudResult.shouldBlock) {
      return res.status(409).json({
        message: "Vehicle registration blocked by fraud checks.",
        fraudResult,
      });
    }

    return next();
  } catch (error) {
    console.error("Fraud middleware error:", error.message);
    return res.status(500).json({
      message: "Server error while running fraud checks.",
    });
  }
}

export default fraudMiddleware;

