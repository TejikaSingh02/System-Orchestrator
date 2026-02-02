const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class ExecutorService {
    /**
     * Executes a single build task.
     * @param {Object} task - Task object { id, command, cwd }
     * @param {String} buildId - ID of the current build
     * @returns {Promise} - Resolves when task completes, rejects on failure.
     */
    executeTask(task, buildId) {
        return new Promise((resolve, reject) => {
            console.log(`[Build ${buildId}] Starting task: ${task.id}`);
            const startTime = Date.now();

            const child = spawn(task.command, {
                cwd: task.cwd || process.cwd(),
                shell: true, // Important for Windows/Cross-platform compatibility
                stdio: 'pipe'
            });

            let output = '';

            child.stdout.on('data', (data) => {
                const str = data.toString();
                output += str;
                console.log(`[Task ${task.id}] ${str.trim()}`);
            });

            child.stderr.on('data', (data) => {
                const str = data.toString();
                output += str;
                console.error(`[Task ${task.id} ERROR] ${str.trim()}`);
            });

            child.on('close', (code) => {
                const duration = Date.now() - startTime;
                if (code === 0) {
                    console.log(`[Build ${buildId}] Task ${task.id} completed in ${duration}ms`);
                    resolve({ id: task.id, status: 'success', output, duration });
                } else {
                    console.error(`[Build ${buildId}] Task ${task.id} failed with code ${code}`);
                    reject({ id: task.id, status: 'failed', output, duration, code });
                }
            });

            child.on('error', (err) => {
                console.error(`[Build ${buildId}] Task ${task.id} failed to spawn:`, err);
                reject({ id: task.id, status: 'failed', error: err.message });
            });
        });
    }
}

module.exports = new ExecutorService();
