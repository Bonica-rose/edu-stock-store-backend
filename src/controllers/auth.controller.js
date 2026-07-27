const asyncHandler  = require("../middleware/asyncHandler.middleware");
const authService = require("../services/auth.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.login = asyncHandler(async (req, res) => {

    const { token, user } = await authService.login(req.body);

    res.cookie(
        "accessToken",
        token,
        authService.getCookieOptions()
    );

    successResponse(res, 200, "Login successful", user);
});

exports.logout = asyncHandler(async (req, res) => {   

    await authService.logout();

    res.clearCookie("accessToken", authService.getCookieOptions());

    successResponse(res, 200, "Logout successful");
});

exports.me = asyncHandler(async (req, res) => {
    
    const user = await authService.getCurrentUser(req.user._id);

    successResponse(res, 200, "Current user", user);
});

exports.changePassword = asyncHandler(async (req, res) => {   
    
    await authService.changePassword(
        req.user._id,
        req.body.currentPassword,
        req.body.newPassword
    );

    successResponse(res, 200, "Password changed successfully");
});






// exports.updateProfile = asyncHandler(async (req, res) => { 

//     const updateData = {
//         firstName: req.body.firstName,
//         lastName: req.body.lastName,
//         phone: req.body.phone,
//         profileImage: req.body.profileImage,
//         updatedBy: req.user._id,
//     };

//     const user = await authService.updateProfile(req.user._id, updateData);

//     res.status(200).json({
//         success: true,
//         data: user
//     });
// });