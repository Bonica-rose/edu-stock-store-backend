const Permissions = Object.freeze({
    USER_MANAGE: "user:manage",
    
    USER_VIEW: "user:view",
    USER_UPDATE: "user:update",
    USER_CREATE: "user:create",
    USER_DELETE: "user:delete",
    USER_STATUS_UPDATE: "user:status:update",

    BRANCH_VIEW: "branch:view",
    BRANCH_UPDATE: "branch:update",
    BRANCH_CREATE: "branch:create",

    CATEGORY_VIEW: "category:view",
    CATEGORY_CREATE: "category:create",
    CATEGORY_UPDATE: "category:update",
    CATEGORY_DELETE: "category:delete",

    PRODUCT_VIEW: "product:view",
    PRODUCT_CREATE: "product:create",
    PRODUCT_UPDATE: "product:update",
    PRODUCT_DELETE: "product:delete",

    ASSET_VIEW: "asset:view",
    ASSET_ASSIGN: "asset:assign",



    REPORT_VIEW: "report:view",

    SETTINGS_MANAGE: "settings:manage",
});

exports.PERMISSIONS = Permissions;