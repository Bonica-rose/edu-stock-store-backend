const installationService = require("../services/installation.service");

module.exports = async (session) => {
    return installationService.createBranch(
        {
            branchCode: "HO",
            branchName: "Head Office",
            address: "Main Office",
            city: "Trivandrum",
            state: "Kerala",
            country: "India",
        },
        session
    );
};