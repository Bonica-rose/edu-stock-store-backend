const { ROLES } = require("../constants/roles");

const getBranchFilter = (user) => {
    if ([ROLES.BRANCH_ADMIN, ROLES.INVENTORY_STAFF, ROLES.MAINTENANCE_STAFF,].includes(user.role)) {
        return {
            branch: user.branch,
        };
    }

    return {};
};

module.exports = {
    getBranchFilter,
};