const cloudinary = require("../../config/cloudinary");

module.exports = {
    uploadToCloudinary: async (filePath, folder = "edu-stock-store") => {

        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: "image",
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
        };
    }
};

