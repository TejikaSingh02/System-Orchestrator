// Real Task: Generate a build report file in the project
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '../../');
const distDir = path.join(root, 'dist');
const reportPath = path.join(distDir, 'build-report.json');

console.log('=== GENERATING BUILD REPORT ===\n');

// Ensure dist/ exists
fs.ensureDirSync(distDir);
console.log(`Created directory: dist/`);

// Gather info
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));

const srcFiles = [];
function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir, { withFileTypes: true }).forEach(item => {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) scanDir(fullPath);
        else if (item.name.endsWith('.js') || item.name.endsWith('.html')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            srcFiles.push({
                file: path.relative(root, fullPath),
                lines: content.split('\n').length,
                bytes: Buffer.byteLength(content, 'utf-8')
            });
        }
    });
}
scanDir(path.join(root, 'src'));
scanDir(path.join(root, 'public'));

const totalLines = srcFiles.reduce((s, f) => s + f.lines, 0);
const totalBytes = srcFiles.reduce((s, f) => s + f.bytes, 0);

const report = {
    project: pkg.name,
    version: pkg.version,
    timestamp: new Date().toISOString(),
    builtBy: os.hostname(),
    nodeVersion: process.version,
    platform: `${os.platform()}/${os.arch()}`,
    summary: {
        totalFiles: srcFiles.length,
        totalLinesOfCode: totalLines,
        totalSizeKB: (totalBytes / 1024).toFixed(2)
    },
    dependencies: Object.keys(pkg.dependencies),
    files: srcFiles
};

fs.writeJsonSync(reportPath, report, { spaces: 2 });

console.log(`Report written   : dist/build-report.json`);
console.log(`Project          : ${report.project} v${report.version}`);
console.log(`Files processed  : ${report.summary.totalFiles}`);
console.log(`Total LOC        : ${report.summary.totalLinesOfCode}`);
console.log(`Total Size       : ${report.summary.totalSizeKB} KB`);
console.log('\n✔ Build report generated successfully.');
