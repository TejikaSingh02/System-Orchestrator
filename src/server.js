require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const path = require('path');

const http = require('http');
const socketIo = require('socket.io');
const Orchestrator = require('./services/Orchestrator');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS enabled (useful when running frontend separately during dev)
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins for now (easier for testing)
        methods: ["GET", "POST"]
    }
});

// Pass the socket instance to our Orchestrator class
// This lets the Orchestrator send real-time logs to the frontend
Orchestrator.setSocket(io);

const PORT = process.env.PORT || 3000;

// Try connecting to MongoDB, but don't crash if it fails
// We can still run with In-Memory storage (see Orchestrator.js)
connectDB().catch(err => {
    console.log("MongoDB Connection Failed: Running in In-Memory Mode (Demo Mode)");
});

// Middleware setup
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve the dashboard UI

// API Routes
app.use('/api', apiRoutes);

// Fallback route: Serve index.html for any other request
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
server.listen(PORT, () => {
    console.log(`\n🚀 Build Orchestrator is live!`);
    console.log(`👉 Dashboard: http://localhost:${PORT}`);
    console.log(`👉 Test Build: Use the button on the dashboard or curl\n`);
});
