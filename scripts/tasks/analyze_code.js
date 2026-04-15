// Real Task: Count lines of code across the project
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../');
const srcDir = path.join(root, 'src');
const publicDir = path.join(root, 'public');

function countLines(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
}

function scanDir(dirPath, ext) {
    const results = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory() && item.name !== 'node_modules') {
            results.push(...scanDir(fullPath, ext));
        } else if (item.isFile() && item.name.endsWith(ext)) {
            results.push(fullPath);
        }
    }
    return results;
}

console.log('=== SOURCE CODE ANALYSIS ===\n');

const jsFiles = scanDir(srcDir, '.js').concat(scanDir(publicDir, '.js'));
const htmlFiles = scanDir(publicDir, '.html');

let totalLines = 0;
let totalFiles = 0;

console.log('--- JavaScript Files ---');
jsFiles.forEach(f => {
    const lines = countLines(f);
    totalLines += lines;
    totalFiles++;
    const rel = path.relative(root, f);
    console.log(`  ${lines.toString().padStart(4)} lines  ${rel}`);
});

console.log('\n--- HTML Files ---');
htmlFiles.forEach(f => {
    const lines = countLines(f);
    totalLines += lines;
    totalFiles++;
    const rel = path.relative(root, f);
    console.log(`  ${lines.toString().padStart(4)} lines  ${rel}`);
});

console.log(`\n────────────────────────────────`);
console.log(`Total Files     : ${totalFiles}`);
console.log(`Total Lines     : ${totalLines}`);
console.log(`Avg Lines/File  : ${Math.round(totalLines / totalFiles)}`);
console.log(`\n✔ Code analysis complete.`);
