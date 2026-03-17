#!/usr/bin/env node

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const ROOT = path.join(__dirname, "..");

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

// ─── Pre-flight checks ────────────────────────────────────────
console.log(`\n  ⚡ barq — starting up\n`);

// Check node_modules
if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
  console.log("  📦 Installing dependencies...");
  try {
    execSync("npm install", { cwd: ROOT, stdio: "inherit" });
    console.log("  ✓ Dependencies installed\n");
  } catch {
    console.error("  ✗ Failed to install dependencies. Run: cd " + ROOT + " && npm install");
    process.exit(1);
  }
}

// Check Cascadia Code font
const fontPath = path.join(ROOT, "node_modules", "@fontsource", "cascadia-code");
if (fs.existsSync(fontPath)) {
  console.log("  ✓ Cascadia Code font ready");
} else {
  console.log("  ⚠ Cascadia Code font missing — reinstall: npm install @fontsource/cascadia-code");
}

// Check PTY helper
const ptyPath = path.join(ROOT, "pty-helper");
if (fs.existsSync(ptyPath)) {
  console.log("  ✓ PTY helper compiled");
} else {
  console.log("  🔧 Compiling PTY helper...");
  try {
    execSync("cc -o pty-helper pty-helper.c 2>/dev/null || cc -o pty-helper pty-helper.c -lutil", { cwd: ROOT, stdio: "ignore" });
    console.log("  ✓ PTY helper compiled");
  } catch {
    console.log("  ✗ PTY helper compilation failed — need a C compiler (cc/gcc/clang)");
    console.log("    Install Xcode CLI tools: xcode-select --install");
    process.exit(1);
  }
}

console.log(`  ✓ Port ${PORT}\n`);

// ─── Start server ──────────────────────────────────────────────
const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
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
