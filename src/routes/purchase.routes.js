const express = require("express");
const purchaseRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");

const purchaseController = require("../controllers/purchase.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate");

const {
    createPurchaseValidator,
    purchaseIdValidator,
} = require("../validators/purchase.validator");

//Protected routes
purchaseRouter.get(
    "/",
    protect, authorize(PERMISSIONS.PURCHASE_VIEW),
    purchaseController.getPurchases
);

purchaseRouter.get(
    "/:id",
    protect, authorize(PERMISSIONS.PURCHASE_VIEW),
    purchaseIdValidator, validate,
    purchaseController.getPurchase
);

purchaseRouter.post(
    "/",
    protect, authorize(PERMISSIONS.PURCHASE_CREATE),
    createPurchaseValidator, validate,
    purchaseController.createPurchase
);

module.exports = purchaseRouter;