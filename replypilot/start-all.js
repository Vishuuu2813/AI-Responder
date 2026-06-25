const { spawn } = require('child_process');
const path = require('path');

const webDir = path.join(__dirname, 'web');
const botDir = path.join(__dirname, 'whatsapp-bot');
const nextBin = path.join(webDir, 'node_modules/next/dist/bin/next');

console.log("Starting Next.js App...");
const nextProcess = spawn('node', [nextBin, 'start'], { cwd: webDir, stdio: 'inherit' });

console.log("Starting WhatsApp Bot Service...");
const botProcess = spawn('node', ['index.js'], { cwd: botDir, stdio: 'inherit' });

nextProcess.on('exit', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code || 0);
});

botProcess.on('exit', (code) => {
  console.log(`WhatsApp Bot process exited with code ${code}`);
  process.exit(code || 0);
});

// Clean up processes on exit
const cleanup = () => {
  try { nextProcess.kill(); } catch (e) {}
  try { botProcess.kill(); } catch (e) {}
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
