const buildPagination = (page, limit, totalRecords) => ({
    page,
    limit,
    total: totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
});

module.exports = {
    buildPagination,
};