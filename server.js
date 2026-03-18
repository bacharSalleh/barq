const express = require("express");
const http = require("http");
const fs = require("fs");
const { WebSocketServer } = require("ws");
const { spawn, execSync } = require("child_process");
const { StringDecoder } = require("string_decoder");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 3300;
const BATCH_MS = 2;
const IS_MAC = os.platform() === "darwin";

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, "public")));
app.use("/fonts/cascadia-code", express.static(path.join(__dirname, "node_modules/@fontsource/cascadia-code")));

function getProcessCwd(pid) {
  try {
    if (IS_MAC) {
      const out = execSync(`/usr/sbin/lsof -d cwd -a -p ${pid} -Fn 2>/dev/null`, { encoding: "utf8", timeout: 1000 });
      const match = out.match(/^n(.+)$/m);
      return match ? match[1] : null;
    } else { return fs.readlinkSync(`/proc/${pid}/cwd`); }
  } catch { return null; }
}

// REST APIs (compact)
app.get("/api/files", (req, res) => {
  const dir = req.query.path || os.homedir(); const resolved = path.resolve(dir);
  try {
    const items = fs.readdirSync(resolved, { withFileTypes: true })
      .filter(e => !e.name.startsWith(".") || req.query.hidden === "1")
      .map(e => ({ name: e.name, type: e.isDirectory() ? "dir" : e.isSymbolicLink() ? "link" : "file", path: path.join(resolved, e.name) }))
      .sort((a, b) => (a.type === "dir") !== (b.type === "dir") ? (a.type === "dir" ? -1 : 1) : a.name.localeCompare(b.name));
    res.json({ path: resolved, parent: path.dirname(resolved), items });
  } catch (err) { res.status(400).json({ error: err.message }); }
});
app.get("/api/find", (req, res) => {
  const q = req.query.q || "", dir = req.query.cwd || os.homedir();
  if (!q || q.length < 2) { res.json([]); return; }
  const find = spawn("find", [dir, "-maxdepth", "5", "-not", "-path", "*/.*", "-iname", `*${q}*`, "-type", "f"], { timeout: 3000 });
  let out = ""; find.stdout.on("data", d => out += d.toString());
  find.on("close", () => res.json(out.trim().split("\n").filter(Boolean).slice(0, 30).map(f => ({ name: path.basename(f), path: f, rel: path.relative(dir, f) }))));
  find.on("error", () => res.json([]));
});
app.get("/api/git", (req, res) => {
  const dir = req.query.cwd || os.homedir();
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD 2>/dev/null", { cwd: dir, encoding: "utf8", timeout: 2000 }).trim();
    let dirty = false; try { execSync("git diff --quiet HEAD 2>/dev/null", { cwd: dir, timeout: 2000 }); } catch { dirty = true; }
    const ahead = parseInt(execSync("git rev-list --count @{u}..HEAD 2>/dev/null || echo 0", { cwd: dir, encoding: "utf8", timeout: 2000 }).trim()) || 0;
    const behind = parseInt(execSync("git rev-list --count HEAD..@{u} 2>/dev/null || echo 0", { cwd: dir, encoding: "utf8", timeout: 2000 }).trim()) || 0;
    res.json({ branch, dirty, ahead, behind });
  } catch { res.json({ branch: null }); }
});
app.get("/api/file", (req, res) => {
  if (!req.query.path) return res.status(400).json({ error: "path required" });
  try {
    const resolved = path.resolve(req.query.path), stat = fs.statSync(resolved);
    if (stat.size > 1024 * 1024) return res.status(400).json({ error: "File too large" });
    res.json({ path: resolved, name: path.basename(resolved), ext: path.extname(resolved).slice(1), content: fs.readFileSync(resolved, "utf8"), size: stat.size });
  } catch (err) { res.status(400).json({ error: err.message }); }
});
app.post("/api/file", express.json({ limit: "2mb" }), (req, res) => {
  try { fs.writeFileSync(path.resolve(req.body.path), req.body.content, "utf8"); res.json({ ok: true }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
app.post("/api/exec", express.json(), (req, res) => {
  const dir = (req.body.cwd && fs.existsSync(req.body.cwd)) ? req.body.cwd : os.homedir();
  try { res.json({ output: execSync(req.body.cmd, { cwd: dir, encoding: "utf8", timeout: 10000, maxBuffer: 1024 * 1024 }) }); }
  catch (err) { res.json({ output: err.stdout || "", error: err.stderr || err.message }); }
});

// WebSocket — one PTY per connection via Python bridge
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  let bridge = null;
  const decoder = new StringDecoder("utf8");
  let sendBuf = "", sendTimer = null;

  function flush() { sendTimer = null; if (sendBuf && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "output", data: sendBuf })); sendBuf = ""; }
  function enqueue(chunk) { sendBuf += chunk; if (!sendTimer) sendTimer = setTimeout(flush, BATCH_MS); }

  function startBridge(cwd, cols, rows) {
    const dir = (cwd && fs.existsSync(cwd)) ? cwd : os.homedir();
    const helperPath = path.join(__dirname, "pty-helper");
    if (!fs.existsSync(helperPath)) {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "output", data: "\r\nError: pty-helper not found. Run: npm run build:pty\r\n" }));
      return;
    }
    const c = String(cols || 120), r = String(rows || 30);
    bridge = spawn(helperPath, [], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, TERM: "xterm-256color", COLUMNS: c, LINES: r }, cwd: dir });
    bridge.stdout.on("data", buf => enqueue(decoder.write(buf)));
    bridge.stderr.on("data", buf => enqueue(decoder.write(buf)));
    bridge.on("exit", code => { if (ws.readyState === ws.OPEN) { ws.send(JSON.stringify({ type: "exit", code: code ?? 0 })); ws.close(); } });
  }

  ws.on("message", raw => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === "init") { if (!bridge) startBridge(msg.cwd, msg.cols, msg.rows); return; }
    if (!bridge) return;
    if (msg.type === "input") bridge.stdin.write(msg.data);
    else if (msg.type === "resize") bridge.stdin.write(`\x1b]R;${msg.rows};${msg.cols}\x07`);
    else if (msg.type === "get-cwd") {
      let cwd = null;
      if (bridge?.pid) {
        try {
          const children = execSync(`pgrep -P ${bridge.pid} 2>/dev/null`, { encoding: "utf8", timeout: 1000 }).trim().split("\n");
          for (const cpid of children) { const d = getProcessCwd(parseInt(cpid)); if (d) { cwd = d; break; } }
          if (!cwd) cwd = getProcessCwd(bridge.pid);
        } catch {}
      }
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "cwd", cwd }));
    }
  });
  ws.on("close", () => { if (bridge) bridge.kill(); });
});

const helperExists = fs.existsSync(path.join(__dirname, "pty-helper"));
server.listen(PORT, () => {
  console.log(`\n  ⚡ barq running at http://localhost:${PORT}\n`);
  if (!helperExists) console.log(`  ⚠ pty-helper not compiled. Run: npm run build:pty`);
  console.log(`  Press Ctrl+C to stop\n`);
});
