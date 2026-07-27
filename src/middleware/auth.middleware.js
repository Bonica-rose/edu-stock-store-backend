const User = require("../models/user.model");
const asyncHandler = require("./asyncHandler.middleware");
const ApiError = require("../utils/apiError.util");
const { verifyAccessToken } = require("../services/auth.service");

const authenticate = asyncHandler(async (req, res, next) => {
    
    // Get token from HttpOnly cookie
    const token = req.cookies?.accessToken;
    if (!token) {
        throw new ApiError(401, "Access denied. Please login.");
    }

    // Verify JWT
    const decoded = verifyAccessToken(token);

    // Find user
    const user = await User.findById(decoded.id).select("-password -__v");

    if (!user) {
        throw new ApiError(401, "User not found.");
    }

    if (!user.isActive) {
        throw new ApiError(403, "Account has been deactivated.");
    }

    // Invalidate old tokens after password change
    if (
        user.passwordChangedAt &&
        decoded.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
        throw new ApiError(401, "Password changed. Please login again.");
    }

    // Attach authenticated user
    req.user = user;
    // console.log("Authenticated User:", req.user);

    // Optional: attach token
    req.token = token;

    next();
});

module.exports = authenticate;