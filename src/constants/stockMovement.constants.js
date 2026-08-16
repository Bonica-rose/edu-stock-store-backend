const STOCK_MOVEMENT_TYPES = Object.freeze({
    STOCK_IN: "Stock In",
    STOCK_OUT: "Stock Out",
    TRANSFER: "Transfer",
    ADJUSTMENT: "Adjustment",
});

const STOCK_MOVEMENT_REASONS = Object.freeze({
    PURCHASE: "Purchase",
    ISSUE: "Issue",
    RETURN: "Return",
    DAMAGE: "Damage",
    TRANSFER: "Transfer",
    ADJUSTMENT: "Adjustment",
    ASSET_CREATION: "Asset creation",
});

module.exports = {
    STOCK_MOVEMENT_TYPES,
    STOCK_MOVEMENT_REASONS,
};