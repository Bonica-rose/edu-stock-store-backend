require("dotenv").config();
const mongoose = require("mongoose")

const connectDB = async() => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI)
        console.log(
            `MongoDB ${conn.connection.name} connected at ${conn.connection.host}:${conn.connection.port}`
        );        
    } catch (err) {
        console.error("MongoDB Connection Failed");
        console.error(err.message);     
        process.exit(1);
    }
}

module.exports = connectDB