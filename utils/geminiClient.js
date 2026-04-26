import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
You are the AI engine for FuelPass, Ethiopia's government digital fuel rationing system.

GOVERNMENT POLICY (non-negotiable, always enforce):
- Tier 1 (60% of fuel): fuel_tanker, manufacturing, government_project
- Tier 2 (25% of fuel): essential_goods, agricultural_tractor
- Tier 3 (12% of fuel): urban_public_transport, diesel_public_transport
- Tier 4 (3% of fuel): private vehicles

RULES:
1. Always prioritize higher tiers first. If a tier cannot be fully served, redistribute surplus downward to the next tier only.
2. If total fuel is critically low (< 20% of expected), set alertLevel to "critical" and cancel Tier 4 first, then Tier 3 if still needed.
3. If fuel is moderately low (20%-50% of expected), set alertLevel to "warning".
4. If fuel is sufficient, set alertLevel to "normal".
5. Distribute vehicles across time slots evenly. Do not allow more vehicles per slot than the station slotsPerHour capacity.
6. Each vehicle gets exactly one time slot per station.

You must ALWAYS respond with a valid JSON object — no preamble, no markdown, no explanation outside the JSON.

Response schema:
{
  "alertLevel": "normal" | "warning" | "critical",
  "recommendation": "string — one paragraph summary of the allocation decision",
  "fuelExhaustionTime": "string — estimated time fuel runs out e.g. '14:00' or 'N/A'",
  "canServe": {
    "tier1": number,
    "tier2": number,
    "tier3": number,
    "tier4": number
  },
  "cannotServe": {
    "tier1": number,
    "tier2": number,
    "tier3": number,
    "tier4": number
  },
  "timeSlotPlan": [
    {
      "stationId": "string",
      "stationName": "string",
      "slots": [
        {
          "timeSlot": "HH:00-HH:00",
          "vehicles": ["plateNumber1", "plateNumber2"]
        }
      ]
    }
  ],
  "tierFuelAllocation": {
    "tier1": number,
    "tier2": number,
    "tier3": number,
    "tier4": number
  }
}
`;

let geminiModel = null;

function getModel() {
  if (!geminiModel) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });
  }
  return geminiModel;
}

/**
 * Call Gemini with a dynamic prompt built from live MongoDB data.
 * Returns parsed JSON response object.
 */
export async function callGemini(prompt) {
  const model = getModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown fences if Gemini wraps response
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(
      `Gemini returned non-JSON response: ${clean.slice(0, 200)}`,
    );
  }

  // Validate required fields
  if (
    !parsed.alertLevel ||
    !["normal", "warning", "critical"].includes(parsed.alertLevel)
  ) {
    throw new Error("Gemini response missing valid alertLevel field.");
  }
  if (!parsed.canServe || !parsed.timeSlotPlan) {
    throw new Error(
      "Gemini response missing required canServe or timeSlotPlan fields.",
    );
  }

  return parsed;
}
