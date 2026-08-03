const installationService = require("../services/installation.service");

module.exports = async (session) => {
    return installationService.createSettings(
        {
            lowStockThreshold: 10,
            dateFormat: "DD/MM/YYYY",
        },
        session
    );
};