const User = require("../models/user.model");
const { ROLE_CODES } = require("../constants/roles");

const generateEmployeeId = async (role) => {
    const roleCode = ROLE_CODES[role];

    if (!roleCode) {
        throw new Error("Invalid role.");
    }

    const lastUser = await User.findOne({
        employeeId: new RegExp(`^${roleCode}-EMP`)
    })
        .sort({ employeeId: -1 })
        .select("employeeId");

    let nextNumber = 1;

    if (lastUser) {
        const lastNumber = parseInt(
            lastUser.employeeId.split("EMP")[1],
            10
        );
        nextNumber = lastNumber + 1;
    }

    return `${roleCode}-EMP${String(nextNumber).padStart(4, "0")}`;
};

module.exports = generateEmployeeId;