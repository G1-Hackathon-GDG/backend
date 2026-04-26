import Cycle from "../models/Cycle.js";

export async function createCycle(req, res) {
  try {
    const { startDate, endDate, totalFuelAvailable, distributionRules } = req.body;

    if (!startDate || !endDate || totalFuelAvailable == null) {
      return res.status(400).json({
        message: "startDate, endDate, and totalFuelAvailable are required.",
      });
    }

    const activeCycle = await Cycle.findOne({ status: "active" });
    if (activeCycle) {
      return res
        .status(409)
        .json({ message: "An active cycle already exists. Close it first." });
    }

    const lastCycle = await Cycle.findOne().sort({ cycleNumber: -1 }).lean();
    const cycleNumber = (lastCycle?.cycleNumber || 0) + 1;

    const cycle = await Cycle.create({
      cycleNumber,
      startDate,
      endDate,
      totalFuelAvailable,
      distributionRules,
      status: "active",
    });

    return res.status(201).json(cycle);
  } catch (error) {
    console.error("Create cycle error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function getActiveCycle(req, res) {
  try {
    const cycle = await Cycle.findOne({ status: "active" }).lean();
    return res.json({ cycle: cycle || null });
  } catch (error) {
    console.error("Get active cycle error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function closeCycle(req, res) {
  try {
    const { id } = req.params;
    const cycle = await Cycle.findById(id);

    if (!cycle) {
      return res.status(404).json({ message: "Cycle not found." });
    }

    cycle.status = "closed";
    await cycle.save();

    return res.json({ message: "Cycle closed successfully.", cycle });
  } catch (error) {
    console.error("Close cycle error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}
