export default function(ctx) {
  const sbLeft = document.getElementById("sb-left");
  let gitInfo = null;
  let pollTimer = null;

  async function fetchGit() {
    const s = ctx.getActive();
    if (!s?.cwd) return;
    try {
      const res = await fetch(`/api/git?cwd=${encodeURIComponent(s.cwd)}`);
      gitInfo = await res.json();
      updateDisplay();
    } catch { gitInfo = null; }
  }

  function updateDisplay() {
    if (!gitInfo?.branch) {
      // Remove git portion if present
      const existing = sbLeft.querySelector(".git-info");
      if (existing) existing.remove();
      return;
    }

    let el = sbLeft.querySelector(".git-info");
    if (!el) {
      el = document.createElement("span");
      el.className = "git-info";
      el.style.cssText = "margin-left:8px;cursor:pointer;";
      el.addEventListener("click", () => {
        if (ctx.openPalette) ctx.openPalette();
        // Pre-fill with "git"
        const pi = document.getElementById("palette-input");
        if (pi) { pi.value = "git"; pi.dispatchEvent(new Event("input")); }
      });
      sbLeft.appendChild(el);
    }

    const b = gitInfo.branch;
    const dirty = gitInfo.dirty ? " *" : "";
    const sync = [];
    if (gitInfo.ahead > 0) sync.push("↑" + gitInfo.ahead);
    if (gitInfo.behind > 0) sync.push("↓" + gitInfo.behind);
    const syncStr = sync.length ? " " + sync.join(" ") : "";

    el.innerHTML = `<span style="color:var(--c2)"> ${escH(b)}</span><span style="color:var(--c3)">${dirty}${syncStr}</span>`;
  }

  function escH(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  // Poll git info every 5s and on tab switch
  pollTimer = setInterval(fetchGit, 30000); // every 30s instead of 5s
  ctx.bus.on("session:activated", () => setTimeout(fetchGit, 200));
  ctx.bus.on("session:connected", () => setTimeout(fetchGit, 500));

  // Git commands for palette
  const gitCmds = [
    { name: "git: Status", action: "git status" },
    { name: "git: Log (oneline)", action: "git log --oneline -20" },
    { name: "git: Diff", action: "git diff" },
    { name: "git: Diff Staged", action: "git diff --staged" },
    { name: "git: Add All", action: "git add -A" },
    { name: "git: Commit", action: null, prompt: true },
    { name: "git: Pull", action: "git pull" },
    { name: "git: Push", action: "git push" },
    { name: "git: Stash", action: "git stash" },
    { name: "git: Stash Pop", action: "git stash pop" },
    { name: "git: Branches", action: "git branch -a" },
    { name: "git: Checkout…", action: null, prompt: true },
    { name: "git: Create Branch…", action: null, prompt: true },
  ];

  gitCmds.forEach(gc => {
    ctx.commands.push({
      name: gc.name, key: "", action: () => {
        const s = ctx.getActive();
        if (!s) return;
        if (gc.prompt) {
          if (gc.name.includes("Commit")) {
            const msg = prompt("Commit message:");
            if (msg) s.sendInput(`git commit -m "${msg.replace(/"/g, '\\"')}"\r`);
          } else if (gc.name.includes("Checkout")) {
            const branch = prompt("Branch name:");
            if (branch) s.sendInput(`git checkout ${branch}\r`);
          } else if (gc.name.includes("Create Branch")) {
            const branch = prompt("New branch name:");
            if (branch) s.sendInput(`git checkout -b ${branch}\r`);
          }
        } else {
          s.sendInput(gc.action + "\r");
        }
        ctx.hiddenInput.focus();
      }
    });
  });
}
