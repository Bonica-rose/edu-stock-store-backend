const ASSET_STATUS = Object.freeze({
    AVAILABLE: "Available",
    ASSIGNED: "Assigned",
    UNDER_MAINTENANCE: "Under Maintenance",
    RETIRED: "Retired",
});

const ASSET_CONDITION = Object.freeze({
    GOOD: "Good",
    DAMAGED: "Damaged",
    UNDER_MAINTENANCE: "Under Maintenance",
    RETIRED: "Retired",
});

module.exports = {
    ASSET_STATUS,
    ASSET_CONDITION
}