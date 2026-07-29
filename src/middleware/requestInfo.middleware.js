const requestInfo = (req, res, next) => {
    req.requestInfo = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        method: req.method,
        endpoint: req.originalUrl,
    };

    next();
};

module.exports = requestInfo;