const User = require("../models/user.model");
const { hashPassword, verifyPassword } = require("../utils/password.util");
const { generateAccessToken } = require("../utils/jwt.util");
const ApiError = require("../utils/apiError.util");

exports.login = async ({ email, password }) => {

    const user = await User.findOne({ email });
    if (!user)
        throw new ApiError(401, "Invalid credentials");

    if (!user.isActive)
        throw new ApiError(403, "Account disabled");

    const matched = await verifyPassword(user.password, password);
    if (!matched)
        throw new ApiError(401, "Invalid credentials");

    user.lastLogin = new Date();

    await user.save();

    const token = generateAccessToken(user);

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.__v;    

    return {
        token,
        user: safeUser
    };
};

exports.logout = async () => {
    return true;
};

exports.getCurrentUser = async (id) => {

    const user = await User
        .findById(id)
        .select("-password -__v");

    if (!user)
        throw new ApiError(404, "User not found");

    return user;
};

exports.changePassword = async (id, currentPassword, newPassword) => {

    const user = await User.findById(id);
    if (!user)
        throw new ApiError(404, "User not found");

    const matched = await verifyPassword(user.password, currentPassword); 
    if (!matched)
        throw new ApiError(400, "Wrong password");

    if (currentPassword === newPassword)
        throw new ApiError(400, "New password must be different from the current password");

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    await user.save();
};

exports.updateProfile = async (id, data) => {

    const user = await User.findByIdAndUpdate(
        id,
        data,
        {
            new: true,
            runValidators: true
        }
    ).select("-password");

    return user;
};