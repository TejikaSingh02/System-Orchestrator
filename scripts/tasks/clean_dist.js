// Real Task: Clean up the dist/ folder
const fs = require('fs-extra');
const path = require('path');

const root = path.resolve(__dirname, '../../');
const distDir = path.join(root, 'dist');

console.log('=== CLEANUP TASK ===\n');

if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    console.log(`Found ${files.length} file(s) in dist/:`);
    files.forEach(f => console.log(`  - dist/${f}`));
    fs.emptyDirSync(distDir);
    console.log('\n🧹 dist/ directory cleared.');
} else {
    console.log('dist/ does not exist — nothing to clean.');
}

console.log('\n✔ Cleanup complete. Ready for fresh build.');
