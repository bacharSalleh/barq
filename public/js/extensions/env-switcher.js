// Quick switch between .env files (.env, .env.local, .env.production, etc.)
export default function(ctx) {

  async function listEnvFiles() {
    const s = ctx.getActive();
    if (!s?.cwd) return [];
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(s.cwd)}&hidden=1`);
      const data = await res.json();
      return (data.items || []).filter(f => f.name.startsWith(".env") && f.type === "file");
    } catch { return []; }
  }

  async function switchEnv() {
    const files = await listEnvFiles();
    if (!files.length) { if(ctx.toast) ctx.toast("No .env files found in current directory"); return; }
    const s = ctx.getActive();
    if (!s) return;

    const name = prompt(
      "Switch .env — copy which file to .env?\n\n" +
      files.map(f => f.name).join("\n") +
      "\n\nType the filename:"
    );
    if (!name) return;
    const match = files.find(f => f.name === name);
    if (!match) { if(ctx.toast) ctx.toast("File not found: " + name); return; }

    s.sendInput(`cp ${match.name} .env && echo "Switched to ${match.name}"\r`);
    ctx.hiddenInput.focus();
  }

  async function viewEnv() {
    const s = ctx.getActive();
    if (!s?.cwd) return;
    if (ctx.openFile) ctx.openFile(s.cwd + "/.env");
  }

  ctx.commands.push(
    { name: "Env: Switch .env file…", key: "", action: switchEnv },
    { name: "Env: View .env", key: "", action: viewEnv },
    { name: "Env: Create .env from .env.example", key: "", action: () => {
      const s = ctx.getActive();
      if (s) { s.sendInput('cp .env.example .env && echo "Created .env from .env.example"\r'); ctx.hiddenInput.focus(); }
    }},
  );
}
