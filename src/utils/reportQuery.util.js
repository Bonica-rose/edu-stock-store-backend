const getReportQuery = (query) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    // const limit = Math.max(parseInt(query.limit, 10) || 10, 1);

    const limit = query.export === "true"
        ? Number.MAX_SAFE_INTEGER
        : Math.max(parseInt(query.limit, 10) || 10, 1);

    return {
        page,
        limit,
        skip: (page - 1) * limit,

        search: query.search?.trim() || "",

        sortBy: query.sortBy || "createdAt",
        sortOrder: query.sortOrder === "asc" ? 1 : -1,

        from: query.from || null,
        to: query.to || null,
    };
};

module.exports = {
    getReportQuery,
};