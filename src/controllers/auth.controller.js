const asyncHandler  = require("../middleware/asyncHandler.middleware");
const authService  = require("../services/auth.service")

exports.login = asyncHandler (async (req, res) => {
    const result = await authService.login(req.body);

    res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true in production with HTTPS
        sameSite:
            process.env.NODE_ENV === "production"
                ? "none"
                : "lax",
        maxAge: 24 * 60 * 60 * 1000 // 1 day = 86,400,000 ms
    });

    res.status(200).json({
        success: true,
        message: "Login successful",
        data: result.user
    });
});

exports.logout = asyncHandler(async (req, res) => {

    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite:
            process.env.NODE_ENV === "production"
                ? "none"
                : "lax",
    });

    res.status(200).json({
        success: true,
        message: "Logout successful",
    });

});

exports.me = asyncHandler (async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);
    res.status(200).json({
        success: true,
        data: user
    });
});

exports.changePassword = asyncHandler (async (req, res) => {    
    await authService.changePassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
    );

    res.status(200).json({
        success: true,
        message: "Password changed successfully"
    });
});

exports.updateProfile = asyncHandler(async (req, res) => { 

    const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        avatar: req.body.profileImage,
    };

    const user = await authService.updateProfile(req.user.id, updateData);

    res.status(200).json({
        success: true,
        data: user
    });
});