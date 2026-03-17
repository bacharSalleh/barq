// Timezone converter — convert times between zones
export default function(ctx) {

  function openConverter() {
    const zones = [
      "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
      "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
      "Asia/Dubai", "Asia/Kolkata", "Australia/Sydney", "Pacific/Auckland",
      "Asia/Riyadh", "Asia/Beirut", "Africa/Cairo",
    ];

    const now = new Date();
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:440px;max-height:70vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--ui-border);";
    header.innerHTML = '<span style="font-size:14px;font-weight:600;color:var(--fg);">🌍 World Clock</span>';
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); clearInterval(timer); };
    closeBtn.onclick = close;
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;overflow:auto;min-height:0;padding:4px 0;";

    function render() {
      const now = new Date();
      body.innerHTML = zones.map(tz => {
        try {
          const time = now.toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
          const date = now.toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
          const offset = getOffset(now, tz);
          const isLocal = tz === Intl.DateTimeFormat().resolvedOptions().timeZone;
          const bg = isLocal ? "var(--accent)" : "transparent";
          const fg = isLocal ? "#fff" : "var(--fg)";
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 16px;border-bottom:1px solid var(--ui-border);background:${bg};color:${fg};">
            <div>
              <div style="font-size:12px;font-weight:600;">${tz.split("/").pop().replace(/_/g," ")}</div>
              <div style="font-size:10px;opacity:0.6;">${date} · UTC${offset}</div>
            </div>
            <div style="font-size:16px;font-weight:700;font-family:inherit;">${time}</div>
          </div>`;
        } catch { return ""; }
      }).join("");
    }

    function getOffset(date, tz) {
      const utc = date.toLocaleString("en-US", { timeZone: "UTC" });
      const local = date.toLocaleString("en-US", { timeZone: tz });
      const diff = (new Date(local) - new Date(utc)) / 3600000;
      return (diff >= 0 ? "+" : "") + diff;
    }

    render();
    const timer = setInterval(render, 1000);

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    const escH = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", escH); const origClose = close; close = () => { document.removeEventListener("keydown", escH); origClose(); };
  }

  ctx.commands.push(
    { name: "🌍 World Clock / Timezone", key: "", action: openConverter },
  );
}
