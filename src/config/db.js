require("dotenv").config();
const mongoose = require("mongoose")

const connectDB = async() => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI)
        console.log('MongoDB connected',conn.connection.host);        
    } catch (err) {
        console.error("MongoDB Connection Failed");
        console.error(err.message);     
        process.exit(1);
    }
}

module.exports = connectDB