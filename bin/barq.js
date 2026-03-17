#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const args = process.argv.slice(2);
let PORT = process.env.PORT || 3300;
let noBrowser = false;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) { PORT = args[++i]; }
  else if (args[i] === "--no-open") { noBrowser = true; }
  else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`\n  barq ⚡ — web terminal with RTL support\n`);
    console.log(`  Usage: barq [options]\n`);
    console.log(`  Options:`);
    console.log(`    -p, --port <number>   Port to listen on (default: 3300)`);
    console.log(`    --no-open             Don't auto-open browser`);
    console.log(`    -h, --help            Show this help\n`);
    process.exit(0);
  }
}

const serverPath = path.join(__dirname, "..", "server.js");

// Start server
const child = spawn(process.execPath, [serverPath], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(PORT) },
});

// Open browser after a short delay
if (!noBrowser) {
  setTimeout(() => {
    const url = `http://localhost:${PORT}`;
    const cmd = os.platform() === "darwin" ? "open" : os.platform() === "win32" ? "start" : "xdg-open";
    spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
  }, 800);
}

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => { child.kill("SIGINT"); process.exit(0); });
process.on("SIGTERM", () => { child.kill("SIGTERM"); process.exit(0); });
