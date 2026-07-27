const express = require("express");
const branchRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");

const branchController = require("../controllers/branch.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate");

const {
    createBranchValidator,
    getBranchesValidator,
    getBranchByIdValidator,
    updateBranchValidator,
    changeBranchStatusValidator,
} = require("../validators/branch.validator");

// Protected Routes
branchRouter.post(
    "/",
    protect, authorize(PERMISSIONS.BRANCH_CREATE),
    createBranchValidator, validate,
    branchController.createBranch
);

branchRouter.get(
    "/",
    protect, authorize(PERMISSIONS.BRANCH_VIEW),
    getBranchesValidator, validate,
    branchController.getBranches
);

branchRouter.get(
    "/:id",
    protect, authorize(PERMISSIONS.BRANCH_VIEW),
    getBranchByIdValidator, validate,
    branchController.getBranchById
);

branchRouter.patch(
    "/:id",
    protect, authorize(PERMISSIONS.BRANCH_UPDATE),
    updateBranchValidator, validate,
    branchController.updateBranch
);

branchRouter.patch(
    "/:id/status",
    protect, authorize(PERMISSIONS.BRANCH_UPDATE),
    changeBranchStatusValidator, validate,
    branchController.changeBranchStatus
);

module.exports = branchRouter;