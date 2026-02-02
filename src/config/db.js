const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/build-orchestrator';
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected to', mongoURI);
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        // process.exit(1); // Don't exit, just log for now to debug startup
    }
};

module.exports = connectDB;
