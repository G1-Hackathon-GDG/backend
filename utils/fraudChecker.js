import Vehicle from "../models/Vehicle.js";

const TIER_MAP = {
  fuel_tanker: 1,
  manufacturing: 1,
  government_project: 1,
  essential_goods: 2,
  agricultural_tractor: 2,
  urban_public_transport: 3,
  diesel_public_transport: 3,
  private: 4,
};

const BLOCKING_RULE_CODES = new Set(["DUPLICATE_PLATE", "PHONE_ABUSE"]);

export function normalizePlate(plateNumber = "") {
  return String(plateNumber).trim().toUpperCase();
}

export function normalizePhone(phone = "") {
  return String(phone).trim().replace(/\s+/g, "");
}

function parseClaimedTier(claimedTier) {
  if (claimedTier === null || claimedTier === undefined || claimedTier === "") {
    return null;
  }

  const parsed = Number(claimedTier);
  return Number.isInteger(parsed) ? parsed : null;
}

async function checkDuplicatePlate(plateNumber) {
  const normalizedPlate = normalizePlate(plateNumber);
  const existingVehicle = normalizedPlate
    ? await Vehicle.findOne({ plateNumber: normalizedPlate }).select("_id")
    : null;

  return {
    code: "DUPLICATE_PLATE",
    hit: Boolean(existingVehicle),
    blocking: true,
    message: existingVehicle
      ? "Plate number already exists."
      : "Plate number is unique.",
    details: {
      normalizedPlate,
    },
  };
}

async function checkPhoneAbuse(phone) {
  const normalizedPhone = normalizePhone(phone);
  const registrationCount = normalizedPhone
    ? await Vehicle.countDocuments({ phone: normalizedPhone })
    : 0;

  return {
    code: "PHONE_ABUSE",
    hit: registrationCount >= 3,
    blocking: true,
    message:
      registrationCount >= 3
        ? "Phone has reached abuse threshold."
        : "Phone registration count is below threshold.",
    details: {
      normalizedPhone,
      registrationCount,
      threshold: 3,
    },
  };
}

function checkSuspiciousTierClaim(vehicleType, claimedTier) {
  const expectedTier = TIER_MAP[vehicleType] ?? null;
  const parsedClaimedTier = parseClaimedTier(claimedTier);

  const hit =
    expectedTier !== null &&
    parsedClaimedTier !== null &&
    parsedClaimedTier !== expectedTier;

  return {
    code: "SUSPICIOUS_TIER_CLAIM",
    hit,
    blocking: false,
    message: hit
      ? "Claimed tier does not match expected vehicle tier."
      : "Tier claim is not suspicious.",
    details: {
      vehicleType,
      expectedTier,
      claimedTier: parsedClaimedTier,
    },
  };
}

export async function runFraudChecks({
  plateNumber,
  phone,
  vehicleType,
  claimedTier,
}) {
  const duplicatePlateResult = await checkDuplicatePlate(plateNumber);
  const phoneAbuseResult = await checkPhoneAbuse(phone);
  const suspiciousTierResult = checkSuspiciousTierClaim(vehicleType, claimedTier);

  const ruleResults = [
    duplicatePlateResult,
    phoneAbuseResult,
    suspiciousTierResult,
  ];
  const triggeredRules = ruleResults.filter((rule) => rule.hit);
  const shouldBlock = triggeredRules.some((rule) =>
    BLOCKING_RULE_CODES.has(rule.code),
  );

  return {
    hasFraud: triggeredRules.length > 0,
    shouldBlock,
    triggeredRules,
    ruleResults,
  };
}

