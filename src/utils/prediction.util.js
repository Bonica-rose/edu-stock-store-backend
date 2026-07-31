const {
    PREDICTION_RISK,
    PREDICTION_RECOMMENDATIONS,
} = require("../constants/prediction.constants");

/**
 * Calculate average daily stock consumption.
 */
const calculateAverageDailyUsage = (totalConsumed, historyDays) => {
    if (historyDays <= 0) return 0;

    return Number((totalConsumed / historyDays).toFixed(2));
};

/**
 * Calculate remaining usable stock before reaching minimum stock.
 */
const calculateRemainingStock = (currentStock, minimumStock) => {
    return Math.max(currentStock - minimumStock, 0);
};

/**
 * Calculate predicted days until inventory reaches minimum stock.
 */
const calculateDaysUntilLowStock = (
    remainingStock,
    averageDailyUsage
) => {
    if (averageDailyUsage <= 0) {
        return Infinity;
    }

    return Math.ceil(
        remainingStock / averageDailyUsage
    );
};

/**
 * Predict the date when inventory reaches minimum stock.
 */
const predictLowStockDate = (daysUntilLowStock) => {
    if (!Number.isFinite(daysUntilLowStock)) {
        return null;
    }

    const predictedDate = new Date();

    predictedDate.setDate(
        predictedDate.getDate() + daysUntilLowStock
    );

    return predictedDate;
};

/**
 * Determine prediction risk level.
 */
const getRiskLevel = (
    daysUntilLowStock,
    predictionAlertDays
) => {
    if (daysUntilLowStock <= 3) {
        return PREDICTION_RISK.CRITICAL;
    }

    if (daysUntilLowStock <= 7) {
        return PREDICTION_RISK.HIGH;
    }

    if (daysUntilLowStock <= predictionAlertDays) {
        return PREDICTION_RISK.MEDIUM;
    }

    return PREDICTION_RISK.LOW;
};

/**
 * Generate recommendation based on prediction.
 */
const getRecommendation = (
    daysUntilLowStock,
    predictionAlertDays
) => {
    if (daysUntilLowStock <= 3) {
        return PREDICTION_RECOMMENDATIONS.PURCHASE_IMMEDIATELY;
    }

    if (daysUntilLowStock <= 7) {
        return PREDICTION_RECOMMENDATIONS.PURCHASE_THIS_WEEK;
    }

    if (daysUntilLowStock <= predictionAlertDays) {
        return PREDICTION_RECOMMENDATIONS.MONITOR_CLOSELY;
    }

    return PREDICTION_RECOMMENDATIONS.STOCK_HEALTHY;
};

module.exports = {
    calculateAverageDailyUsage,
    calculateRemainingStock,
    calculateDaysUntilLowStock,
    predictLowStockDate,
    getRiskLevel,
    getRecommendation,
};