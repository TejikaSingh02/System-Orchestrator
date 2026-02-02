# Build Orchestrator

A powerful build orchestration system that provides an API to run tasks in parallel, manage dependencies, and detect changes.

## Features
- **Parallel Execution**: Automatically detects independent tasks and runs them concurrently.
- **Dependency Management**: Uses a Directed Acyclic Graph (DAG) to ensure correct execution order.
- **Incremental Builds**: Integraiton with Git to skip unchanged components (configured via source paths).
- **Resilient**: Works with MongoDB or falls back to In-Memory storage automatically.

## Prerequisites
- Node.js (v16+)
- MongoDB (Optional, but recommended for persistence)

## Installation

```bash
npm install
```

## Running the Server

Start the API server:
```bash
npm start
```
*The server runs on http://localhost:3000*

## Triggering a Build

You can trigger a build by sending a POST request to `/api/build` with your build configuration.

### Using the Test Script
We have included a verification script that triggers a sample build pipeline.

```bash
node scripts/verify_build.js
```

### via cURL
```bash
curl -X POST http://localhost:3000/api/build \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      { "id": "clean", "command": "echo cleaning" },
      { "id": "build", "command": "echo building", "dependencies": ["clean"] }
    ]
  }'
```
