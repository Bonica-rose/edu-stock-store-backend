const ACTIVITY_MODULES = Object.freeze({
    AUTH: "Authentication",
    USER: "User",
    BRANCH: "Branch",
    CATEGORY: "Category",
    VENDOR: "Vendor",
    PURCHASE: "Purchase",
    INVENTORY: "Inventory",
    ASSET: "Asset",
    MAINTENANCE: "Maintenance",
    SETTINGS: "Settings",
    REPORT: "Report",
});

const ACTIVITY_ACTIONS = Object.freeze({
    CREATE: "Create",
    UPDATE: "Update",
    DELETE: "Delete",
    VIEW: "View",

    LOGIN: "Login",
    LOGOUT: "Logout",
    CHANGE_PASSWORD: "Change Password",

    STATUS_CHANGE: "Status Change",

    ASSIGN: "Assign",
    RETURN: "Return",

    STOCK_IN: "Stock In",
    STOCK_OUT: "Stock Out",
    STOCK_TRANSFER: "Stock Transfer",
    STOCK_ADJUSTMENT: "Stock Adjustment",

    START_MAINTENANCE: "Start Maintenance",
    COMPLETE_MAINTENANCE: "Complete Maintenance",
    CANCEL_MAINTENANCE: "Cancel Maintenance",

    EXPORT: "Export",
});

module.exports = {
    ACTIVITY_MODULES,
    ACTIVITY_ACTIONS,
};