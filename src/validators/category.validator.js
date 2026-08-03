const { body, param, query } = require("express-validator");
const { CATEGORY_TYPES } = require("../constants/category.constants");

exports.createCategoryValidator = [
    body("categoryName")
        .trim()
        .notEmpty()
        .withMessage("Category name is required.")
        .isLength({ min: 2, max: 100 })
        .withMessage("Category name must be between 2 and 100 characters."),

    body("categoryCode")
        .trim()
        .notEmpty()
        .withMessage("Category code is required.")
        .isLength({ min: 2, max: 20 })
        .withMessage("Category code must be between 2 and 20 characters.")
        .matches(/^[A-Za-z0-9_-]+$/)
        .withMessage("Category code can only contain letters, numbers, hyphens, and underscores."),

    body("description")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters."),
    
    body("type")
        .notEmpty()
        .withMessage("Category type is required.")
        .isIn(Object.values(CATEGORY_TYPES))
        .withMessage("Invalid category type."),
];

exports.updateCategoryValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid category ID."),

    body("categoryName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Category name cannot be empty.")
        .isLength({ min: 2, max: 100 })
        .withMessage("Category name must be between 2 and 100 characters."),

    body("categoryCode")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Category code cannot be empty.")
        .isLength({ min: 2, max: 20 })
        .withMessage("Category code must be between 2 and 20 characters.")
        .matches(/^[A-Za-z0-9_-]+$/)
        .withMessage(
            "Category code can only contain letters, numbers, hyphens, and underscores."
        ),

    body("description")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters."),
    
    body("type")
        .optional()
        .notEmpty()
        .withMessage("Category type cannot be empty.")
        .isIn(Object.values(CATEGORY_TYPES))
        .withMessage("Invalid category type."),
];

exports.categoryIdValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid category ID."),
];

exports.changeCategoryStatusValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid category ID."),
];

exports.getCategoriesValidator = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer."),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100."),

    query("search")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Search term cannot exceed 100 characters."),
    
    query("type")
        .optional()
        .isIn(Object.values(CATEGORY_TYPES))
        .withMessage("Invalid category type."),

    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false."),

    query("sortBy")
        .optional()
        .isIn([
            "categoryName",
            "categoryCode",
            "createdAt",
            "updatedAt",
        ])
        .withMessage("Invalid sortBy field."),

    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be asc or desc."),
];