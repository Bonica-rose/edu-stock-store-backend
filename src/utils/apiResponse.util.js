exports.successResponse = (
    res,
    statusCode,
    message,
    data = null,
    meta = null
) => {
    const response = {
        success: true, message, data,
    };

    if (meta) {
        response.meta = meta;
    }

    return res.status(statusCode).json(response);
};