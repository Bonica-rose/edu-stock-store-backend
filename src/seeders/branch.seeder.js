const installationService = require("../services/installation.service");

module.exports = async (data, session) => {
    return installationService.createBranch(
        data, 
        session
    );
};