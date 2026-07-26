class ApiError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);

        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.success = false;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ApiError;