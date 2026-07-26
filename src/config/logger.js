const fs = require('fs');
const path = require('path');
const morgan = require('morgan');

const logsDir = path.join(process.cwd(), "src/logs");

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const accessLogStream = fs.createWriteStream(
    path.join(logsDir, "access.log"),
    { flags: "a" }
);

exports.logger =
    process.env.NODE_ENV === "development"
        ? morgan("dev") // Prints to terminal ONLY
        : morgan("combined", {
            stream: accessLogStream, // Writes to file ONLY
        });

