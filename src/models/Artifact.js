const mongoose = require('mongoose');

const ArtifactSchema = new mongoose.Schema({
    buildId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Build',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    checksum: {
        type: String,
        required: true
    },
    permissions: {
        type: String, // e.g., '755', '644'
        default: '644'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Artifact', ArtifactSchema);
