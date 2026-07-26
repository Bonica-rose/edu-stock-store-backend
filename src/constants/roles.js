const ROLES = Object.freeze({
    SUPER_ADMIN: "Super Admin", // SAD
    BRANCH_ADMIN: "Branch Admin", // BAD
    INVENTORY_STAFF: "Inventory Staff", // IST
    MAINTENANCE_STAFF: "Maintenance Staff", // MST
    AUDITOR: "Auditor", // AUD
});

const ROLE_CODES = Object.freeze({
    [ROLES.SUPER_ADMIN]: "SAD",
    [ROLES.BRANCH_ADMIN]: "BAD",
    [ROLES.INVENTORY_STAFF]: "IST",
    [ROLES.MAINTENANCE_STAFF]: "MST",
    [ROLES.AUDITOR]: "AUD",
});

const BRANCH_ADMIN_ALLOWED_USER_ROLES = Object.freeze([
    ROLES.INVENTORY_STAFF,
    ROLES.MAINTENANCE_STAFF,
    ROLES.AUDITOR,
]);

module.exports = {
    ROLES,
    ROLE_CODES,
    BRANCH_ADMIN_ALLOWED_USER_ROLES,
};