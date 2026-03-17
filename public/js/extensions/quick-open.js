export default function(ctx) {
  const overlay = document.getElementById("palette-overlay");
  const input = document.getElementById("palette-input");
  const list = document.getElementById("palette-list");
  let isQuickOpen = false;
  let debounceTimer = null;

  function open() {
    isQuickOpen = true;
    input.style.display = "";
    input.placeholder = "Find file…";
    input.value = "";
    list.innerHTML = '<div style="padding:14px;color:var(--ui-fg2)">Type to search files…</div>';
    overlay.classList.add("open");
    input.focus();
  }

  function close() {
    isQuickOpen = false;
    input.placeholder = "Type a command…";
    overlay.classList.remove("open");
    ctx.hiddenInput.focus();
  }

  async function search(q) {
    const s = ctx.getActive();
    const cwd = s?.cwd || "~";
    try {
      const res = await fetch(`/api/find?q=${encodeURIComponent(q)}&cwd=${encodeURIComponent(cwd)}`);
      const files = await res.json();

      if (!isQuickOpen) return;

      if (files.length === 0) {
        list.innerHTML = '<div style="padding:14px;color:var(--ui-fg2)">No files found</div>';
        return;
      }

      list.innerHTML = files.map((f, i) =>
        `<div class="palette-item${i === 0 ? " active" : ""}" data-idx="${i}" data-path="${f.path.replace(/"/g, "&quot;")}">
          <span style="color:var(--fg)">${esc(f.name)}</span>
          <span class="shortcut">${esc(f.rel)}</span>
        </div>`
      ).join("");
    } catch { list.innerHTML = '<div style="padding:14px;color:var(--ui-fg2)">Search error</div>'; }
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // Hijack palette input when in quick-open mode
  input.addEventListener("input", () => {
    if (!isQuickOpen) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    const q = input.value;
    if (q.length < 2) {
      list.innerHTML = '<div style="padding:14px;color:var(--ui-fg2)">Type to search files…</div>';
      return;
    }
    debounceTimer = setTimeout(() => search(q), 200);
  });

  input.addEventListener("keydown", (e) => {
    if (!isQuickOpen) return;
    if (e.key === "Escape") { close(); e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === "Enter") {
      const active = list.querySelector(".palette-item.active");
      if (active) {
        const p = active.dataset.path;
        close();
        const s = ctx.getActive();
        if (s) { s.sendInput(p + " "); ctx.hiddenInput.focus(); }
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
  }, true); // capture

  list.addEventListener("click", (e) => {
    if (!isQuickOpen) return;
    const item = e.target.closest(".palette-item");
    if (item) {
      close();
      const s = ctx.getActive();
      if (s) { s.sendInput(item.dataset.path + " "); ctx.hiddenInput.focus(); }
    }
  });

  ctx.commands.push({ name: "Quick Open File", key: "Ctrl+Shift+O", action: open });
  ctx.bus.on("shortcut:quick-open", () => isQuickOpen ? close() : open());
}
