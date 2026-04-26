const TIER_WEIGHTS = {
  1: 60,
  2: 25,
  3: 12,
  4: 3,
};

function getVehicleMaxLiters(vehicle, maxLitersPerVehicle = {}) {
  const tierKey = vehicle.vehicleType || String(vehicle.tierLevel || "");
  const mappedMax = maxLitersPerVehicle[tierKey];
  if (Number.isFinite(Number(mappedMax))) {
    return Number(mappedMax);
  }

  if (vehicle.tierLevel === 1) return 999999;
  if (vehicle.tierLevel === 2) return 200;
  if (vehicle.tierLevel === 3) return 50;
  return 20;
}

export function buildAllocationPlan({
  vehicles,
  totalFuelAvailable,
  maxLitersPerVehicle = {},
}) {
  const groupedVehicles = new Map([
    [1, []],
    [2, []],
    [3, []],
    [4, []],
  ]);

  for (const vehicle of vehicles) {
    const tier = Number(vehicle.tierLevel) || 4;
    if (!groupedVehicles.has(tier)) {
      groupedVehicles.set(tier, []);
    }
    groupedVehicles.get(tier).push(vehicle);
  }

  const allocations = [];
  let unallocatedFuel = Number(totalFuelAvailable) || 0;

  for (const tier of [1, 2, 3, 4]) {
    const tierVehicles = groupedVehicles.get(tier) || [];
    if (!tierVehicles.length || unallocatedFuel <= 0) continue;

    const tierPool = Math.floor(
      ((Number(totalFuelAvailable) || 0) * TIER_WEIGHTS[tier]) / 100,
    );
    let remainingTierPool = Math.min(tierPool, unallocatedFuel);

    for (let index = 0; index < tierVehicles.length; index += 1) {
      const vehicle = tierVehicles[index];
      const vehiclesLeft = tierVehicles.length - index;
      const fairShare = Math.max(
        Math.floor(remainingTierPool / vehiclesLeft),
        0,
      );
      const allocatedLiters = Math.min(
        remainingTierPool,
        fairShare || remainingTierPool,
        getVehicleMaxLiters(vehicle, maxLitersPerVehicle),
      );

      if (allocatedLiters <= 0) continue;

      allocations.push({
        vehicle,
        liters: allocatedLiters,
        tier,
      });

      remainingTierPool -= allocatedLiters;
      unallocatedFuel -= allocatedLiters;
    }
  }

  return {
    allocations,
    unallocatedFuel: Math.max(unallocatedFuel, 0),
  };
}
