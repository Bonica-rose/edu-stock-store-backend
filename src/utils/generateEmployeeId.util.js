const { ROLE_CODES } = require("../constants/roles");
const { getNextSequence } = require("./getNextSequence.util");

const generateEmployeeId = async (role, session = null) => {
  const roleCode = ROLE_CODES[role];

  if (!roleCode) {
    throw new Error("Invalid role.");
  }

  const nextNumber = await getNextSequence(`employee-${roleCode}`, session);
  return `${roleCode}-EMP${String(nextNumber).padStart(4, "0")}`;
};

module.exports = generateEmployeeId;