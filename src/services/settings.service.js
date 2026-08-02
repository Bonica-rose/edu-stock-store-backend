const Setting = require("../models/settings.model");
const { logActivity } = require("./activity.service");
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require("../constants/activity.constants");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");

const getSettings = async () => {
    let settings = await Setting.findOne();

    if (!settings) {
        settings = await Setting.create({});
    }

    return settings;
};

const updateSettings = async (settingsData, file, userId, requestInfo) => {
    let settings = await Setting.findOne();

    if (!settings) {
        settings = await Setting.create({});
    }

    Object.assign(settings, settingsData);

    if (file) {
        await deleteFromCloudinary(settings.companyLogoPublicId);

        const logo = await uploadToCloudinary(
            file.path,
            "edu-stock-store/company"
        );

        settings.companyLogo = logo.url;
        settings.companyLogoPublicId = logo.publicId;
    }

    await settings.save();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.SETTINGS,
        action: ACTIVITY_ACTIONS.UPDATE,
        recordId: settings._id,
        recordCode: "SYSTEM_SETTINGS",
        description: "Updated system settings.",
        ...requestInfo,
    });

    return settings;
};

module.exports = {
    getSettings,
    updateSettings,
};