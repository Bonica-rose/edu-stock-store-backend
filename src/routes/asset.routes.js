const express = require("express");
const assetRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");

const assetController = require("../controllers/asset.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate");

const {
    createAssetValidator,
    updateAssetValidator,
    assignAssetValidator,
    returnAssetValidator,
    assetIdValidator,
} = require("../validators/asset.validator");

//Protected routes
assetRouter.get(
    "/",
    protect, authorize(PERMISSIONS.ASSET_VIEW),
    assetController.getAssets
);

assetRouter.get(
    "/:id",
    protect, authorize(PERMISSIONS.ASSET_VIEW),
    assetIdValidator, validate,
    assetController.getAsset
);

assetRouter.post(
    "/",
    protect, authorize(PERMISSIONS.ASSET_CREATE),
    createAssetValidator, validate,
    assetController.createAsset
);

assetRouter.put(
    "/:id",
    protect, authorize(PERMISSIONS.ASSET_UPDATE),
    assetIdValidator, updateAssetValidator, validate,
    assetController.updateAsset
);

assetRouter.patch(
    "/:id/status",
    protect, authorize(PERMISSIONS.ASSET_CHANGE_STATUS),
    assetIdValidator, validate,
    assetController.changeAssetStatus
);

assetRouter.delete(
    "/:id",
    protect, authorize(PERMISSIONS.ASSET_DELETE),
    assetIdValidator, validate,
    assetController.deleteAsset
);

assetRouter.patch(
    "/:id/assign",
    protect, authorize(PERMISSIONS.ASSET_ASSIGN),
    assetIdValidator, assignAssetValidator, validate,
    assetController.assignAsset
);

assetRouter.patch(
    "/:id/return",
    protect, authorize(PERMISSIONS.ASSET_RETURN),
    assetIdValidator, returnAssetValidator, validate,
    assetController.returnAsset
);

module.exports = assetRouter;