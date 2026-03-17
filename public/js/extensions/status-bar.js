export default function(ctx) {
  const left = document.getElementById("sb-left");
  const right = document.getElementById("sb-right");

  function update() {
    const s = ctx.getActive();
    if (!s) { left.innerHTML = "⚡ barq"; right.textContent = ""; return; }

    const title = s.vt.title || s.cwd || "";
    const short = title.replace(/^\/Users\/[^/]+/, "~");
    left.innerHTML = `⚡ ${short}`;

    const size = `${s.vt.cols}×${s.vt.rows}`;
    const alt = s.vt.isAlt ? " 🖥" : "";
    right.textContent = `${size}${alt}`;
  }

  ctx.bus.on("render:after", update);
  ctx.bus.on("session:activated", update);
  ctx.bus.on("session:connected", update);
}
