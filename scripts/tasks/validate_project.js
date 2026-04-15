// Real Task: Read package.json and validate project structure
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../');

console.log('=== PROJECT VALIDATION ===');

// 1. Read package.json
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) {
    console.error('❌ package.json not found!');
    process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
console.log(`Project Name    : ${pkg.name}`);
console.log(`Version         : ${pkg.version}`);
console.log(`Entry Point     : ${pkg.main}`);
console.log(`Dependencies    : ${Object.keys(pkg.dependencies || {}).join(', ')}`);

// 2. Verify critical source files exist
const criticalFiles = [
    'src/server.js',
    'src/services/Orchestrator.js',
    'src/services/ExecutorService.js',
    'src/services/GraphService.js',
    'src/services/GitService.js',
    'src/routes/api.js',
    'src/config/db.js',
    'src/models/Build.js',
    'public/index.html',
    'public/app.js'
];

console.log('\n--- File Integrity Check ---');
let allGood = true;
criticalFiles.forEach(file => {
    const exists = fs.existsSync(path.join(root, file));
    console.log(`  [${exists ? '✔' : '✘'}] ${file}`);
    if (!exists) allGood = false;
});

// 3. Count source files
const srcFiles = fs.readdirSync(path.join(root, 'src'), { recursive: true })
    .filter(f => f.endsWith('.js'));
console.log(`\nTotal .js files in /src : ${srcFiles.length}`);
console.log(allGood ? '\n✔ Project structure is valid.' : '\n❌ Project structure has issues!');

if (!allGood) process.exit(1);
