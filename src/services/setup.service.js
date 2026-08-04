const mongoose = require("mongoose");

const Settings = require("../models/settings.model");

const seedBranch = require("../seeders/branch.seeder");
const seedSettings = require("../seeders/settings.seeder");
const seedSuperAdmin = require("../seeders/superAdmin.seeder");

const ApiError = require("../utils/apiError.util");

const getSetupStatus = async () => {
    const settings = await Settings.findOne();
    return {
        isSetupCompleted: settings?.initialized ?? false,
    };
};

const runSetup = async (setupData) => {

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        // Prevent running setup twice
        const settings = await Settings.findOne().session(session);
        if (settings) {
            throw new ApiError(409, "System has already been initialized.");
        }

        // Create Head Office
        const branch = await seedBranch(setupData, session);

        // Create Default Settings
        const systemSettings = await seedSettings(session);

        // Create Super Admin
        const admin = await seedSuperAdmin(setupData, branch, session);

        branch.createdBy = admin._id;
        branch.updatedBy = admin._id;
        await branch.save({ session });

        systemSettings.initialized = true;
        await systemSettings.save({ session });

        await session.commitTransaction();

        return { branch, admin };

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

module.exports = {
    getSetupStatus,
    runSetup,
};