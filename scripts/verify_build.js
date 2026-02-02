const http = require('http');

const buildConfig = {
    tasks: [
        {
            id: 'clean',
            command: 'echo "Cleaning..."',
            dependencies: []
        },
        {
            id: 'build-core',
            command: 'echo "Building Core..."', // Simple echo for Windows compatibility
            dependencies: ['clean']
        },
        {
            id: 'build-ui',
            command: 'echo "Building UI..."',
            dependencies: ['clean']
        },
        {
            id: 'test',
            command: 'echo "Running Tests..."',
            dependencies: ['build-core', 'build-ui']
        }
    ]
};

function postRequest(path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

function getRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function runTest() {
    try {
        console.log('Triggering Build...');
        const postData = JSON.stringify(buildConfig);
        const res = await postRequest('/api/build', postData);

        if (res.status !== 200) {
            throw new Error(`Failed to trigger build: ${JSON.stringify(res.body)}`);
        }

        console.log('Build Triggered:', res.body);
        const buildId = res.body.buildId;

        // Poll status
        const poll = setInterval(async () => {
            const statusRes = await getRequest(`/api/build/${buildId}`);
            const statusData = statusRes.body;
            console.log('Status:', statusData.status);

            if (statusData.status === 'success' || statusData.status === 'failed') {
                clearInterval(poll);
                console.log('Final Logs:', statusData.logs);
                if (statusData.status === 'failed') process.exit(1);
                process.exit(0);
            }
        }, 1000);

    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
}

runTest();
