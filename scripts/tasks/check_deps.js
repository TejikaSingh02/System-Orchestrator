// Real Task: Check if node_modules are installed and verify key dependencies
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../');

console.log('=== DEPENDENCY VERIFICATION ===\n');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const deps = Object.keys(pkg.dependencies || {});
const nodeModules = path.join(root, 'node_modules');

if (!fs.existsSync(nodeModules)) {
    console.error('❌ node_modules/ not found. Run: npm install');
    process.exit(1);
}

let allInstalled = true;
deps.forEach(dep => {
    const depPath = path.join(nodeModules, dep);
    const exists = fs.existsSync(depPath);
    if (!exists) allInstalled = false;

    // Try reading version from dep's package.json
    let version = 'unknown';
    try {
        const depPkg = JSON.parse(fs.readFileSync(path.join(depPath, 'package.json'), 'utf-8'));
        version = depPkg.version;
    } catch (_) {}

    console.log(`  [${exists ? '✔' : '✘'}] ${dep.padEnd(15)} v${version}`);
});

const totalModules = fs.readdirSync(nodeModules).length;
console.log(`\nTotal installed packages : ${totalModules}`);
console.log(allInstalled ? '\n✔ All required dependencies are installed.' : '\n❌ Missing dependencies detected!');

if (!allInstalled) process.exit(1);
