const socket = io();
let currentBuildId = null;

// ==========================================
// 🎯 SAMPLE BUILD SCENARIOS FOR DEMO
// Each scenario uses REAL Node.js scripts that do actual work on the project.
// ==========================================

const SAMPLE_BUILDS = {

    // ---- Scenario 1: Full Project Health Check ----
    // Shows: Sequential pipeline — Check env → Validate structure → Verify deps
    health_check: {
        name: '🩺 Project Health Check',
        description: 'Sequential pipeline that ACTUALLY checks your Node.js environment, verifies all source files exist, and confirms every dependency is installed.',
        tasks: [
            { id: 'check-environment', command: 'node scripts/tasks/check_node.js', dependencies: [] },
            { id: 'validate-structure', command: 'node scripts/tasks/validate_project.js', dependencies: ['check-environment'] },
            { id: 'verify-dependencies', command: 'node scripts/tasks/check_deps.js', dependencies: ['validate-structure'] }
        ]
    },

    // ---- Scenario 2: Parallel Real Analysis ----
    // Shows: env check + validate run in parallel, then analysis + tests in parallel, then report
    parallel_analysis: {
        name: '⚡ Parallel Code Analysis',
        description: 'Environment check and project validation run IN PARALLEL. Then code analysis and GraphService unit tests run IN PARALLEL. Shows real barrier synchronization.',
        tasks: [
            { id: 'check-environment', command: 'node scripts/tasks/check_node.js', dependencies: [] },
            { id: 'validate-structure', command: 'node scripts/tasks/validate_project.js', dependencies: [] },
            { id: 'analyze-code', command: 'node scripts/tasks/analyze_code.js', dependencies: ['check-environment', 'validate-structure'] },
            { id: 'test-graph', command: 'node scripts/tasks/test_graph.js', dependencies: ['check-environment', 'validate-structure'] },
            { id: 'generate-report', command: 'node scripts/tasks/generate_report.js', dependencies: ['analyze-code', 'test-graph'] }
        ]
    },

    // ---- Scenario 3: Complex DAG — Full Pipeline ----
    // Shows: Kahn's Algorithm across 4 real execution layers
    full_pipeline: {
        name: '🔀 Full Real Pipeline (4 Layers)',
        description: 'Clean → [env check + validate] in parallel → [code analysis + dep check + graph tests] in parallel → generate final report. 4 real execution layers resolved by Kahn\'s Algorithm.',
        tasks: [
            { id: 'clean',               command: 'node scripts/tasks/clean_dist.js',       dependencies: [] },
            { id: 'check-environment',   command: 'node scripts/tasks/check_node.js',       dependencies: ['clean'] },
            { id: 'validate-structure',  command: 'node scripts/tasks/validate_project.js', dependencies: ['clean'] },
            { id: 'analyze-code',        command: 'node scripts/tasks/analyze_code.js',     dependencies: ['check-environment', 'validate-structure'] },
            { id: 'verify-deps',         command: 'node scripts/tasks/check_deps.js',       dependencies: ['check-environment', 'validate-structure'] },
            { id: 'test-graph-service',  command: 'node scripts/tasks/test_graph.js',       dependencies: ['check-environment', 'validate-structure'] },
            { id: 'generate-report',     command: 'node scripts/tasks/generate_report.js',  dependencies: ['analyze-code', 'verify-deps', 'test-graph-service'] }
        ]
    },

    // ---- Scenario 4: Failure Handling ----
    // Shows: A real test failure (bad task command) halts the pipeline
    failure_demo: {
        name: '💥 Failure Handling Demo',
        description: 'Validate project and check env. Then deliberately runs a BROKEN command (calls a non-existent node script). Watch the pipeline halt with FAILED status — deploy never runs.',
        tasks: [
            { id: 'check-environment',  command: 'node scripts/tasks/check_node.js',       dependencies: [] },
            { id: 'validate-structure', command: 'node scripts/tasks/validate_project.js',  dependencies: ['check-environment'] },
            { id: 'run-tests',          command: 'node scripts/tasks/test_graph.js',        dependencies: ['validate-structure'] },
            { id: 'security-audit',     command: 'node scripts/tasks/nonexistent_task.js', dependencies: ['run-tests'] },
            { id: 'generate-report',    command: 'node scripts/tasks/generate_report.js',  dependencies: ['security-audit'] }
        ]
    },

    // ---- Scenario 5: Full CI/CD — All Real Scripts ----
    // Shows: Complete real pipeline using every script in sequence
    full_cicd: {
        name: '🏗️ Full CI/CD — All Real Tasks',
        description: 'The complete real pipeline: clean old artifacts, check environment, validate all files, verify deps, analyze source code, run unit tests on GraphService, then generate a real JSON build report in dist/',
        tasks: [
            { id: 'clean',              command: 'node scripts/tasks/clean_dist.js',       dependencies: [] },
            { id: 'check-environment',  command: 'node scripts/tasks/check_node.js',       dependencies: ['clean'] },
            { id: 'validate-structure', command: 'node scripts/tasks/validate_project.js', dependencies: ['clean'] },
            { id: 'verify-deps',        command: 'node scripts/tasks/check_deps.js',       dependencies: ['check-environment', 'validate-structure'] },
            { id: 'analyze-code',       command: 'node scripts/tasks/analyze_code.js',     dependencies: ['check-environment', 'validate-structure'] },
            { id: 'test-graph-service', command: 'node scripts/tasks/test_graph.js',       dependencies: ['verify-deps'] },
            { id: 'generate-report',    command: 'node scripts/tasks/generate_report.js',  dependencies: ['analyze-code', 'test-graph-service'] }
        ]
    }
};

// ==========================================
// Socket.io Event Listeners
// ==========================================

socket.on('connect', () => {
    console.log('✅ Connected to Orchestrator Server');
    fetchBuilds();
});

socket.on('build-start', (build) => {
    fetchBuilds();
    if (!currentBuildId) selectBuild(build._id);
});

socket.on('build-update', (build) => {
    updateBuildInList(build);
    if (currentBuildId === build._id) {
        setStatus(build.status);
    }
});

socket.on('log', (data) => {
    if (currentBuildId === data.buildId) {
        appendLog(data.message);
    }
});

// ==========================================
// Core Functions
// ==========================================

async function fetchBuilds() {
    try {
        const res = await fetch('/api/builds');
        const builds = await res.json();
        renderBuildList(builds);
    } catch (e) {
        console.error("Failed to fetch builds!", e);
    }
}

function renderBuildList(builds) {
    const list = document.getElementById('buildList');
    list.innerHTML = '';

    if (builds.length === 0) {
        list.innerHTML = '<li style="padding:20px; text-align: center; color: #8b949e;">No builds yet. Select a scenario and run it!</li>';
        return;
    }

    builds.forEach(build => {
        const li = document.createElement('li');
        li.className = `build-item ${currentBuildId === build._id ? 'active' : ''}`;
        li.onclick = () => selectBuild(build._id);

        const date = new Date(build.startTime).toLocaleTimeString();
        li.innerHTML = `
            <div>
                <strong>#${build._id.substr(0, 8)}</strong><br>
                <span style="color: #8b949e; font-size: 11px;">${date}</span>
            </div>
            <span class="status-badge ${build.status}">${build.status}</span>
        `;
        list.appendChild(li);
    });
}

async function selectBuild(id) {
    currentBuildId = id;
    fetchBuilds();

    const logsDiv = document.getElementById('logs');
    logsDiv.innerHTML = '<span style="color: #6e7681;">> Fetching logs...</span>';

    const res = await fetch(`/api/build/${id}`);
    const build = await res.json();

    setStatus(build.status);

    logsDiv.innerHTML = '';
    if (build.logs.length === 0) {
        logsDiv.innerHTML = '<span style="color: #6e7681;">> Output is empty...</span>';
    } else {
        build.logs.forEach(msg => appendLog(msg));
    }
}

function appendLog(message) {
    const logsDiv = document.getElementById('logs');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = `<div><span class="log-line-timestamp">[${time}]</span> ${message}</div>`;

    logsDiv.insertAdjacentHTML('beforeend', line);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

function setStatus(status) {
    const el = document.getElementById('currentStatus');
    el.className = `status-badge ${status}`;
    el.innerText = status.toUpperCase();
}

function updateBuildInList(build) {
    fetchBuilds();
}

// ==========================================
// Scenario Selection & Trigger
// ==========================================

function populateScenarioSelector() {
    const selector = document.getElementById('scenarioSelector');
    if (!selector) return;

    Object.entries(SAMPLE_BUILDS).forEach(([key, scenario]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = scenario.name;
        selector.appendChild(option);
    });

    // Show description of the default selected scenario
    updateScenarioDescription();
}

function updateScenarioDescription() {
    const selector = document.getElementById('scenarioSelector');
    const descBox = document.getElementById('scenarioDescription');
    if (!selector || !descBox) return;

    const selected = SAMPLE_BUILDS[selector.value];
    if (selected) {
        descBox.textContent = selected.description;

        // Show task count and dependency visualization
        const taskCount = selected.tasks.length;
        const parallelTasks = selected.tasks.filter(t => {
            // Find tasks that share the same dependencies (will run in parallel)
            return selected.tasks.some(other =>
                other.id !== t.id &&
                JSON.stringify(other.dependencies) === JSON.stringify(t.dependencies) &&
                t.dependencies.length > 0
            );
        }).length;

        const infoEl = document.getElementById('scenarioInfo');
        if (infoEl) {
            infoEl.innerHTML = `<span>📊 ${taskCount} tasks</span> • <span>⚡ ${parallelTasks} parallel</span> • <span>📐 ${countLayers(selected.tasks)} layers</span>`;
        }
    }
}

// Simple layer counter to preview execution plan
function countLayers(tasks) {
    const inDegree = {};
    const adj = {};
    tasks.forEach(t => { inDegree[t.id] = 0; adj[t.id] = []; });
    tasks.forEach(t => {
        (t.dependencies || []).forEach(dep => {
            adj[dep].push(t.id);
            inDegree[t.id]++;
        });
    });

    let queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);
    let layers = 0;
    while (queue.length > 0) {
        layers++;
        const next = [];
        queue.forEach(id => {
            adj[id].forEach(n => {
                inDegree[n]--;
                if (inDegree[n] === 0) next.push(n);
            });
        });
        queue = next;
    }
    return layers;
}

async function triggerSelectedBuild() {
    const selector = document.getElementById('scenarioSelector');
    const selectedKey = selector ? selector.value : 'basic';
    const scenario = SAMPLE_BUILDS[selectedKey];

    if (!scenario) {
        alert('Please select a valid scenario!');
        return;
    }

    // Disable button briefly to prevent double-clicks
    const btn = document.getElementById('runBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Triggering...';
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '▶ Run Build';
        }, 2000);
    }

    console.log(`Triggering build: ${scenario.name}`);
    await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: scenario.tasks })
    });
}

// Keep backward compatibility — old button calls this
async function triggerSampleBuild() {
    await triggerSelectedBuild();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    populateScenarioSelector();
});
