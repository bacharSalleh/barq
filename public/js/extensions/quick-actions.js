// Quick action buttons — detect project type and show relevant actions
export default function(ctx) {

  async function detectProject() {
    const s = ctx.getActive();
    if (!s?.cwd) return [];
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(s.cwd)}&hidden=1`);
      const data = await res.json();
      const names = new Set((data.items || []).map(f => f.name));
      const actions = [];

      if (names.has("package.json")) {
        actions.push({ label: "npm install", cmd: "npm install" });
        actions.push({ label: "npm start", cmd: "npm start" });
        actions.push({ label: "npm test", cmd: "npm test" });
        actions.push({ label: "npm run dev", cmd: "npm run dev" });
        actions.push({ label: "npm run build", cmd: "npm run build" });
      }
      if (names.has("Makefile") || names.has("makefile")) {
        actions.push({ label: "make", cmd: "make" });
        actions.push({ label: "make test", cmd: "make test" });
        actions.push({ label: "make clean", cmd: "make clean" });
      }
      if (names.has("Cargo.toml")) {
        actions.push({ label: "cargo build", cmd: "cargo build" });
        actions.push({ label: "cargo run", cmd: "cargo run" });
        actions.push({ label: "cargo test", cmd: "cargo test" });
      }
      if (names.has("go.mod")) {
        actions.push({ label: "go build", cmd: "go build ./..." });
        actions.push({ label: "go test", cmd: "go test ./..." });
        actions.push({ label: "go run .", cmd: "go run ." });
      }
      if (names.has("requirements.txt") || names.has("setup.py") || names.has("pyproject.toml")) {
        actions.push({ label: "pip install", cmd: "pip install -r requirements.txt" });
        actions.push({ label: "pytest", cmd: "pytest" });
        actions.push({ label: "python main.py", cmd: "python3 main.py" });
      }
      if (names.has("docker-compose.yml") || names.has("docker-compose.yaml") || names.has("compose.yml") || names.has("compose.yaml")) {
        actions.push({ label: "compose up", cmd: "docker compose up -d" });
        actions.push({ label: "compose down", cmd: "docker compose down" });
        actions.push({ label: "compose logs", cmd: "docker compose logs -f --tail=50" });
      }
      if (names.has("Dockerfile")) {
        actions.push({ label: "docker build", cmd: "docker build -t $(basename $(pwd)) ." });
      }

      // Always available
      actions.push({ label: "git status", cmd: "git status" });
      actions.push({ label: "git pull", cmd: "git pull" });

      return actions;
    } catch { return []; }
  }

  async function showQuickActions() {
    const actions = await detectProject();
    if (!actions.length) { if(ctx.toast) ctx.toast("No project detected"); return; }

    // Inject into command palette
    if (ctx.openPalette) {
      // Register temporary commands
      for (let i = ctx.commands.length - 1; i >= 0; i--) if (ctx.commands[i]._qa) ctx.commands.splice(i, 1);
      actions.forEach(a => {
        ctx.commands.push({ name: "⚡ " + a.label, key: "", _qa: true, action: () => {
          const s = ctx.getActive();
          if (s) { s.sendInput(a.cmd + "\r"); ctx.hiddenInput.focus(); }
        }});
      });
      ctx.openPalette();
      const pi = document.getElementById("palette-input");
      if (pi) { pi.value = "⚡"; pi.dispatchEvent(new Event("input")); }
    }
  }

  ctx.commands.push({ name: "Quick Actions (detect project)", key: "Ctrl+Shift+A", action: showQuickActions });
  ctx.bus.on("shortcut:quick-actions", showQuickActions);
}
