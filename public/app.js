const socket = io();
let currentBuildId = null;

// Listen for connection
socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    fetchBuilds();
});

// Event Listeners
socket.on('build-start', (build) => {
    fetchBuilds(); // Refresh list
    if (!currentBuildId) selectBuild(build._id); // Auto-select if none selected
});

socket.on('build-update', (build) => {
    updateBuildInList(build);
    if (currentBuildId === build._id) {
        document.getElementById('currentStatus').className = `status ${build.status}`;
        document.getElementById('currentStatus').innerText = build.status.toUpperCase();
    }
});

socket.on('log', (data) => {
    if (currentBuildId === data.buildId) {
        appendLog(data.message);
    }
});

// Fetch Recent Builds
async function fetchBuilds() {
    const res = await fetch('/api/builds');
    const builds = await res.json();
    renderBuildList(builds);
}

function renderBuildList(builds) {
    const list = document.getElementById('buildList');
    list.innerHTML = '';

    builds.forEach(build => {
        const li = document.createElement('li');
        li.className = `build-item ${currentBuildId === build._id ? 'active' : ''}`;
        li.onclick = () => selectBuild(build._id);

        const date = new Date(build.startTime).toLocaleTimeString();
        li.innerHTML = `
            <div>
                <strong>#${build._id.substr(0, 8)}</strong><br>
                <span style="color: #8b949e; font-size: 12px;">${date}</span>
            </div>
            <span class="status ${build.status}">${build.status}</span>
        `;
        list.appendChild(li);
    });
}

async function selectBuild(id) {
    currentBuildId = id;
    fetchBuilds(); // Re-render to show active state

    // Clear logs and show status
    const logsDiv = document.getElementById('logs');
    logsDiv.innerHTML = 'Loading logs...';

    // Fetch full details
    const res = await fetch(`/api/build/${id}`);
    const build = await res.json();

    document.getElementById('currentStatus').className = `status ${build.status}`;
    document.getElementById('currentStatus').innerText = build.status.toUpperCase();

    logsDiv.innerHTML = build.logs.join('\n');
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

function appendLog(message) {
    const logsDiv = document.getElementById('logs');
    logsDiv.innerHTML += '\n' + message;
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

function updateBuildInList(build) {
    // Ideally update specific item, effectively we can just refetch for simplicity
    fetchBuilds();
}

async function triggerSampleBuild() {
    const buildConfig = {
        tasks: [
            { id: 'clean', command: 'echo "Cleaning environment..."', dependencies: [] },
            { id: 'install', command: 'echo "Installing dependencies..."', dependencies: ['clean'] },
            { id: 'build', command: 'echo "Compiling assets..."', dependencies: ['install'] },
            { id: 'test', command: 'echo "Running integration tests..."', dependencies: ['build'] },
            { id: 'deploy', command: 'echo "Deploying to staging..."', dependencies: ['test'] }
        ]
    };

    await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildConfig)
    });
}
