const PREDICTION_RISK = {
    CRITICAL: "CRITICAL",
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
};

const PREDICTION_RECOMMENDATIONS = {
    PURCHASE_IMMEDIATELY: "Purchase immediately.",
    PURCHASE_THIS_WEEK: "Place a purchase order this week.",
    MONITOR_CLOSELY: "Monitor inventory closely.",
    STOCK_HEALTHY: "Stock level is healthy.",
    NO_CONSUMPTION: "No recent stock consumption.",
};

const PREDICTION_SETTINGS = {
    ANALYSIS_DAYS: 30,

    CRITICAL_DAYS: 3,
    HIGH_DAYS: 7,
    MEDIUM_DAYS: 15,
};

module.exports = {
    PREDICTION_RISK,
    PREDICTION_RECOMMENDATIONS,
    PREDICTION_SETTINGS,
};