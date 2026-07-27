const Permissions = Object.freeze({
    PRODUCT_VIEW: "product:view",
    PRODUCT_CREATE: "product:create",
    PRODUCT_UPDATE: "product:update",
    PRODUCT_DELETE: "product:delete",

    ASSET_VIEW: "asset:view",
    ASSET_ASSIGN: "asset:assign",

    USER_MANAGE: "user:manage",
    
    USER_VIEW: "user:view",
    USER_UPDATE: "user:update",
    USER_CREATE: "user:create",
    USER_DELETE: "user:delete",
    USER_STATUS_UPDATE: "user:status:update",

    REPORT_VIEW: "report:view",

    SETTINGS_MANAGE: "settings:manage",
});

exports.PERMISSIONS = Permissions;