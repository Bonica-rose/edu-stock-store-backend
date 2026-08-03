require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");

const seedBranch = require("../seeders/branch.seeder");
const seedSettings = require("../seeders/settings.seeder");
const seedSuperAdmin = require("../seeders/superAdmin.seeder");

const validateEnv = () => {
    const required = [
        "SUPER_ADMIN_FIRST_NAME",
        "SUPER_ADMIN_LAST_NAME",
        "SUPER_ADMIN_EMAIL",
        "SUPER_ADMIN_PASSWORD",
    ];

    for (const key of required) {
        if (!process.env[key]) {
            throw new Error(`${key} is missing.`);
        }
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,}$/;
    if (!passwordRegex.test(process.env.SUPER_ADMIN_PASSWORD)
    ) {
        throw new Error("SUPER_ADMIN_PASSWORD does not meet password policy.");
    }
};

const runSeeder = async () => {

    await connectDB();
    validateEnv();
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        console.log("Starting database seed...");

        const adminData = {
            firstName: process.env.SUPER_ADMIN_FIRST_NAME,
            lastName: process.env.SUPER_ADMIN_LAST_NAME,
            email: process.env.SUPER_ADMIN_EMAIL,
            password: process.env.SUPER_ADMIN_PASSWORD,
        };

        const branch = await seedBranch(session);

        await seedSettings(session);
        
        const admin = await seedSuperAdmin(adminData, branch, session);

        if (!branch.createdBy) {
            branch.createdBy = admin._id;
            branch.updatedBy = admin._id;

            await branch.save({ session });
        }

        await session.commitTransaction();
        console.log("\n✔ Database seeded successfully.");

    } catch (err) {
        await session.abortTransaction();

        console.error("\n✖ Database seed failed.");
        console.error(err);

        process.exitCode = 1;
    } finally {
        await session.endSession();
        await mongoose.connection.close();
    }
};

runSeeder();