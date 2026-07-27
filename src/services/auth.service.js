const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError.util");
const User = require("../models/user.model");
const { mapUser } = require("../utils/userResponse.util");

/*
|--- Part 1 – Helpers
*/
const hashPassword = async (password) => {
    try {
        return await argon2.hash(password);
    } catch (error) {
        throw new ApiError(500, "Failed to hash password.");
    }
};

const verifyPassword = async (plainPassword, hashedPassword) => {
    try {
        return await argon2.verify(hashedPassword, plainPassword);
    } catch (error) {
        throw new ApiError(500, "Failed to verify password.");
    }
};

/* Generate JWT Access Token */
const generateAccessToken = (user) => {
    try {
        return jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN,
            }
        );
    } catch (error) {
        throw new ApiError(500, "Failed to generate access token.");
    }
};

/* Verify JWT Access Token */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Token has expired.");
        }

        if (error.name === "JsonWebTokenError") {
            throw new ApiError(401, "Invalid token.");
        }

        throw new ApiError(401, "Authentication failed.");
    }
};

/* HttpOnly Cookie Options */
const getCookieOptions = () => {
    /* 1 day = 24 * 60 * 60 * 1000 = 86,400,000 ms */
    const maxAge = Number(process.env.JWT_COOKIE_EXPIRES_IN_DAYS) * 24 * 60 * 60 * 1000; 

    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true in production with HTTPS
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge,
    };
};

/*
|--- Part 2 – Authentication
*/
const login = async ({ email, password }) => {

    const user = await User
        .findOne({ email: email.toLowerCase().trim(), deletedAt: null })
        .select("+password")
        .populate("branch", "branchCode branchName")
        .populate("createdBy", "employeeId firstName lastName")
        .populate("updatedBy", "employeeId firstName lastName");
    
    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    if (!user.isActive) {
        throw new ApiError(403, "Account is deactivated");
    }

    const matched = await verifyPassword(password, user.password);
    if (!matched) {
        throw new ApiError(401, "Invalid email or password");
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateAccessToken(user);

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.__v;    

    return {
        token,
        user: mapUser(safeUser),        
    };
};

const logout = () => true;

const getCurrentUser = async (id) => {

    const user = await User
        .findOne({ _id: id, deletedAt: null })  
        .populate("branch", "branchName branchCode")
        .populate("createdBy", "employeeId firstName lastName")
        .populate("updatedBy", "employeeId firstName lastName");

    if (!user)
        throw new ApiError(404, "User not found");

    return mapUser(user);    
};

const changePassword = async (id, currentPassword, newPassword) => {

    const user = await User.findOne({_id: id, deletedAt: null}).select("+password");
    if (!user)
        throw new ApiError(404, "User not found");

    const matched = await verifyPassword(currentPassword, user.password); 
    if (!matched)
        throw new ApiError(400, "Current password is incorrect");

    const samePassword = await verifyPassword(newPassword, user.password);
    if (samePassword)
        throw new ApiError(400, "New password must be different from the current password");

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    await user.save();
};

module.exports = {
    hashPassword,
    verifyPassword,
    generateAccessToken,
    verifyAccessToken,
    getCookieOptions,
    login,
    logout,
    getCurrentUser,
    changePassword,
};