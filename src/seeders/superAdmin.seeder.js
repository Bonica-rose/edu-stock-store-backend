const installationService = require("../services/installation.service");

module.exports = async (adminData, branch, session) => {
    
    return installationService.createSuperAdmin(
        adminData,
        branch,
        session
    );
};