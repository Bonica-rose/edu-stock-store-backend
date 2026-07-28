const express = require("express");
const stockMoveRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");
const stockMovementController = require("../controllers/stockMovement.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate");

const {
    stockMovementValidator,
    transferStockValidator,
    adjustmentValidator,
    stockMovementIdValidator,
} = require("../validators/stockMovement.validator");


// Protected routes
stockMoveRouter.get(
    "/",
    protect, authorize(PERMISSIONS.STOCK_MOVEMENT_VIEW),
    stockMovementController.getStockMovements
);

stockMoveRouter.get(
    "/:id",
    protect, authorize(PERMISSIONS.STOCK_MOVEMENT_VIEW),
    stockMovementIdValidator, validate,
    stockMovementController.getStockMovement
);


stockMoveRouter.post(
    "/stock-in",
    protect, authorize(PERMISSIONS.STOCK_IN_CREATE),
    stockMovementValidator, validate,
    stockMovementController.stockIn
);

stockMoveRouter.post(
    "/stock-out",
    protect, authorize(PERMISSIONS.STOCK_OUT_CREATE),
    stockMovementValidator, validate,
    stockMovementController.stockOut
);

stockMoveRouter.post(
    "/transfer",
    protect, authorize(PERMISSIONS.STOCK_TRANSFER_CREATE),
    transferStockValidator, validate,
    stockMovementController.transferStock
);

stockMoveRouter.post(
    "/adjustment",
    protect, authorize(PERMISSIONS.STOCK_ADJUSTMENT_CREATE),
    adjustmentValidator, validate,
    stockMovementController.adjustStock
);


module.exports = stockMoveRouter;