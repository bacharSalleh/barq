// Tracks commands entered in the terminal and provides searchable history
export default function(ctx) {
  const STORAGE_KEY = "ttb-cmd-history";
  const store = ctx.store;
  const MAX_HISTORY = 500;
  let history = JSON.parse(store.getItem(STORAGE_KEY) || "[]");
  let currentLine = "";

  // Capture commands: when Enter is pressed, save the current line
  ctx.bus.on("input:before", (session, data) => {
    if (data === "\r" && !session.vt.isAlt) {
      // Read current line from VT buffer at cursor position
      const vt = session.vt;
      const row = vt.buffer[vt.curRow];
      if (row) {
        let line = "";
        for (const cell of row) line += cell.ch;
        line = line.trim();
        // Strip common prompts
        line = line.replace(/^[❯›\$#%>]\s*/, "").trim();
        if (line && line.length > 1 && line !== history[history.length - 1]) {
          history.push(line);
          if (history.length > MAX_HISTORY) history.shift();
          store.setItem(STORAGE_KEY, JSON.stringify(history));
        }
      }
    }
  });

  // Search history via command palette
  function searchHistory() {
    const overlay = document.getElementById("palette-overlay");
    const input = document.getElementById("palette-input");
    const list = document.getElementById("palette-list");

    input.style.display = "";
    input.placeholder = "Search command history…";
    input.value = "";
    overlay.classList.add("open");
    input.focus();

    let isHistoryMode = true;

    function render() {
      const q = input.value.toLowerCase();
      const filtered = q
        ? history.filter(h => h.toLowerCase().includes(q)).reverse().slice(0, 30)
        : history.slice().reverse().slice(0, 30);

      list.innerHTML = filtered.length
        ? filtered.map((h, i) =>
            `<div class="palette-item${i === 0 ? " active" : ""}" data-cmd="${h.replace(/"/g, "&quot;")}">
              <span>${escH(h)}</span>
              <span class="shortcut">${history.length - history.lastIndexOf(h)}</span>
            </div>`
          ).join("")
        : '<div style="padding:14px;color:var(--ui-fg2)">No history</div>';
    }

    function escH(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

    render();

    const onInput = () => { if (isHistoryMode) render(); };
    const onKeydown = (e) => {
      if (!isHistoryMode) return;
      if (e.key === "Escape") { cleanup(); e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === "Enter") {
        const active = list.querySelector(".palette-item.active");
        if (active) {
          cleanup();
          const s = ctx.getActive();
          if (s) { s.sendInput(active.dataset.cmd); ctx.hiddenInput.focus(); }
        }
        e.preventDefault(); e.stopPropagation(); return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(list.querySelectorAll(".palette-item"));
        const cur = items.findIndex(it => it.classList.contains("active"));
        const next = e.key === "ArrowDown" ? Math.min(items.length - 1, cur + 1) : Math.max(0, cur - 1);
        items.forEach(it => it.classList.remove("active"));
        if (items[next]) { items[next].classList.add("active"); items[next].scrollIntoView({ block: "nearest" }); }
        e.preventDefault(); e.stopPropagation();
      }
    };
    const onClick = (e) => {
      if (!isHistoryMode) return;
      const item = e.target.closest(".palette-item");
      if (item) {
        cleanup();
        const s = ctx.getActive();
        if (s) { s.sendInput(item.dataset.cmd); ctx.hiddenInput.focus(); }
      }
    };

    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeydown, true);
    list.addEventListener("click", onClick);

    function cleanup() {
      isHistoryMode = false;
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeydown, true);
      list.removeEventListener("click", onClick);
      overlay.classList.remove("open");
      input.placeholder = "Type a command…";
      ctx.hiddenInput.focus();
    }
  }

  ctx.commands.push(
    { name: "Search Command History", key: "Ctrl+Shift+R", action: searchHistory },
    { name: "Clear Command History", key: "", action: () => { history = []; store.removeItem(STORAGE_KEY); } },
  );

  ctx.bus.on("shortcut:cmd-history", searchHistory);
}
