const { ROLES } = require("../constants/roles");
const { ROLE_PERMISSIONS } = require("../constants/rolePermissions");
const ApiError = require("../utils/apiError.util");

const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, "Authentication required"));
        }

        const { role } = req.user;

        if (!Object.values(ROLES).includes(role)) {
            return next(new ApiError(403, "Invalid user role"));
        }

        const permissions = ROLE_PERMISSIONS[role] || [];

        if (permissions.includes("*")) {
            return next();
        }

        const hasPermission = requiredPermissions.every(permission =>
            permissions.includes(permission)
        );

        if (!hasPermission) {
            return next(
                new ApiError(
                    403,
                    "You are not authorized to perform this action"
                )
            );
        }

        next();
    };
};

module.exports = authorize;