// Track and quick-jump to recent directories
export default function(ctx) {
  const KEY = "ttb-recent-dirs";
  const store = ctx.store;
  const MAX = 20;
  let dirs = JSON.parse(store.getItem(KEY) || "[]");
  function save() { store.setItem(KEY, JSON.stringify(dirs)); }

  // Track directory changes
  ctx.bus.on("session:activated", (s) => {
    if (s.cwd && !dirs.includes(s.cwd)) {
      dirs.unshift(s.cwd);
      if (dirs.length > MAX) dirs.pop();
      save();
    }
  });

  // Also track when cwd changes
  let lastCwd = {};
  ctx.bus.on("render:after", (session) => {
    if (session.cwd && session.cwd !== lastCwd[session.id]) {
      lastCwd[session.id] = session.cwd;
      dirs = dirs.filter(d => d !== session.cwd);
      dirs.unshift(session.cwd);
      if (dirs.length > MAX) dirs.pop();
      save();
    }
  });

  function showRecent() {
    const overlay = document.getElementById("palette-overlay");
    const input = document.getElementById("palette-input");
    const list = document.getElementById("palette-list");

    input.style.display = "";
    input.placeholder = "Jump to directory…";
    input.value = "";
    overlay.classList.add("open");
    input.focus();

    let active = true;

    function render() {
      const q = input.value.toLowerCase();
      const filtered = q ? dirs.filter(d => d.toLowerCase().includes(q)) : dirs;
      list.innerHTML = filtered.length
        ? filtered.map((d, i) => {
          const short = d.replace(/^\/Users\/[^/]+/, "~");
          return `<div class="palette-item${i===0?" active":""}" data-dir="${d}"><span>${short}</span></div>`;
        }).join("")
        : '<div style="padding:14px;color:var(--ui-fg2);">No recent directories</div>';
    }

    const onInput = () => { if (active) render(); };
    const onKey = (e) => {
      if (!active) return;
      if (e.key === "Escape") { cleanup(); e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === "Enter") {
        const act = list.querySelector(".palette-item.active");
        if (act) { cleanup(); const s = ctx.getActive(); if (s) { s.sendInput("cd " + act.dataset.dir + "\r"); ctx.hiddenInput.focus(); } }
        e.preventDefault(); e.stopPropagation(); return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(list.querySelectorAll(".palette-item"));
        const cur = items.findIndex(it => it.classList.contains("active"));
        const next = e.key === "ArrowDown" ? Math.min(items.length-1, cur+1) : Math.max(0, cur-1);
        items.forEach(it => it.classList.remove("active"));
        if (items[next]) items[next].classList.add("active");
        e.preventDefault(); e.stopPropagation();
      }
    };

    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKey, true);
    render();

    function cleanup() {
      active = false;
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKey, true);
      overlay.classList.remove("open");
      input.placeholder = "What do you want to do?";
      ctx.hiddenInput.focus();
    }
  }

  ctx.commands.push({ name: "Recent Directories", key: "Ctrl+Shift+G", action: showRecent });
  ctx.bus.on("shortcut:recent-dirs", showRecent);
}
