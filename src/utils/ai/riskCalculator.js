const { AI_RISK_LEVELS } = require("../../constants/ai.constants");

const calculateRisk = ({
    currentStock,
    minimumStock,
    predictedDailyDemand,
    predictionAlertDays,
}) => {
    const stock = Number(currentStock || 0);
    const minimum = Number(minimumStock || 0);
    const dailyDemand = Math.max(0, Number(predictedDailyDemand || 0));

    const alertDays = Math.max(1, Number(predictionAlertDays || 10));

    // Stock is already at or below the minimum level.
    if (stock <= minimum) {
        return {
            daysUntilLowStock: 0,
            riskLevel: AI_RISK_LEVELS.CRITICAL,
        };
    }

    // No predicted demand means there is currently
    // no expected stock depletion.
    if (dailyDemand <= 0) {
        return {
            daysUntilLowStock: null,
            riskLevel: AI_RISK_LEVELS.LOW,
        };
    }

    // Calculate how many days until stock reaches
    // the inventory minimum level.
    const stockAboveMinimum = stock - minimum;

    const daysUntilLowStock = stockAboveMinimum / dailyDemand;

    let riskLevel;

    /*
    * Example when predictionAlertDays = 10:
    *
    * 0 - 10 days   -> HIGH
    * 11 - 20 days  -> MEDIUM
    * > 20 days     -> LOW
    *
    * CRITICAL is reserved for stock already at/below minimum.
    */

    if (daysUntilLowStock <= alertDays) {
        riskLevel = AI_RISK_LEVELS.HIGH;
    } else if (daysUntilLowStock <= alertDays * 2) {
        riskLevel = AI_RISK_LEVELS.MEDIUM;
    } else {
        riskLevel = AI_RISK_LEVELS.LOW;
    }

    return {
        daysUntilLowStock: Number(daysUntilLowStock.toFixed(1)),
        riskLevel,
    };
};

module.exports = {
    calculateRisk,
};
