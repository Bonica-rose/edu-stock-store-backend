require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const { ROLES } = require("../constants/roles");

const { hashPassword } = require("../services/auth.service");
const generateEmployeeId = require("../utils/generateEmployeeId.util");

const DEFAULT_BRANCH_NAME = "Head Office";

const seedSuperAdmin = async () => {
    try {
        await connectDB();

        // Validate environment variables
        const {
            SUPER_ADMIN_FIRST_NAME,
            SUPER_ADMIN_LAST_NAME,
            SUPER_ADMIN_EMAIL,
            SUPER_ADMIN_PASSWORD,
        } = process.env;

        if (
            !SUPER_ADMIN_FIRST_NAME ||
            !SUPER_ADMIN_LAST_NAME ||
            !SUPER_ADMIN_EMAIL ||
            !SUPER_ADMIN_PASSWORD
        ) {
            throw new Error("Missing Super Admin environment variables.");
        }

        // Validate password policy
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,}$/;

        if (!passwordRegex.test(SUPER_ADMIN_PASSWORD)) {
            throw new Error(
                "SUPER_ADMIN_PASSWORD does not meet password policy. Password contain at least one uppercase letter, one lowercase letter, one number, and one special character."
            );
        }

        // Check if Super Admin already exists
        const existingSuperAdmin = await User.findOne({
            deletedAt: null,
            $or: [
                { role: ROLES.SUPER_ADMIN },
                { email: SUPER_ADMIN_EMAIL },
            ],
        });

        if (existingSuperAdmin) {
            console.log("Super Admin already exists.");

            await mongoose.connection.close();
            process.exit(0);
        }

        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            let branch = await Branch.findOne({ branchCode: "HO" }).session(session);
            if (!branch) {
                const [newBranch] = await Branch.create(
                    [
                        {
                            branchCode: "HO",
                            branchName: DEFAULT_BRANCH_NAME,
                            address: "Main Office",
                            city: "Trivandrum",
                            state: "Kerala",
                            country: "India",
                            isActive: true,
                            createdBy: null,
                            updatedBy: null,
                        },
                    ],
                    { session }
                );

                branch = newBranch;
            }

            const hashedPassword = await hashPassword(SUPER_ADMIN_PASSWORD);

            const employeeId = await generateEmployeeId(ROLES.SUPER_ADMIN);

            const [superAdmin] = await User.create(
                [
                    {
                        firstName: SUPER_ADMIN_FIRST_NAME,
                        lastName: SUPER_ADMIN_LAST_NAME,
                        employeeId: employeeId,
                        email: SUPER_ADMIN_EMAIL,
                        password: hashedPassword,
                        role: ROLES.SUPER_ADMIN,
                        branch: branch._id,
                        phone: null,
                        profileImage: null,
                        isActive: true,
                        mustChangePassword: true,
                        passwordChangedAt: null,
                        lastLogin: null,
                        createdBy: null,
                        updatedBy: null,
                        deletedAt: null
                    },
                ],
                { session }
            );

            if (!branch.createdBy) {
                branch.createdBy = superAdmin._id;
                branch.updatedBy = superAdmin._id;
                await branch.save({ session });
            }

            await session.commitTransaction();

            console.log("Super Admin created successfully.");

        } catch (err) {
            await session.abortTransaction();
            throw err;

        } finally {
            await session.endSession();
        }

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error("Failed to seed Super Admin.");
        console.error(error);

        await mongoose.connection.close();

        process.exit(1);
    }
};

seedSuperAdmin();