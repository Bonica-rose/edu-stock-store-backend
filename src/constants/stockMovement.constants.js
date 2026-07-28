const MOVEMENT_TYPES = Object.freeze({
    STOCK_IN: "Stock In",
    STOCK_OUT: "Stock Out",
    TRANSFER: "Transfer",
    ADJUSTMENT: "Adjustment",
});

const MOVEMENT_REASONS = Object.freeze({
    PURCHASE: "Purchase",
    ISSUE: "Issue",
    RETURN: "Return",
    DAMAGE: "Damage",
    TRANSFER: "Transfer",
    ADJUSTMENT: "Adjustment",
});

module.exports = {
    MOVEMENT_TYPES,
    MOVEMENT_REASONS,
}