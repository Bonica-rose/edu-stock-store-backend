const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const branchRoutes = require("./routes/branch.routes");
const categoryRoutes = require("./routes/category.routes")

// Middlewares
const { logger } = require("./config/logger.js");
const notFound = require("./middleware/notFound.middleware");
const errorHandler = require("./middleware/error.middleware");
const { API_VERSION } = require("./constants/api");

const app = express();

// Security
app.use(helmet());

// CORS
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);


// Cookie Parser
app.use(cookieParser());

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use(logger);

// Routes 
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/users`, userRoutes);
app.use(`${API_VERSION}/branches`, branchRoutes);
app.use(`${API_VERSION}/categories`, categoryRoutes);

// 404
app.use(notFound);

// Global Error Handler (always last)
app.use(errorHandler);

module.exports = app;