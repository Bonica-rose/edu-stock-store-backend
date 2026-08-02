const cloudinary = require("../../config/cloudinary");

exports.deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId);
};