const mongoose = require("mongoose");

const User = require("../models/user.model");

const seedBranch = require("../seeders/branch.seeder");
const seedSettings = require("../seeders/settings.seeder");
const seedSuperAdmin = require("../seeders/superAdmin.seeder");

const ApiError = require("../utils/ApiError");

const getSetupStatus = async () => {
    const userCount = await User.countDocuments({
        deletedAt: null,
    });

    return {
        isSetupCompleted: userCount > 0,
    };
};

const runSetup = async (setupData) => {

    // Prevent running setup twice
    const existingUser = await User.exists({ deletedAt: null });
    if (existingUser) {
        throw new ApiError(409, "System has already been initialized.");
    }

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        // Create Head Office
        const branch = await seedBranch(session);

        // Create Default Settings
        await seedSettings(session);

        // Create Super Admin
        const admin = await seedSuperAdmin(setupData,  session, branch);

        // Update branch createdBy
        if (!branch.createdBy) {
            branch.createdBy = admin._id;
            branch.updatedBy = admin._id;

            await branch.save({ session });
        }

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