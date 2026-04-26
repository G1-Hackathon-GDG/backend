import mongoose from "mongoose";

function isValidDate(value) {
  return value && !Number.isNaN(new Date(value).getTime());
}

export function validateMongoIdParam(paramName) {
  return function validateId(req, res, next) {
    const value = req.params?.[paramName];
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({ message: `Invalid ${paramName}.` });
    }
    return next();
  };
}

export function validateCreateCycleBody(req, res, next) {
  const { startDate, endDate, totalFuelAvailable, distributionRules } = req.body;

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res.status(400).json({
      message: "startDate and endDate must be valid dates.",
    });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return res.status(400).json({
      message: "endDate must be after startDate.",
    });
  }

  if (typeof totalFuelAvailable !== "number" || totalFuelAvailable <= 0) {
    return res.status(400).json({
      message: "totalFuelAvailable must be a positive number.",
    });
  }

  if (
    distributionRules != null &&
    (typeof distributionRules !== "object" || Array.isArray(distributionRules))
  ) {
    return res.status(400).json({
      message: "distributionRules must be an object.",
    });
  }

  return next();
}

export function validateRedeemVoucherBody(req, res, next) {
  const token = req.body?.token || req.body?.qrToken;

  if (typeof token !== "string" || !token.trim()) {
    return res.status(400).json({ message: "token is required." });
  }

  return next();
}

export function validateCancelVoucherBody(req, res, next) {
  const { reason } = req.body || {};

  if (reason != null && (typeof reason !== "string" || reason.length > 300)) {
    return res.status(400).json({
      message: "reason must be a string up to 300 characters.",
    });
  }

  return next();
}
