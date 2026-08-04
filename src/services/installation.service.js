const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const Settings = require("../models/settings.model");

const { ROLES } = require("../constants/roles");
const { hashPassword } = require("./auth.service");
const generateEmployeeId = require("../utils/generateEmployeeId.util");

exports.createBranch = async (branchData, session) => {
    let branch = await Branch.findOne({
        branchCode: branchData.branchCode,
        deletedAt: null,
    }).session(session);

    if (branch) {
        return branch;
    }

    [branch] = await Branch.create(
        [
            {
                branchCode: branchData.branchCode,
                branchName: branchData.branchName,
                address: branchData.address,
                city: branchData.city,
                state: branchData.state,
                country: branchData.country,
                phone: branchData.phone ?? null,
                email: branchData.email ?? null,
                isActive: true,
                createdBy: branchData.createdBy ?? null,
                updatedBy: null,
            },
        ],
        { session }
    );

    return branch;
};

exports.createSettings = async (settingsData, session) => {

    let settings = await Settings.findOne().session(session);
    if (settings) {
        return settings;
    }

    [settings] = await Settings.create(
        [
            {
                ...settingsData,
                createdBy: null,
                updatedBy: null,
            },
        ],
        { session }
    );

    return settings;
};

exports.createSuperAdmin = async (adminData, branch, session) => {

    const existingUser = await User.findOne({
        deletedAt: null,
        $or: [
            { role: ROLES.SUPER_ADMIN },
            { email: adminData.email },
        ],
    }).session(session);

    if (existingUser) {
        return existingUser;
    }

    const hashedPassword = await hashPassword(adminData.password);

    const employeeId = await generateEmployeeId(ROLES.SUPER_ADMIN);

    const [user] = await User.create(
        [
            {
                firstName: adminData.firstName,
                lastName: adminData.lastName,
                employeeId,
                email: adminData.email,
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
                deletedAt: null,
            },
        ],
        { session }
    );

    return user;
};