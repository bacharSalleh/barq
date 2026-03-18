// Persistent scratchpad — quick notes that survive refreshes
export default function(ctx) {
  const store = ctx.store;
  const KEY = "ttb-scratchpad";

  function openPad() {
    const saved = store.getItem(KEY) || "";

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:500px;height:60vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--ui-border);";
    header.innerHTML = '<span style="font-size:14px;font-weight:600;color:var(--fg);">📝 Scratchpad</span>';

    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;gap:6px;";

    const insertBtn = document.createElement("button");
    insertBtn.textContent = "Insert to terminal";
    insertBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:4px;padding:3px 10px;cursor:pointer;font-family:inherit;font-size:11px;";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";

    btns.append(insertBtn, closeBtn);
    header.appendChild(btns);

    const ta = document.createElement("textarea");
    ta.style.cssText = "flex:1;background:var(--bg);color:var(--fg);border:none;padding:14px 16px;font-family:inherit;font-size:13px;line-height:1.6;resize:none;outline:none;";
    ta.value = saved;
    ta.placeholder = "Quick notes, snippets, TODOs...\nSaved automatically.";
    ta.spellcheck = false;

    // Auto-save
    let saveTimer;
    ta.addEventListener("input", () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => store.setItem(KEY, ta.value), 500);
    });

    const footer = document.createElement("div");
    footer.style.cssText = "padding:4px 16px;border-top:1px solid var(--ui-border);font-size:10px;color:var(--ui-fg3);display:flex;justify-content:space-between;";
    footer.innerHTML = '<span>Auto-saved to localStorage</span><span id="pad-count"></span>';

    function updateCount() { footer.querySelector("#pad-count").textContent = ta.value.length + " chars"; }
    ta.addEventListener("input", updateCount);

    const close = () => { store.setItem(KEY, ta.value); overlay.remove(); ctx.hiddenInput.focus(); };
    closeBtn.onclick = close;
    insertBtn.onclick = () => { const s = ctx.getActive(); if (s && ta.value) s.sendInput(ta.value); close(); };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    ta.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); e.stopPropagation(); } e.stopPropagation(); });

    modal.append(header, ta, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    ta.focus();
    updateCount();
  }

  ctx.commands.push({ name: "📝 Scratchpad", key: "Ctrl+Shift+N", action: openPad });
  ctx.bus.on("shortcut:scratchpad", openPad);
}
