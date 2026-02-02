const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class GitService {
    /**
     * Get list of changed files between two commits.
     * If fromCommit is null, checks changes in working directory.
     */
    async getChangedFiles(toCommit = 'HEAD', fromCommit = null) {
        try {
            let command;
            if (fromCommit) {
                command = `git diff --name-only ${fromCommit} ${toCommit}`;
            } else {
                // Check for local modifications (staged and unstaged)
                command = 'git diff --name-only HEAD';
            }

            const { stdout } = await execPromise(command);
            return stdout.split('\n').filter(line => line.trim() !== '');
        } catch (error) {
            console.warn('GitService Warning: Could not detect changes, assuming full rebuild.', error.message);
            return null; // Return null to indicate "unknown changes" -> full rebuild
        }
    }

    async getCurrentCommitHash() {
        try {
            const { stdout } = await execPromise('git rev-parse HEAD');
            return stdout.trim();
        } catch (error) {
            return 'unknown';
        }
    }
}

module.exports = new GitService();
