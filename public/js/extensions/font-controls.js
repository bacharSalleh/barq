export default function(ctx) {
  let fontSize = parseInt(localStorage.getItem("ttb-fontsize")) || 14;
  let ligatures = localStorage.getItem("ttb-ligatures") !== "off";

  function apply() {
    document.querySelectorAll(".term-line").forEach(el => el.style.fontSize = fontSize + "px");
    ctx.probe.style.fontSize = fontSize + "px";
    localStorage.setItem("ttb-fontsize", fontSize);
    const size = ctx.calcSize();
    ctx.sessions.forEach(s => s.resize(size.rows, size.cols));
    ctx.scheduleRender();
  }

  if (!ligatures) document.body.style.fontVariantLigatures = "none";
  setTimeout(apply, 150);

  ctx.commands.push(
    { name: "Zoom In", key: "Ctrl+=", action: () => { fontSize = Math.min(32, fontSize + 1); apply(); } },
    { name: "Zoom Out", key: "Ctrl+-", action: () => { fontSize = Math.max(8, fontSize - 1); apply(); } },
    { name: "Reset Zoom", key: "Ctrl+0", action: () => { fontSize = 14; apply(); } },
    { name: "Toggle Ligatures", key: "", action: () => { ligatures = !ligatures; document.body.style.fontVariantLigatures = ligatures ? "normal" : "none"; localStorage.setItem("ttb-ligatures", ligatures ? "on" : "off"); } },
  );

  ctx.bus.on("shortcut:zoom-in", () => { fontSize = Math.min(32, fontSize + 1); apply(); });
  ctx.bus.on("shortcut:zoom-out", () => { fontSize = Math.max(8, fontSize - 1); apply(); });
  ctx.bus.on("shortcut:zoom-reset", () => { fontSize = 14; apply(); });
}
