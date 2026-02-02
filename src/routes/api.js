const express = require('express');
const router = express.Router();
const Orchestrator = require('../services/Orchestrator');

// Trigger Build
router.post('/build', async (req, res) => {
    try {
        const buildConfig = req.body; // Expects JSON build definition
        if (!buildConfig || !buildConfig.tasks) {
            return res.status(400).json({ error: 'Invalid build configuration provided.' });
        }
        const build = await Orchestrator.triggerBuild(buildConfig, 'manual');
        res.json({ message: 'Build triggered', buildId: build._id, status: build.status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List Builds
router.get('/builds', async (req, res) => {
    try {
        const builds = await Orchestrator.listBuilds();
        res.json(builds);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Build Status
router.get('/build/:id', async (req, res) => {
    try {
        const build = await Orchestrator.getBuild(req.params.id);
        if (!build) return res.status(404).json({ error: 'Build not found' });
        res.json(build);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
