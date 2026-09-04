const mongoose = require("mongoose");

const Inventory = require("../../models/inventory.model");
const StockMovement = require("../../models/stockMovement.model");
const Setting = require("../../models/settings.model");

const { ROLES } = require("../../constants/roles");
const { AI_CONFIG, AI_RISK_LEVELS } = require("../../constants/ai.constants");
const { calculateRisk } = require("../../utils/ai/riskCalculator");
const { predictDemand } = require("./tensorflowPrediction.service");
const { getRecommendations } = require("./gemini.service");

/**
 * Ensure the authenticated user is allowed to use
 * AI inventory prediction.
 *
 * AI access:
 * - Branch Admin
 * - Inventory Staff
 */
const assertAIUser = (user) => {
    if (!user) {
        throw new Error("Authentication required.");
    }

    if (user.role !== ROLES.BRANCH_ADMIN && user.role !== ROLES.INVENTORY_STAFF) {
        const error = new Error(
            "AI inventory prediction is available to Branch Admin and Inventory Staff only.",
        );

        error.statusCode = 403;
        throw error;
    }

    if (!user.branch) {
        const error = new Error("No branch is assigned to the authenticated user.");
        error.statusCode = 403;
        throw error;
    }
};

/**
 * Convert the authenticated user's branch ID into a valid MongoDB ObjectId.
 */
const getBranchObjectId = (user) => {
    if (!mongoose.Types.ObjectId.isValid(user.branch)) {
        const error = new Error("Invalid branch.");
        error.statusCode = 400;
        throw error;
    }

    return new mongoose.Types.ObjectId(user.branch);
};

/**
 * Load all inventory and stock movement data required for AI prediction.
 *
 * Branch filtering is performed on the backend so users cannot request AI predictions for another branch.
 */
const loadBranchData = async (user, inventoryId = null) => {
    assertAIUser(user);

    /*
    * Load application settings.
    *
    * predictionHistoryDays:
    * Controls how much historical stock movement data
    * is supplied to TensorFlow.
    *
    * predictionAlertDays:
    * Controls how far ahead the AI should consider stock
    * depletion to be a risk.
    */
    const settings = await Setting.findOne().lean();
    const predictionHistoryDays = Math.max(7,Number(settings?.predictionHistoryDays ?? 30));
    const predictionAlertDays = Math.max(1, Number(settings?.predictionAlertDays ?? 10));

    const branchId = getBranchObjectId(user);

    /*
    * Only retrieve stock movement history within the
    * configured prediction history period.
    */
    const cutoff = new Date(
        Date.now() - predictionHistoryDays * 24 * 60 * 60 * 1000,
    );

    /*
    * Branch-level security filter.
    */
    const inventoryFilter = {
        branch: branchId,
        isDeleted: false,
        isActive: true,
    };

    /*
    * If a specific inventory item was requested,
    * additionally filter by its ID.
    */
    if (inventoryId) {
        if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
        const error = new Error("Invalid inventory ID.");
        error.statusCode = 400;
        throw error;
        }

        inventoryFilter._id = new mongoose.Types.ObjectId(inventoryId);
    }

    /*Load branch inventory */
    const inventories = await Inventory.find(inventoryFilter)
        .populate("category", "categoryName")
        .populate("branch", "branchName")
        .lean();

    /*
    * A specific inventory item was requested but does
    * not exist in the user's branch.
    */
    if (inventoryId && !inventories.length) {
        const error = new Error("Inventory not found or not available for your branch.");
        error.statusCode = 404;
        throw error;
    }

    const inventoryIds = inventories.map((item) => item._id);

    /*
    * Load stock movements for the branch inventory.
    *
    * The branch condition provides an additional
    * branch-level data restriction.
    */
    const movements = inventoryIds.length
        ? await StockMovement.find({
            inventory: { $in: inventoryIds },
            branch: branchId,
            createdAt: { $gte: cutoff},
        }).select([
            "inventory",
            "movementType",
            "quantity",
            "previousStock",
            "newStock",
            "createdAt",
            "branch",
        ].join(" "))
        .sort({ createdAt: 1})
        .lean()
        : [];

    return {
        inventories,
        movements,
        predictionHistoryDays,
        predictionAlertDays,
    };
};

/**
 * Generate TensorFlow predictions and enrich them with:
 * - consumption metrics
 * - risk level
 * - days until low stock
 * - reorder quantity
 */
const enrichPredictions = async (
    inventories,
    movements,
    predictionHistoryDays,
    predictionAlertDays,
) => {
    const today = new Date();

    /* TensorFlow receives the configured history period */
    const tfPredictions = await predictDemand(
        inventories,
        movements,
        today,
        predictionHistoryDays,
    );

    const results = inventories.map((inventory) => {
        const prediction = tfPredictions.get(String(inventory._id));

        const predictedDailyDemand = Number(prediction?.predictedDailyDemand || 0);

        /*
        * Convert daily prediction into the
        * configured 7-day forecast.
        */
        const predictedDemand7Days = Number(
            (predictedDailyDemand * AI_CONFIG.FORECAST_DAYS).toFixed(1),
        );

        /*
        * Calculate inventory risk using the
        * configurable predictionAlertDays.
        */
        const risk = calculateRisk({
            currentStock: inventory.currentStock,
            minimumStock: inventory.minimumStock,
            predictedDailyDemand,
            predictionAlertDays,
        });

        /*
        * Basic reorder quantity calculation.
        *
        * Required quantity =
        *
        * predicted demand
        * + minimum stock
        * - current stock
        */
        const reorderQuantity = Math.max(
            0,
            Math.ceil(
                predictedDemand7Days +
                Number(inventory.minimumStock || 0) -
                Number(inventory.currentStock || 0),
            ),
        );

        /*
        * Determine recent consumption trend.
        */
        const trendRatio = Number(prediction?.metrics?.recentConsumptionTrend || 1);

        let recentConsumptionTrend = "stable";

        if (trendRatio >= 1.1) {
            recentConsumptionTrend = "increasing";
        } else if (trendRatio <= 0.9) {
            recentConsumptionTrend = "decreasing";
        }

        return {
            inventoryId: inventory._id,
            sku: inventory.sku,
            itemName: inventory.itemName,
            unit: inventory.unit,
            currentStock: Number(inventory.currentStock || 0),
            minimumStock: Number(inventory.minimumStock || 0),
            category: inventory.category?.categoryName || "-",
            branch: inventory.branch?.branchName || "-",
            averageDailyConsumption: Number(
                prediction?.metrics?.averageDailyConsumption || 0,
            ).toFixed(2),

            recentDailyConsumption: Number(
                prediction?.metrics?.recentDailyConsumption || 0,
            ).toFixed(2),

            recentConsumptionTrend,
            predictedDailyDemand: Number(predictedDailyDemand.toFixed(2)),
            predictedDemand7Days,
            daysUntilLowStock: risk.daysUntilLowStock,
            riskLevel: risk.riskLevel,
            reorderQuantity,
            modelUsed: Boolean(prediction?.modelUsed),
            trainingSamples: prediction?.trainingSamples || 0,
        };
    });

    /*
    * Highest-risk items should appear first.
    */
    const riskOrder = {
        [AI_RISK_LEVELS.CRITICAL]: 0,
        [AI_RISK_LEVELS.HIGH]: 1,
        [AI_RISK_LEVELS.MEDIUM]: 2,
        [AI_RISK_LEVELS.LOW]: 3,
        [AI_RISK_LEVELS.INSUFFICIENT_DATA]: 4,
    };

    return results.sort((a, b) => {
        const riskDifference = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];

        if (riskDifference !== 0) {
            return riskDifference;
        }

        return (
            (a.daysUntilLowStock ?? Number.MAX_SAFE_INTEGER) -
            (b.daysUntilLowStock ?? Number.MAX_SAFE_INTEGER)
        );
    });
};

/**
 * Get AI predictions for the user's branch dashboard.
 */
const getDashboardPredictions = async (user) => {
    const { inventories, movements, predictionHistoryDays, predictionAlertDays } =
        await loadBranchData(user);

    const predictions = await enrichPredictions(
        inventories,
        movements,
        predictionHistoryDays,
        predictionAlertDays,
    );

    /*
    * Only show the configured number of highest-risk
    * items on the dashboard.
    */
    const topPredictions = predictions.slice(0, AI_CONFIG.DASHBOARD_LIMIT);

    /*
    * Gemini is only needed for items that actually
    * require an actionable recommendation.
    */
    const geminiPredictions = topPredictions.filter(
        (item) =>
        item.riskLevel === AI_RISK_LEVELS.CRITICAL ||
        item.riskLevel === AI_RISK_LEVELS.HIGH ||
        item.riskLevel === AI_RISK_LEVELS.MEDIUM,
    );

    /*
    * One Gemini request is used for the selected
    * dashboard items instead of one request per item.
    */
    const recommendations = await getRecommendations(geminiPredictions);

    /*
    * Add Gemini recommendation or fallback
    * recommendation.
    */
    for (const item of topPredictions) {
        item.recommendation =
        recommendations.get(item.sku) ||
        (item.riskLevel === AI_RISK_LEVELS.CRITICAL
            ? "Stock is already at or below the minimum level. Replenishment should be considered immediately."
            : item.riskLevel === AI_RISK_LEVELS.HIGH
                ? "Stock is expected to reach the minimum level soon. Consider replenishing this item."
                : item.riskLevel === AI_RISK_LEVELS.MEDIUM
                    ? "Monitor consumption and plan replenishment before the stock reaches the minimum level."
                    : "Current demand indicates a lower immediate stock risk.");
    }

    /*
    * Return summary information along with the
    * top predictions.
    */
    return {
        generatedAt: new Date(),

        branch: topPredictions[0]?.branch || null,

        summary: {
        totalItemsAnalyzed: predictions.length,

        criticalItems: predictions.filter(
            (item) => item.riskLevel === AI_RISK_LEVELS.CRITICAL,
        ).length,

        highRiskItems: predictions.filter(
            (item) => item.riskLevel === AI_RISK_LEVELS.HIGH,
        ).length,

        mediumRiskItems: predictions.filter(
            (item) => item.riskLevel === AI_RISK_LEVELS.MEDIUM,
        ).length,
        },

        predictions: topPredictions,
    };
    };

    /**
     * Get AI prediction for one inventory item.
     */
    const getInventoryPrediction = async (inventoryId, user) => {
    const { inventories, movements, predictionHistoryDays, predictionAlertDays } =
        await loadBranchData(user, inventoryId);

    const [prediction] = await enrichPredictions(
        inventories,
        movements,
        predictionHistoryDays,
        predictionAlertDays,
    );

    const recommendations = await getRecommendations([prediction]);

    prediction.recommendation =
        recommendations.get(prediction.sku) ||
        (prediction.riskLevel === AI_RISK_LEVELS.CRITICAL
        ? "Stock is already at or below the minimum level. Replenishment should be considered immediately."
        : prediction.riskLevel === AI_RISK_LEVELS.HIGH
            ? "Stock is expected to reach the minimum level soon. Consider replenishing this item."
            : prediction.riskLevel === AI_RISK_LEVELS.MEDIUM
            ? "Monitor consumption and plan replenishment before the stock reaches the minimum level."
            : "Current demand indicates a lower immediate stock risk.");

    return {
        generatedAt: new Date(),
        prediction,
    };
};

module.exports = {
    getDashboardPredictions,
    getInventoryPrediction,
};
