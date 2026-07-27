const mapUser = (user) => {
    if (!user) return null;

    return {
        _id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,

        branch: user.branch,

        profileImage: user.profileImage,

        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,

        lastLogin: user.lastLogin,

        createdBy: user.createdBy,
        updatedBy: user.updatedBy,

        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

const mapUsers = (users = []) => {
    return users.map(mapUser);
};

module.exports = {
    mapUser,
    mapUsers,
};