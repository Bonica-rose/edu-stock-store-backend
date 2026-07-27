const express = require("express");
const categoryRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");

const {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    changeCategoryStatus,
    deleteCategory,
} = require("../controllers/category.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate");

const {
    getCategoriesValidator,
    categoryIdValidator,
    createCategoryValidator,
    updateCategoryValidator,
    changeCategoryStatusValidator
} = require("../validators/category.validator");

//Protected routes
categoryRouter.get(
    "/",
    protect, authorize(PERMISSIONS.CATEGORY_VIEW),
    getCategoriesValidator, validate,
    getCategories
);

categoryRouter.get(
    "/:id",
    protect, authorize(PERMISSIONS.CATEGORY_VIEW),
    categoryIdValidator, validate,
    getCategory
);

categoryRouter.post(
    "/",
    protect, authorize(PERMISSIONS.CATEGORY_CREATE),
    createCategoryValidator, validate,
    createCategory
);

categoryRouter.put(
    "/:id",
    protect, authorize(PERMISSIONS.CATEGORY_UPDATE),
    updateCategoryValidator, validate,
    updateCategory
);

categoryRouter.patch(
    "/:id/status",
    protect, authorize(PERMISSIONS.CATEGORY_CHANGE_STATUS),
    changeCategoryStatusValidator, validate,
    changeCategoryStatus
);

categoryRouter.delete(
    "/:id",
    protect, authorize(PERMISSIONS.CATEGORY_DELETE),
    categoryIdValidator, validate,
    deleteCategory
);

module.exports = categoryRouter;