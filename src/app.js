const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const branchRoutes = require("./routes/branch.routes");
const categoryRoutes = require("./routes/category.routes")
const inventoryRoutes = require("./routes/inventory.routes")
const stockMoveRoutes = require("./routes/stockMovement.routes")
const purchaseRoutes = require("./routes/purchase.routes");
const assetRoutes = require("./routes/asset.routes");
const maintenanceRoutes = require("./routes/maintenance.routes.js");
const activityRoutes = require("./routes/activity.routes");
const settingRoutes = require("./routes/settings.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

// Middlewares
const { logger } = require("./config/logger.js");
const notFound = require("./middleware/notFound.middleware");
const errorHandler = require("./middleware/error.middleware");
const requestInfo = require("./middleware/requestInfo.middleware");
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

// Attach request information
app.use(requestInfo);

// Routes 
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/users`, userRoutes);
app.use(`${API_VERSION}/branches`, branchRoutes);
app.use(`${API_VERSION}/categories`, categoryRoutes);
app.use(`${API_VERSION}/inventory`, inventoryRoutes);
app.use(`${API_VERSION}/stock-movements`, stockMoveRoutes);
app.use(`${API_VERSION}/purchases`, purchaseRoutes);
app.use(`${API_VERSION}/assets`, assetRoutes);
app.use(`${API_VERSION}/maintenance`, maintenanceRoutes);
app.use(`${API_VERSION}/activity-log`, activityRoutes);
app.use(`${API_VERSION}/settings`, settingRoutes);
app.use(`${API_VERSION}/dashboard`, dashboardRoutes);

// 404
app.use(notFound);

// Global Error Handler (always last)
app.use(errorHandler);

module.exports = app;