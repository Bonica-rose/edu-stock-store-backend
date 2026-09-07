const { GoogleGenAI } = require("@google/genai");

let client = null;

const getClient = () => {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    if (!client) {
        client = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });
    }

    return client;
};

const getRecommendations = async (predictions) => {
    const ai = getClient();

    if (!ai || !predictions.length) {
        return new Map();
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

    const input = predictions.map((item) => ({
        sku: item.sku,
        itemName: item.itemName,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        predictedDemand7Days: item.predictedDemand7Days,
        daysUntilLowStock: item.daysUntilLowStock,
        riskLevel: item.riskLevel,
        recentDailyConsumption: item.recentDailyConsumption,
        recentConsumptionTrend: item.recentConsumptionTrend,
    }));

    const prompt = `
You are an inventory management assistant.

The numerical forecast below was calculated by a TensorFlow.js demand prediction model.
Do NOT recalculate or change the numerical forecast.

For each inventory item, provide a short practical recommendation for an inventory manager.
Return JSON only as an array. Each object must contain:
- sku
- recommendation

Rules:
- Keep each recommendation under 45 words.
- Mention replenishment urgency when risk is HIGH or CRITICAL.
- Do not invent stock quantities or facts not present in the input.
- Do not give generic motivational text.

Forecast data:
${JSON.stringify(input)}
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                temperature: 0.2,
                responseMimeType: "application/json",
                responseJsonSchema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            sku: { type: "string" },
                            recommendation: { type: "string" },
                        },
                        required: ["sku", "recommendation"],
                    },
                },
            },
        });

        const parsed = JSON.parse(response.text || "[]");
        const result = new Map();

        for (const item of parsed) {
            if (item?.sku && item?.recommendation) {
                result.set(item.sku, item.recommendation.trim());
            }
        }

        return result;
    } catch (error) {
        console.error("Gemini recommendation error:", error.message);
        return new Map();
    }
};

module.exports = {
    getRecommendations,
};
