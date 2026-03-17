// Smart developer commands accessible from palette
export default function(ctx) {
  const cmds = [
    // Docker
    { name: "Docker: List Containers", action: "docker ps -a" },
    { name: "Docker: List Images", action: "docker images" },
    { name: "Docker: Compose Up", action: "docker compose up -d" },
    { name: "Docker: Compose Down", action: "docker compose down" },
    { name: "Docker: Compose Logs", action: "docker compose logs -f --tail=50" },
    // Node.js
    { name: "npm: Install", action: "npm install" },
    { name: "npm: Start", action: "npm start" },
    { name: "npm: Test", action: "npm test" },
    { name: "npm: Build", action: "npm run build" },
    { name: "npm: Dev", action: "npm run dev" },
    { name: "npm: Outdated", action: "npm outdated" },
    // Python
    { name: "Python: Venv Create", action: "python3 -m venv .venv && source .venv/bin/activate" },
    { name: "Python: Venv Activate", action: "source .venv/bin/activate" },
    { name: "Python: Pip Install Requirements", action: "pip install -r requirements.txt" },
    { name: "Python: Run", action: "python3 " },
    // Process management
    { name: "Kill Port…", action: null, prompt: "port" },
    { name: "Find Process…", action: null, prompt: "proc" },
    // File operations
    { name: "Find Large Files (>10MB)", action: "find . -size +10M -type f 2>/dev/null | head -20" },
    { name: "Disk Usage by Folder", action: "du -sh */ 2>/dev/null | sort -rh | head -20" },
    { name: "Count Lines of Code", action: "find . -name '*.py' -o -name '*.js' -o -name '*.ts' -o -name '*.go' -o -name '*.rs' | xargs wc -l 2>/dev/null | tail -1" },
    // Network
    { name: "My IP", action: "curl -s ifconfig.me && echo ''" },
    { name: "Test DNS", action: "nslookup google.com" },
  ];

  cmds.forEach(c => {
    ctx.commands.push({
      name: c.name, key: "", action: () => {
        const s = ctx.getActive();
        if (!s) return;
        if (c.prompt === "port") {
          const port = prompt("Port number:");
          if (port) s.sendInput(`lsof -ti:${port} | xargs kill -9 2>/dev/null && echo "Killed" || echo "Nothing on port ${port}"\r`);
        } else if (c.prompt === "proc") {
          const name = prompt("Process name:");
          if (name) s.sendInput(`ps aux | grep -i "${name}" | grep -v grep\r`);
        } else {
          s.sendInput(c.action + (c.action.endsWith(" ") ? "" : "\r"));
        }
        ctx.hiddenInput.focus();
      }
    });
  });
}
