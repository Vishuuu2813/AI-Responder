const { spawn, execSync } = require('child_process');
const path = require('path');

const botDir = path.join(__dirname, '../whatsapp-bot');

// Step 1: Install WhatsApp Bot dependencies in production
console.log("Installing WhatsApp Bot dependencies...");
try {
  execSync('npm install --omit=dev', { cwd: botDir, stdio: 'inherit' });
  console.log("✅ WhatsApp Bot dependencies installed.");
} catch (err) {
  console.error("❌ Failed to install WhatsApp Bot dependencies:", err.message);
}

// Step 2: Start Next.js App
console.log("Starting Next.js App...");
const nextProcess = spawn('npx', ['next', 'start'], { stdio: 'inherit', shell: true });

// Step 3: Start WhatsApp Bot Service
console.log("Starting WhatsApp Bot Service...");
const botProcess = spawn('node', ['index.js'], { cwd: botDir, stdio: 'inherit', shell: true });

nextProcess.on('exit', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code || 0);
});

botProcess.on('exit', (code) => {
  console.log(`WhatsApp Bot process exited with code ${code}`);
  process.exit(code || 0);
});
