#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 3300;
const serverPath = path.join(__dirname, "..", "server.js");

// Start server
const child = spawn(process.execPath, [serverPath], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(PORT) },
});

// Open browser after a short delay
setTimeout(() => {
  const url = `http://localhost:${PORT}`;
  const cmd = os.platform() === "darwin" ? "open" : os.platform() === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
}, 800);

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => { child.kill("SIGINT"); process.exit(0); });
process.on("SIGTERM", () => { child.kill("SIGTERM"); process.exit(0); });
