export default function(ctx) {
  const menu = document.getElementById("ctx-menu");

  document.addEventListener("contextmenu", (e) => {
    if (!e.target.closest(".terminal-wrap") && !e.target.closest("#terminals-container")) return;
    e.preventDefault();
    const sel = window.getSelection().toString();
    const link = e.target.closest(".term-link");
    menu.innerHTML = [
      `<div class="ctx-item" data-a="copy" ${sel ? "" : 'style="color:var(--ui-fg3);pointer-events:none"'}><span>Copy</span><span class="ctx-key">Cmd+C</span></div>`,
      `<div class="ctx-item" data-a="paste"><span>Paste</span><span class="ctx-key">Cmd+V</span></div>`,
      `<div class="ctx-sep"></div>`,
      sel ? `<div class="ctx-item" data-a="search-sel"><span>Search "${sel.slice(0,20)}"</span></div>` : "",
      link ? `<div class="ctx-item" data-a="open-url"><span>Open Link</span></div>` : "",
      sel ? `<div class="ctx-item" data-a="ai-fix"><span>🔧 Ask Claude to Fix</span></div>` : "",
      sel ? `<div class="ctx-item" data-a="ai-explain"><span>💡 Ask Claude to Explain</span></div>` : "",
      `<div class="ctx-sep"></div>`,
      `<div class="ctx-item" data-a="clear"><span>Clear</span></div>`,
      `<div class="ctx-item" data-a="find"><span>Find</span><span class="ctx-key">Cmd+Shift+F</span></div>`,
      `<div class="ctx-item" data-a="palette"><span>Command Palette</span><span class="ctx-key">Cmd+Shift+P</span></div>`,
    ].filter(Boolean).join("");
    menu._sel = sel; menu._link = link?.href;
    menu.style.left = Math.min(e.clientX, innerWidth - 200) + "px";
    menu.style.top = Math.min(e.clientY, innerHeight - 250) + "px";
    menu.classList.add("open");
  });

  menu.addEventListener("click", (e) => {
    const it = e.target.closest(".ctx-item"); if (!it) return;
    menu.classList.remove("open");
    const s = ctx.getActive();
    switch (it.dataset.a) {
      case "copy": navigator.clipboard.writeText(menu._sel || ""); break;
      case "paste": navigator.clipboard.readText().then(t => { if (t && s) s.sendInput(t); }); break;
      case "search-sel": if (ctx.openSearch) { ctx.openSearch(); document.getElementById("search-input").value = menu._sel; } break;
      case "open-url": if (menu._link) window.open(menu._link, "_blank"); break;
      case "ai-fix": if (s && menu._sel) { const p = `Fix this:\\n${menu._sel.slice(0,500).replace(/"/g,'\\"').replace(/\n/g,'\\n')}`; s.sendInput(`claude -p "${p}"\r`); } break;
      case "ai-explain": if (s && menu._sel) { const p = `Explain this in simple terms:\\n${menu._sel.slice(0,500).replace(/"/g,'\\"').replace(/\n/g,'\\n')}`; s.sendInput(`claude -p "${p}"\r`); } break;
      case "clear": if (s) s.sendInput("\x0c"); break;
      case "find": if (ctx.openSearch) ctx.openSearch(); break;
      case "palette": if (ctx.openPalette) ctx.openPalette(); break;
    }
    ctx.hiddenInput.focus();
  });

  document.addEventListener("click", () => menu.classList.remove("open"));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") menu.classList.remove("open"); });
}
