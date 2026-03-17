// Visual color picker with format conversion
export default function(ctx) {

  function openPicker() {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    overlay.innerHTML = `
      <div style="background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:340px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--ui-border);">
          <span style="font-size:14px;font-weight:600;color:var(--fg);">Color Picker</span>
          <button id="cp-close" style="background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;">✕</button>
        </div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px;align-items:center;">
          <input type="color" id="cp-input" value="#7c5bf0" style="width:100%;height:80px;border:none;cursor:pointer;border-radius:8px;background:none;">
          <div id="cp-preview" style="width:100%;height:40px;border-radius:6px;border:1px solid var(--ui-border2);"></div>
          <div style="width:100%;display:flex;flex-direction:column;gap:6px;" id="cp-formats"></div>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const input = overlay.querySelector("#cp-input");
    const preview = overlay.querySelector("#cp-preview");
    const formats = overlay.querySelector("#cp-formats");

    function update() {
      const hex = input.value;
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      const hsl = rgbToHsl(r, g, b);
      preview.style.background = hex;

      formats.innerHTML = [
        { label: "HEX", value: hex },
        { label: "RGB", value: `rgb(${r}, ${g}, ${b})` },
        { label: "HSL", value: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)` },
        { label: "Tailwind", value: closestTailwind(hex) },
      ].map(f => `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:55px;font-size:10px;color:var(--ui-fg2);text-transform:uppercase;">${f.label}</span>
          <code style="flex:1;font-size:12px;color:var(--fg);background:var(--ui-bg3);padding:4px 8px;border-radius:4px;">${f.value}</code>
          <button data-val="${f.value}" style="background:none;border:1px solid var(--ui-border2);color:var(--ui-fg);border-radius:4px;padding:2px 8px;cursor:pointer;font-size:10px;">Copy</button>
        </div>
      `).join("");
    }

    input.addEventListener("input", update);
    update();

    formats.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-val]");
      if (!btn) return;
      navigator.clipboard.writeText(btn.dataset.val);
      btn.textContent = "✓"; setTimeout(() => btn.textContent = "Copy", 1000);
    });

    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    overlay.querySelector("#cp-close").onclick = close;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); e.stopPropagation(); } });
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      if (max===r) h = ((g-b)/d+(g<b?6:0))/6;
      else if (max===g) h = ((b-r)/d+2)/6;
      else h = ((r-g)/d+4)/6;
    }
    return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
  }

  function closestTailwind(hex) {
    const colors = {"slate-900":"#0f172a","gray-900":"#111827","zinc-900":"#18181b","red-500":"#ef4444","orange-500":"#f97316","amber-500":"#f59e0b","yellow-500":"#eab308","lime-500":"#84cc16","green-500":"#22c55e","emerald-500":"#10b981","teal-500":"#14b8a6","cyan-500":"#06b6d4","sky-500":"#0ea5e9","blue-500":"#3b82f6","indigo-500":"#6366f1","violet-500":"#8b5cf6","purple-500":"#a855f7","fuchsia-500":"#d946ef","pink-500":"#ec4899","rose-500":"#f43f5e"};
    let best = "", bestDist = Infinity;
    const r1=parseInt(hex.slice(1,3),16), g1=parseInt(hex.slice(3,5),16), b1=parseInt(hex.slice(5,7),16);
    for (const [name, h] of Object.entries(colors)) {
      const r2=parseInt(h.slice(1,3),16), g2=parseInt(h.slice(3,5),16), b2=parseInt(h.slice(5,7),16);
      const d = Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2);
      if (d < bestDist) { bestDist = d; best = name; }
    }
    return best;
  }

  ctx.commands.push({ name: "Color Picker", key: "", action: openPicker });
}
