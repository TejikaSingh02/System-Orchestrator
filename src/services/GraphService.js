class GraphService {
    /**
     * Validates if the graph is acyclic and returns execution layers.
     * @param {Array} tasks - Array of task objects { id: string, dependencies: string[] }
     * @returns {Array[]} - Array of arrays, where each inner array contains task IDs that can be run in parallel.
     */
    buildDependencyGraph(tasks) {
        const adjList = new Map();
        const inDegree = new Map();
        const taskMap = new Map();

        // Initialize
        tasks.forEach(task => {
            taskMap.set(task.id, task);
            if (!adjList.has(task.id)) adjList.set(task.id, []);
            if (!inDegree.has(task.id)) inDegree.set(task.id, 0);
        });

        // Build Graph
        tasks.forEach(task => {
            if (task.dependencies) {
                task.dependencies.forEach(depId => {
                    if (!taskMap.has(depId)) {
                        throw new Error(`Dependency ${depId} for task ${task.id} not found.`);
                    }
                    adjList.get(depId).push(task.id);
                    inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
                });
            }
        });

        // Topological Sort (Kahn's Algorithm) with Layers
        const layers = [];
        let queue = [];

        // Find all nodes with 0 in-degree
        inDegree.forEach((count, id) => {
            if (count === 0) queue.push(id);
        });

        let processedCount = 0;

        while (queue.length > 0) {
            const currentLayer = [];
            const nextQueue = [];

            for (const taskId of queue) {
                currentLayer.push(taskId);
                processedCount++;

                const neighbors = adjList.get(taskId);
                if (neighbors) {
                    for (const neighbor of neighbors) {
                        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                        if (inDegree.get(neighbor) === 0) {
                            nextQueue.push(neighbor);
                        }
                    }
                }
            }

            layers.push(currentLayer);
            queue = nextQueue;
        }

        if (processedCount !== tasks.length) {
            throw new Error('Cyclic dependency detected in build configuration.');
        }

        return layers;
    }
}

module.exports = new GraphService();
