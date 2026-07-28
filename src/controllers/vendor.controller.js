const asyncHandler = require("../middleware/asyncHandler.middleware");
const vendorService = require("../services/vendor.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getVendors = catchAsync(async (req, res) => {
    const result = await vendorService.getVendors(req.query);

    successResponse(res, 200, "Vendors fetched successfully.", result);
});

exports.getVendor = catchAsync(async (req, res) => {
    const vendor = await vendorService.getVendor(req.params.id);

    successResponse(res, 200, "Vendor fetched successfully.", vendor);
});

exports.createVendor = catchAsync(async (req, res) => {
    const vendor = await vendorService.createVendor(req.body, req.user._id);

    successResponse(res, 201, "Vendor created successfully.", vendor);
});

exports.updateVendor = catchAsync(async (req, res) => {
    const vendor = await vendorService.updateVendor(req.params.id, req.body, req.user._id);

    successResponse(res, 200, "Vendor updated successfully.", vendor);
});

exports.changeVendorStatus = catchAsync(async (req, res) => {
    const vendor = await vendorService.changeVendorStatus(req.params.id, req.user._id);

    successResponse(res, 200, "Vendor status updated successfully.", vendor);
});

exports.deleteVendor = catchAsync(async (req, res) => {
    await vendorService.deleteVendor(req.params.id);

    successResponse(res, 200, "Vendor deleted successfully.");
});