export default function(ctx) {
  const overlay = document.getElementById("palette-overlay");
  const input = document.getElementById("palette-input");
  const list = document.getElementById("palette-list");
  let idx = 0, filtered = [];

  function open() { input.style.display = ""; overlay.classList.add("open"); input.value = ""; idx = 0; render(); input.focus(); }
  function close() { overlay.classList.remove("open"); input.style.display = ""; ctx.hiddenInput.focus(); }

  function render() {
    const q = input.value.toLowerCase();
    filtered = q ? ctx.commands.filter(c => c.name.toLowerCase().includes(q)) : ctx.commands;
    idx = Math.min(idx, Math.max(0, filtered.length - 1));
    list.innerHTML = filtered.map((c, i) =>
      `<div class="palette-item${i === idx ? " active" : ""}" data-idx="${i}"><span>${c.name}</span><span class="shortcut">${c.key || ""}</span></div>`
    ).join("");
  }

  function run(i) { const c = filtered[i]; if (c) { close(); c.action(); } }

  input.addEventListener("input", () => { idx = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { idx = Math.min(filtered.length - 1, idx + 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { idx = Math.max(0, idx - 1); render(); e.preventDefault(); }
    else if (e.key === "Enter") { run(idx); e.preventDefault(); }
    else if (e.key === "Escape") { close(); e.preventDefault(); }
    e.stopPropagation();
  });
  list.addEventListener("click", (e) => { const it = e.target.closest(".palette-item"); if (it) run(parseInt(it.dataset.idx)); });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  ctx.openPalette = open;
  ctx.closePalette = close;

  // Show shortcuts help via palette
  ctx.showShortcuts = function() {
    const items = [["Ctrl+Shift+T","New tab"],["Ctrl+Shift+W","Close tab"],["Ctrl+Tab","Next tab"],
      ["Ctrl+Shift+P","Command palette"],["Ctrl+Shift+F","Search"],["Ctrl+=/- ","Zoom"],
      ["Double-click tab","Rename"],["Right-click","Context menu"],["Select text","Auto-copy"],["Ctrl+Shift+?","This help"]];
    input.style.display = "none";
    list.innerHTML = `<div style="padding:12px 14px"><h3 style="color:var(--accent);margin-bottom:8px;font-size:14px">Keyboard Shortcuts</h3>${
      items.map(([k, d]) => `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${d}</span><code style="color:var(--accent);background:var(--ui-bg3);padding:1px 6px;border-radius:3px;font-size:11px">${k}</code></div>`).join("")
    }</div>`;
    overlay.classList.add("open");
  };

  ctx.bus.on("shortcut:palette", () => overlay.classList.contains("open") ? close() : open());
  ctx.bus.on("shortcut:help", ctx.showShortcuts);
}
