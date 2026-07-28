const express = require("express");
const vendorRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");

const {
    getVendors,
    getVendor,
    createVendor,
    updateVendor,
    changeVendorStatus,
    deleteVendor,
} = require("../controllers/vendor.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate");

const {
    createVendorValidator,
    updateVendorValidator,
    changeVendorStatusValidator,
    deleteVendorValidator,
    getVendorValidator,
} = require("../validators/vendor.validator");

//Protected routes
vendorRouter.get(
    "/",
    protect, authorize(PERMISSIONS.VENDOR_VIEW),
    getVendors
);

vendorRouter.get(
    "/:id",
    protect, authorize(PERMISSIONS.VENDOR_VIEW),
    getVendorValidator, validate,
    getVendor
);

vendorRouter.post(
    "/",
    protect, authorize(PERMISSIONS.VENDOR_CREATE),
    createVendorValidator, validate,
    createVendor
);

vendorRouter.patch(
    "/:id",
    protect, authorize(PERMISSIONS.VENDOR_UPDATE),
    updateVendorValidator, validate,
    updateVendor
);

vendorRouter.patch(
    "/:id/status",
    protect, authorize(PERMISSIONS.VENDOR_UPDATE),
    changeVendorStatusValidator, validate,
    changeVendorStatus
);

vendorRouter.delete(
    "/:id",
    protect, authorize(PERMISSIONS.VENDOR_DELETE),
    deleteVendorValidator, validate,
    deleteVendor
);

module.exports = vendorRouter;