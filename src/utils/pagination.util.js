const buildPagination = (page, limit, totalRecords) => ({
    page,
    limit,
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
});

module.exports = {
    buildPagination,
};