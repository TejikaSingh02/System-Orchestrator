const mongoose = require('mongoose');
const Build = require('../models/Build');
const Artifact = require('../models/Artifact');
const GraphService = require('./GraphService');
const ExecutorService = require('./ExecutorService');
const GitService = require('./GitService');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// In-Memory Storage
const memoryBuilds = new Map();

class Orchestrator {

    setSocket(io) {
        this.io = io;
    }

    emit(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    get isDbConnected() {
        return mongoose.connection.readyState === 1;
    }

    /**
     * Triggers a new build based on a config.
     * @param {Object} buildConfig - The build definition JSON
     * @param {String} triggerType - 'manual' or 'webhook'
     */
    async triggerBuild(buildConfig, triggerType = 'manual') {
        let build;
        if (this.isDbConnected) {
            build = new Build({
                status: 'pending',
                trigger: triggerType,
                startTime: new Date(),
                triggeredBy: 'user',
                logs: []
            });
            await build.save();
        } else {
            console.warn('DB disconnected. Using In-Memory storage.');
            const id = crypto.randomUUID();
            build = {
                _id: id,
                status: 'pending',
                trigger: triggerType,
                startTime: new Date(),
                triggeredBy: 'user',
                logs: [],
                save: async function () { memoryBuilds.set(this._id.toString(), this); return this; } // Mock save
            };
            memoryBuilds.set(id, build);
        }

        this.emit('build-start', build);

        // Run asynchronously to not block API
        this.runBuild(build, buildConfig).catch(err => {
            console.error('Build execution error:', err);
            build.status = 'failed';
            build.endTime = new Date();
            build.logs.push(`Critical Error: ${err.message}`);
            if (typeof build.save === 'function') build.save();

            this.emit('build-update', build);
            this.emit('log', { buildId: build._id, message: `Critical Error: ${err.message}` });
        });

        return build;
    }

    async runBuild(build, config) {
        try {
            build.status = 'running';
            if (typeof build.save === 'function') await build.save();

            this.emit('build-update', build);
            this.emit('log', { buildId: build._id, message: 'Build started...' });
            build.logs.push('Build started...');

            // 1. Git Change Detection
            const changedFiles = await GitService.getChangedFiles();
            const runAll = changedFiles === null;

            const msg1 = `Changed files: ${runAll ? 'ALL (Full Rebuild)' : changedFiles.join(', ')}`;
            build.logs.push(msg1);
            this.emit('log', { buildId: build._id, message: msg1 });

            // 2. Build Dependency Graph
            const tasks = config.tasks.map(t => ({ ...t })); // Clone
            const executionLayers = GraphService.buildDependencyGraph(tasks);

            const msg2 = `Execution Plan: ${JSON.stringify(executionLayers)}`;
            build.logs.push(msg2);
            this.emit('log', { buildId: build._id, message: msg2 });

            // 3. Execute Layers
            for (const layer of executionLayers) {
                const tasksToRun = layer.map(taskId => tasks.find(t => t.id === taskId));

                const msg3 = `Starting Layer: ${layer.join(', ')}`;
                build.logs.push(msg3);
                this.emit('log', { buildId: build._id, message: msg3 });

                const promises = tasksToRun.map(task => ExecutorService.executeTask(task, build._id));

                const results = await Promise.allSettled(promises);

                const failures = results.filter(r => r.status === 'rejected');
                if (failures.length > 0) {
                    throw new Error(`Layer failed: ${failures.map(f => f.reason.id).join(', ')}`);
                }

                results.forEach(r => {
                    const msg4 = `Task ${r.value.id} completed.`;
                    build.logs.push(msg4);
                    this.emit('log', { buildId: build._id, message: msg4 });
                });
                if (typeof build.save === 'function') await build.save();
            }

            build.status = 'success';
            build.endTime = new Date();
            build.logs.push('Build completed successfully.');
            if (typeof build.save === 'function') await build.save();

            this.emit('log', { buildId: build._id, message: 'Build completed successfully.' });
            this.emit('build-update', build);

        } catch (error) {
            build.status = 'failed';
            build.endTime = new Date();
            build.logs.push(`Build failed: ${error.message}`);
            if (typeof build.save === 'function') await build.save();

            this.emit('log', { buildId: build._id, message: `Build failed: ${error.message}` });
            this.emit('build-update', build);
        }
    }

    async listBuilds() {
        if (this.isDbConnected) {
            return await Build.find().sort({ startTime: -1 }).limit(10);
        }
        return Array.from(memoryBuilds.values()).sort((a, b) => b.startTime - a.startTime);
    }

    async getBuild(id) {
        if (this.isDbConnected) {
            try {
                return await Build.findById(id);
            } catch (e) { return null; }
        }
        return memoryBuilds.get(id);
    }
}

module.exports = new Orchestrator();
