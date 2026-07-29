const asyncHandler = require("../middleware/asyncHandler.middleware");
const vendorService = require("../services/vendor.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getVendors = asyncHandler(async (req, res) => {
    const result = await vendorService.getVendors(req.query);

    successResponse(res, 200, "Vendors fetched successfully.", result);
});

exports.getVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.getVendor(req.params.id);

    successResponse(res, 200, "Vendor fetched successfully.", vendor);
});

exports.createVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.createVendor(req.body, req.user._id);

    successResponse(res, 201, "Vendor created successfully.", vendor);
});

exports.updateVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.updateVendor(req.params.id, req.body, req.user._id);

    successResponse(res, 200, "Vendor updated successfully.", vendor);
});

exports.changeVendorStatus = asyncHandler(async (req, res) => {
    const vendor = await vendorService.changeVendorStatus(req.params.id, req.user._id);

    successResponse(res, 200, "Vendor status updated successfully.", vendor);
});

exports.deleteVendor = asyncHandler(async (req, res) => {
    await vendorService.deleteVendor(req.params.id);

    successResponse(res, 200, "Vendor deleted successfully.", null);
});