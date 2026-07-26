const errorHandler = (err, req, res, next) => {
    let { statusCode, message } = err;

    if (!statusCode) {
        statusCode = 500;
        message = process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message;
    }

    res.status(statusCode).json({
        success: false,
        message,
        // Only expose stack traces during local development
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack,
        }),
    });
};

module.exports = errorHandler;