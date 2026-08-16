const express = require("express");
const inventoryRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");

const {
    getInventories,
    getInventory,
    createInventory,
    updateInventory,
    changeInventoryStatus,
    deleteInventory,
} = require("../controllers/inventory.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate");
const upload = require("../middleware/multer");

const {
    createInventoryValidator,
    updateInventoryValidator,
    inventoryIdValidator,
    changeInventoryStatusValidator,
    getInventoriesValidator,
} = require("../validators/inventory.validator");

//Protected routes
inventoryRouter.get(
    "/",
    protect, authorize(PERMISSIONS.INVENTORY_VIEW),
    getInventoriesValidator, validate,
    getInventories
);

inventoryRouter.get(
    "/:id",
    protect, authorize(PERMISSIONS.INVENTORY_VIEW),
    inventoryIdValidator, validate,
    getInventory
);

inventoryRouter.post(
    "/",
    protect,
    authorize(PERMISSIONS.INVENTORY_CREATE),
    upload.single("itemImageFile"),
    createInventoryValidator,
    validate,
    createInventory,
);

inventoryRouter.patch(
    "/:id",
    protect,
    authorize(PERMISSIONS.INVENTORY_UPDATE),
    upload.single("itemImageFile"),
    updateInventoryValidator,
    validate,
    updateInventory,
);

inventoryRouter.patch(
    "/:id/status",
    protect, authorize(PERMISSIONS.INVENTORY_CHANGE_STATUS),
    changeInventoryStatusValidator, validate,
    changeInventoryStatus
);

inventoryRouter.delete(
    "/:id",
    protect, authorize(PERMISSIONS.INVENTORY_DELETE),
    inventoryIdValidator, validate,
    deleteInventory
);

module.exports = inventoryRouter;