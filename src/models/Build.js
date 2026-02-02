const mongoose = require('mongoose');

const BuildSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['pending', 'running', 'success', 'failed'],
        default: 'pending'
    },
    trigger: {
        type: String,
        enum: ['manual', 'webhook'],
        default: 'manual'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    logs: [String],
    triggeredBy: String // e.g., commit hash or user ID
});

module.exports = mongoose.model('Build', BuildSchema);
