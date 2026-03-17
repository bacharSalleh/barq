export default function(ctx) {
  const menu = document.createElement("div");
  menu.style.cssText = "display:none;position:fixed;z-index:60;background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:8px;padding:4px 0;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,.5);backdrop-filter:blur(8px);font-size:12px;";
  document.body.appendChild(menu);

  let targetSession = null;

  document.getElementById("tab-bar").addEventListener("contextmenu", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    e.preventDefault();

    targetSession = ctx.sessions.find(s => s.tabEl === tab);
    if (!targetSession) return;

    const idx = ctx.sessions.indexOf(targetSession);
    const isPinned = targetSession._pinned;
    const hasGroup = !!targetSession._group;

    menu.innerHTML = [
      `<div class="ctx-item" data-a="rename"><span>Rename</span></div>`,
      `<div class="ctx-item" data-a="duplicate"><span>Duplicate</span></div>`,
      `<div class="ctx-sep"></div>`,
      `<div class="ctx-item" data-a="pin"><span>${isPinned ? "Unpin" : "Pin"} Tab</span></div>`,
      `<div class="ctx-item" data-a="group"><span>${hasGroup ? "Remove from Group" : "Set Group Color…"}</span></div>`,
      `<div class="ctx-sep"></div>`,
      `<div class="ctx-item" data-a="close-others"><span>Close Other Tabs</span></div>`,
      `<div class="ctx-item" data-a="close-right"><span>Close Tabs to Right</span></div>`,
      `<div class="ctx-sep"></div>`,
      `<div class="ctx-item" data-a="close" style="color:var(--c1)"><span>Close Tab</span></div>`,
    ].join("");

    menu.style.left = Math.min(e.clientX, innerWidth - 200) + "px";
    menu.style.top = Math.min(e.clientY, innerHeight - 300) + "px";
    menu.style.display = "block";
  });

  menu.addEventListener("click", (e) => {
    const item = e.target.closest(".ctx-item");
    if (!item || !targetSession) return;
    menu.style.display = "none";
    const s = targetSession;
    const idx = ctx.sessions.indexOf(s);

    switch (item.dataset.a) {
      case "rename":
        // Trigger double-click rename
        s.tabLabel.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        break;
      case "duplicate":
        ctx.createSession(s.cwd);
        break;
      case "pin":
        s._pinned = !s._pinned;
        s.tabEl.classList.toggle("pinned", s._pinned);
        s.tabClose.style.display = s._pinned ? "none" : "";
        break;
      case "group":
        if (s._group) {
          delete s.tabEl.dataset.group;
          s.tabEl.style.removeProperty("--tab-group-color");
          s._group = null;
        } else {
          const color = prompt("Color: red, green, blue, yellow, purple, cyan, orange, pink");
          if (color) {
            const colors = { red:"#e06c75",green:"#98c379",blue:"#61afef",yellow:"#e5c07b",purple:"#c678dd",cyan:"#56b6c2",orange:"#d19a66",pink:"#ff79c6" };
            s._group = color; s.tabEl.dataset.group = color;
            s.tabEl.style.setProperty("--tab-group-color", colors[color] || color);
          }
        }
        break;
      case "close-others":
        [...ctx.sessions].forEach(x => { if (x !== s && !x._pinned) { ctx.bus.emit("session:destroying", x); ctx.sessions.splice(ctx.sessions.indexOf(x), 1); x.destroy(); } });
        ctx.switchTo(s);
        break;
      case "close-right":
        const rightSessions = ctx.sessions.slice(idx + 1).filter(x => !x._pinned);
        rightSessions.forEach(x => { ctx.bus.emit("session:destroying", x); ctx.sessions.splice(ctx.sessions.indexOf(x), 1); x.destroy(); });
        break;
      case "close":
        if (!s._pinned) { ctx.bus.emit("session:destroying", s); ctx.sessions.splice(idx, 1); s.destroy(); if (ctx.sessions.length === 0) ctx.createSession(); else if (ctx.getActive() === s) ctx.switchTo(ctx.sessions[Math.min(idx, ctx.sessions.length - 1)]); }
        break;
    }
    ctx.hiddenInput.focus();
  });

  document.addEventListener("click", () => menu.style.display = "none");
}
