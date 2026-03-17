export default function(ctx) {
  // Query cwd only on tab switch, not polling
  ctx.bus.on("session:activated", (s) => { if (s.alive) setTimeout(() => s.queryCwd(), 500); });

  function save() {
    if (!ctx.sessions.length) return;
    const state = ctx.sessions.map((s, i) => {
      try { sessionStorage.setItem("ttb-hist-" + i, s.scrollbackEl.innerHTML + "<!--S-->" + s.screenEl.innerHTML); } catch {}
      return {
        name: s._customName || s.tabLabel.textContent,
        isActive: s === ctx.getActive(),
        cwd: s.cwd || null, // set by server response to get-cwd
      };
    });
    localStorage.setItem("ttb-tabs", JSON.stringify(state));
    for (let i = ctx.sessions.length; i < 20; i++) sessionStorage.removeItem("ttb-hist-" + i);
  }

  setInterval(save, 10000); // save every 10s instead of 2s
  window.addEventListener("beforeunload", save);
  window.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });

  ctx.saveTabState = save;

  ctx.restoreTabs = function() {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem("ttb-tabs") || "[]"); } catch {}
    if (saved.length > 0) {
      let activeIdx = 0;
      saved.forEach((t, i) => {
        const s = ctx.createSession(t.cwd || null);
        if (t.name) { s.tabLabel.textContent = t.name; s._customName = t.name; }
        if (t.isActive) activeIdx = i;
        const hist = sessionStorage.getItem("ttb-hist-" + i);
        if (hist) { const parts = hist.split("<!--S-->"); s.scrollbackEl.innerHTML = parts[0] || ""; }
      });
      if (ctx.sessions[activeIdx]) ctx.switchTo(ctx.sessions[activeIdx]);
    } else {
      ctx.createSession();
    }
  };
}
