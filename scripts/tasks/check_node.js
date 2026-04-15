// Real Task: Check Node.js environment and system info
const os = require('os');
const path = require('path');

console.log('=== ENVIRONMENT CHECK ===');
console.log(`Node.js Version : ${process.version}`);
console.log(`Platform        : ${os.platform()} (${os.arch()})`);
console.log(`Hostname        : ${os.hostname()}`);
console.log(`CPU Cores       : ${os.cpus().length} cores`);
console.log(`Total RAM       : ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`Free RAM        : ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`Process CWD     : ${process.cwd()}`);
console.log(`Script Path     : ${path.resolve(__filename)}`);
console.log('');
console.log('✔ Environment check passed.');
