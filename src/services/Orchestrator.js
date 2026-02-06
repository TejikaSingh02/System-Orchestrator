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
     * The main function to trigger a build.
     * It decides whether to save to DB or just keep it in memory.
     * @param {Object} buildConfig - The tasks directly from the JSON body
     * @param {String} triggerType - Who triggered this? (manual/webhook)
     */
    async triggerBuild(buildConfig, triggerType = 'manual') {
        let build;

        // Check if DB is ready, otherwise fallback to RAM (Map)
        // This was a lifesaver during college presentation when Mongo crashed!
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
            console.warn('⚠️  Database not connected. Saving build to Memory.');
            const id = crypto.randomUUID();
            // Mocking the Mongoose object structure so the rest of the code doesn't break
            build = {
                _id: id,
                status: 'pending',
                trigger: triggerType,
                startTime: new Date(),
                triggeredBy: 'user',
                logs: [],
                // Mock save function
                save: async function () {
                    memoryBuilds.set(this._id.toString(), this);
                    return this;
                }
            };
            memoryBuilds.set(id, build);
        }

        // Notify frontend immediately that a build is queued
        this.emit('build-start', build);

        // Execute the build pipeline asynchronously.
        // We don't await this because we want to return the Build ID to the user ASAP.
        this.runBuild(build, buildConfig).catch(err => {
            console.error('❌ Critical execution error:', err);

            // If the whole runner crashes, mark build as failed
            build.status = 'failed';
            build.endTime = new Date();
            const errorMsg = `Critical Error: ${err.message}`;
            build.logs.push(errorMsg);

            if (typeof build.save === 'function') build.save();

            this.emit('build-update', build);
            this.emit('log', { buildId: build._id, message: errorMsg });
        });

        return build;
    }

    /**
     * Core Logic: Resolves the DAG and executes layers.
     */
    async runBuild(build, config) {
        try {
            // Update status to running
            build.status = 'running';
            if (typeof build.save === 'function') await build.save();

            this.emit('build-update', build);
            this.broadcastLog(build, '🚀 Build pipeline started...');

            // Step 1: Check for changed files (Git Integration)
            // If specific files are changed, we might skip some tasks (Implementation pending)
            const changedFiles = await GitService.getChangedFiles();
            const runAll = changedFiles === null;

            const changeMsg = `📂 Changed files: ${runAll ? 'ALL (Full Rebuild)' : changedFiles.join(', ')}`;
            this.broadcastLog(build, changeMsg);

            // Step 2: Build the Dependency Graph (DAG)
            // We clone the tasks array to avoid modifying the original config
            const tasks = config.tasks.map(t => ({ ...t }));
            const executionLayers = GraphService.buildDependencyGraph(tasks);

            const planMsg = `📋 Execution Plan (Layers): ${JSON.stringify(executionLayers)}`;
            this.broadcastLog(build, planMsg);

            // Step 3: Execute each layer sequentially
            // Tasks INSIDE a layer run in Parallel (Promise.all)
            for (const [index, layer] of executionLayers.entries()) {
                const tasksToRun = layer.map(taskId => tasks.find(t => t.id === taskId));

                const layerMsg = `\n⚡ [Layer ${index + 1}] Starting parallel execution: ${layer.join(', ')}`;
                this.broadcastLog(build, layerMsg);

                // Map each task to an execution promise
                const promises = tasksToRun.map(task => ExecutorService.executeTask(task, build._id));

                // Wait for ALL tasks in this layer to finish called "Barrier Synchronization"
                const results = await Promise.allSettled(promises);

                // Check for failures
                const failures = results.filter(r => r.status === 'rejected');
                if (failures.length > 0) {
                    throw new Error(`Execution stopped. Failed tasks: ${failures.map(f => f.reason.id).join(', ')}`);
                }

                // Log success for this layer
                results.forEach(r => {
                    this.broadcastLog(build, `✅ Task '${r.value.id}' completed.`);
                });

                // Save progress
                if (typeof build.save === 'function') await build.save();
            }

            // Mark as Success
            build.status = 'success';
            build.endTime = new Date();
            this.broadcastLog(build, '\n✨ Build Cycle Completed Successfully.');

            if (typeof build.save === 'function') await build.save();

            this.emit('build-update', build);

        } catch (error) {
            // Handle logical errors (like task failure)
            build.status = 'failed';
            build.endTime = new Date();
            this.broadcastLog(build, `\n⛔ Build Failed: ${error.message}`);

            if (typeof build.save === 'function') await build.save();
            this.emit('build-update', build);
        }
    }

    // Helper to log to both Socket.io and save to our build object's log history
    // Keeping it simple so I don't have to write duplicate code everywhere!
    broadcastLog(build, message) {
        // 1. Emit to Frontend (Real-time updates)
        this.emit('log', { buildId: build._id, message });

        // 2. Save to the build object (so it's stored in DB/Memory)
        if (build.logs) {
            build.logs.push(message);
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
