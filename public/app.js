const socket = io();
let currentBuildId = null;

// ==========================================
// Socket.io Event Listeners
// ==========================================

socket.on('connect', () => {
    console.log('✅ Connected to Orchestrator Server');
    fetchBuilds();
});

socket.on('build-start', (build) => {
    // If a new build starts, refresh the list to show it immediately
    fetchBuilds();
    // If I'm not looking at another build, auto-switch to the new one
    if (!currentBuildId) selectBuild(build._id);
});

socket.on('build-update', (build) => {
    // Ideally we should just update the specific DOM element to save bandwidth,
    // but for this project, just re-fetching the list is safer and easier.
    updateBuildInList(build);

    // If we are viewing this build, update the header status
    if (currentBuildId === build._id) {
        setStatus(build.status);
    }
});

socket.on('log', (data) => {
    // Only append logs if we are watching THIS build
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
        list.innerHTML = '<li style="padding:20px; text-align: center; color: #8b949e;">No builds yet. Trigger one!</li>';
        return;
    }

    builds.forEach(build => {
        const li = document.createElement('li');
        // 'active' class highlights the selected build
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
    fetchBuilds(); // Re-render to update the 'active' highlight

    // UX: Show loading state in logs
    const logsDiv = document.getElementById('logs');
    logsDiv.innerHTML = '<span style="color: #6e7681;">> Fetching logs...</span>';

    // Fetch full details from API
    const res = await fetch(`/api/build/${id}`);
    const build = await res.json();

    setStatus(build.status);

    // Clear and show logs
    logsDiv.innerHTML = '';
    if (build.logs.length === 0) {
        logsDiv.innerHTML = '<span style="color: #6e7681;">> Output is empty...</span>';
    } else {
        build.logs.forEach(msg => appendLog(msg));
    }
}

function appendLog(message) {
    const logsDiv = document.getElementById('logs');
    // Add a satisfying little timestamp to each log line
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = `<div><span class="log-line-timestamp">[${time}]</span> ${message}</div>`;

    logsDiv.insertAdjacentHTML('beforeend', line);
    logsDiv.scrollTop = logsDiv.scrollHeight; // Auto-scroll to bottom
}

function setStatus(status) {
    const el = document.getElementById('currentStatus');
    el.className = `status-badge ${status}`;
    el.innerText = status.toUpperCase();
}

function updateBuildInList(build) {
    fetchBuilds();
}

async function triggerSampleBuild() {
    // This defines a sample build for the demo. 
    // In a real version, this would be computed from the repo.
    const buildConfig = {
        tasks: [
            { id: 'clean', command: 'echo "Cleaning environment..."', dependencies: [] },
            { id: 'install', command: 'echo "Installing dependencies..."', dependencies: ['clean'] },
            { id: 'build:backend', command: 'echo "Compiling Backend..."', dependencies: ['install'] },
            { id: 'build:frontend', command: 'echo "Compiling Frontend..."', dependencies: ['install'] },
            { id: 'test', command: 'echo "Running integration tests..."', dependencies: ['build:backend', 'build:frontend'] },
            { id: 'deploy', command: 'echo "Deploying to Staging..."', dependencies: ['test'] }
        ]
    };

    console.log("Triggering build...");
    await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildConfig)
    });
}
