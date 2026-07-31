const mongoose = require("mongoose");

const Inventory = require("../models/inventory.model");
const StockMovement = require("../models/stockMovement.model");

const { MOVEMENT_TYPES } = require("../constants/stockMovement.constants");

const { getSettings } = require("./settings.service");

const {
    calculateAverageDailyUsage,
    calculateRemainingStock,
    calculateDaysUntilLowStock,
    predictLowStockDate,
    getRiskLevel,
    getRecommendation,
} = require("../utils/prediction.util");

const { getBranchFilter } = require("../utils/reportFilter.util");