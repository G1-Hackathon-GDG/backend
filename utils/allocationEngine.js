const TIER_WEIGHTS = { 1: 0.6, 2: 0.25, 3: 0.12, 4: 0.03 };

const MAX_LITERS_DEFAULT = {
  fuel_tanker: 999999,
  manufacturing: 200,
  government_project: 150,
  essential_goods: 60,
  agricultural_tractor: 80,
  urban_public_transport: 50,
  diesel_public_transport: 50,
  private: 20,
};

/**
 * Group vehicles by tier level.
 */
function groupByTier(vehicles) {
  const groups = { 1: [], 2: [], 3: [], 4: [] };
  for (const v of vehicles) {
    const tier = v.tierLevel;
    if (groups[tier]) groups[tier].push(v);
  }
  return groups;
}

/**
 * Get max liters for a vehicle type from cycle rules or fallback defaults.
 */
function getMaxLiters(vehicleType, distributionRules) {
  const ruleMap = distributionRules?.maxLitersPerVehicle;
  if (ruleMap) {
    // Map can be a plain object or Mongoose Map
    const val =
      typeof ruleMap.get === "function"
        ? ruleMap.get(vehicleType)
        : ruleMap[vehicleType];
    if (val !== undefined) return Number(val);
  }
  return MAX_LITERS_DEFAULT[vehicleType] ?? 20;
}

/**
 * Main allocation function.
 *
 * @param {Array}  vehicles  - verified, unflagged vehicles
 * @param {Object} cycle     - active cycle with totalFuelAvailable + distributionRules
 * @returns {Object}         - { tierAllocations, assignments, unserved, summary }
 */
export function runAllocationEngine(vehicles, cycle) {
  const totalFuel = cycle.totalFuelAvailable;
  const weights = cycle.distributionRules?.priorityWeights || [60, 25, 12, 3];

  // Convert weights array to tier keyed object (normalize to decimals)
  const tierFuelBudget = {
    1: (weights[0] / 100) * totalFuel,
    2: (weights[1] / 100) * totalFuel,
    3: (weights[2] / 100) * totalFuel,
    4: (weights[3] / 100) * totalFuel,
  };

  const groups = groupByTier(vehicles);
  const assignments = []; // { vehicle, fuelLiters }
  const unserved = []; // { vehicle, reason }

  let surplusFuel = 0;

  // Process tiers 1 → 4 in order
  for (const tier of [1, 2, 3, 4]) {
    let budget = tierFuelBudget[tier] + surplusFuel;
    surplusFuel = 0;

    const tierVehicles = groups[tier] || [];

    if (tierVehicles.length === 0) {
      // No vehicles in this tier — carry full budget as surplus to next tier
      surplusFuel = budget;
      continue;
    }

    let tierSpent = 0;

    for (const vehicle of tierVehicles) {
      const maxLiters = getMaxLiters(
        vehicle.vehicleType,
        cycle.distributionRules,
      );
      const canGive = Math.min(maxLiters, budget - tierSpent);

      if (canGive <= 0) {
        unserved.push({
          vehicle,
          reason: "Insufficient fuel budget for this tier.",
        });
        continue;
      }

      assignments.push({ vehicle, fuelLiters: Math.floor(canGive) });
      tierSpent += canGive;
    }

    // Any leftover budget in this tier becomes surplus for the next
    surplusFuel = Math.max(budget - tierSpent, 0);
  }

  const summary = {
    totalFuel,
    totalVehicles: vehicles.length,
    served: assignments.length,
    unserved: unserved.length,
    fuelAllocated: assignments.reduce((s, a) => s + a.fuelLiters, 0),
    tierBreakdown: {
      tier1: assignments.filter((a) => a.vehicle.tierLevel === 1).length,
      tier2: assignments.filter((a) => a.vehicle.tierLevel === 2).length,
      tier3: assignments.filter((a) => a.vehicle.tierLevel === 3).length,
      tier4: assignments.filter((a) => a.vehicle.tierLevel === 4).length,
    },
    tierFuelBudget,
  };

  return { assignments, unserved, summary };
}
