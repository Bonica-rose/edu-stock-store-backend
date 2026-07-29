const MAINTENANCE_STATUS = Object.freeze({
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
});

const MAINTENANCE_PRIORITY = Object.freeze({
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
});

module.exports = {
    MAINTENANCE_STATUS,
    MAINTENANCE_PRIORITY,
};