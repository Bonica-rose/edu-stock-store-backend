const installationService = require("../services/installation.service");

module.exports = async (adminData, session, branch) => {
    
    return installationService.createSuperAdmin(
        adminData,
        branch,
        session
    );
};