// Keep last 20 copied items, paste from list
export default function(ctx) {
  const MAX = 20;
  let history = JSON.parse(sessionStorage.getItem("ttb-clipboard") || "[]");
  function save() { sessionStorage.setItem("ttb-clipboard", JSON.stringify(history)); }

  // Capture copies from selection-copy
  const origClipWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
  navigator.clipboard.writeText = function(text) {
    if (text && text.trim()) {
      history = history.filter(h => h !== text);
      history.unshift(text);
      if (history.length > MAX) history.pop();
      save();
    }
    return origClipWrite(text);
  };

  function showHistory() {
    const overlay = document.getElementById("palette-overlay");
    const input = document.getElementById("palette-input");
    const list = document.getElementById("palette-list");

    input.style.display = "";
    input.placeholder = "Search clipboard history…";
    input.value = "";
    overlay.classList.add("open");
    input.focus();

    let active = true;

    function render() {
      const q = input.value.toLowerCase();
      const filtered = q ? history.filter(h => h.toLowerCase().includes(q)) : history;
      list.innerHTML = filtered.length
        ? filtered.map((h, i) => {
          const preview = h.replace(/\n/g, "↵ ").slice(0, 60);
          return `<div class="palette-item${i===0?" active":""}" data-idx="${i}"><span>${esc(preview)}${h.length>60?"…":""}</span><span class="shortcut">${h.length}ch</span></div>`;
        }).join("")
        : '<div style="padding:14px;color:var(--ui-fg2)">No clipboard history</div>';
    }

    function esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
    render();

    const onInput = () => { if (active) render(); };
    const onKey = (e) => {
      if (!active) return;
      if (e.key === "Escape") { cleanup(); e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === "Enter") {
        const q = input.value.toLowerCase();
        const filtered = q ? history.filter(h => h.toLowerCase().includes(q)) : history;
        if (filtered.length) { cleanup(); const s = ctx.getActive(); if (s) s.sendInput(filtered[0]); ctx.hiddenInput.focus(); }
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

    function cleanup() {
      active = false;
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKey, true);
      overlay.classList.remove("open");
      input.placeholder = "Type a command…";
      ctx.hiddenInput.focus();
    }
  }

  ctx.commands.push(
    { name: "Clipboard History", key: "Ctrl+Shift+V", action: showHistory },
    { name: "Clipboard: Clear History", key: "", action: () => { history = []; save(); } },
  );

  ctx.bus.on("shortcut:clipboard-history", showHistory);
}
