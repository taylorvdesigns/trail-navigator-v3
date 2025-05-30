const { spawn } = require('child_process');
const killPort = require('kill-port');

// Function to kill processes on ports
async function killProcessOnPort(port) {
  try {
    await killPort(port);
    console.log(`Killed process on port ${port}`);
  } catch (err) {
    console.log(`No process running on port ${port}`);
  }
}

// Main function to run development environment
async function startDev() {
  // First kill any existing processes
  await killProcessOnPort(3000);
  await killProcessOnPort(3001);

  console.log('Starting development servers...');

  // Use npx to run concurrently directly
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  
  const dev = spawn(npx, [
    'concurrently',
    '--kill-others',
    'npm:start',
    'npm:start:proxy'
  ], {
    stdio: 'inherit',
    shell: true
  });

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\nShutting down servers...');
    await killProcessOnPort(3000);
    await killProcessOnPort(3001);
    process.exit(0);
  });

  dev.on('error', (err) => {
    console.error('Failed to start development servers:', err);
    process.exit(1);
  });
}

if (require.main === module) {
  startDev().catch(err => {
    console.error('Development server error:', err);
    process.exit(1);
  });
}

module.exports = {
  killProcessOnPort
}; 