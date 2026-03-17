// Inline calculator — eval math expressions
export default function(ctx) {

  function openCalc() {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:380px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "padding:10px 16px;border-bottom:1px solid var(--ui-border);display:flex;justify-content:space-between;align-items:center;";
    header.innerHTML = '<span style="font-size:14px;font-weight:600;color:var(--fg);">🧮 Calculator</span>';
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    header.appendChild(closeBtn);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "2 + 2, sqrt(16), sin(PI/2), 0xFF...";
    input.style.cssText = "background:var(--bg);color:var(--fg);border:none;border-bottom:1px solid var(--ui-border);padding:14px 16px;font-family:inherit;font-size:18px;outline:none;";

    const result = document.createElement("div");
    result.style.cssText = "padding:16px;font-size:24px;font-weight:700;color:var(--accent);min-height:60px;display:flex;align-items:center;font-family:inherit;";
    result.textContent = "0";

    const history = document.createElement("div");
    history.style.cssText = "max-height:150px;overflow:auto;border-top:1px solid var(--ui-border);padding:8px 16px;font-size:11px;color:var(--ui-fg2);";

    const calcHistory = [];

    function evaluate() {
      const expr = input.value.trim();
      if (!expr) { result.textContent = "0"; return; }
      try {
        // Safe math eval — replace common functions
        const safe = expr
          .replace(/\bPI\b/g, Math.PI)
          .replace(/\bE\b/g, Math.E)
          .replace(/\bsqrt\b/g, "Math.sqrt")
          .replace(/\babs\b/g, "Math.abs")
          .replace(/\bsin\b/g, "Math.sin")
          .replace(/\bcos\b/g, "Math.cos")
          .replace(/\btan\b/g, "Math.tan")
          .replace(/\blog\b/g, "Math.log10")
          .replace(/\bln\b/g, "Math.log")
          .replace(/\bpow\b/g, "Math.pow")
          .replace(/\bround\b/g, "Math.round")
          .replace(/\bfloor\b/g, "Math.floor")
          .replace(/\bceil\b/g, "Math.ceil")
          .replace(/\bmin\b/g, "Math.min")
          .replace(/\bmax\b/g, "Math.max")
          .replace(/\brandom\b/g, "Math.random");
        const val = Function('"use strict"; return (' + safe + ')')();
        result.textContent = typeof val === "number" ? (Number.isInteger(val) ? val : val.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")) : String(val);
        result.style.color = "var(--accent)";
      } catch {
        result.textContent = "Error";
        result.style.color = "var(--c1)";
      }
    }

    input.addEventListener("input", evaluate);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const expr = input.value.trim();
        const res = result.textContent;
        if (expr && res !== "Error") {
          calcHistory.unshift(`${expr} = ${res}`);
          history.innerHTML = calcHistory.map(h => `<div style="padding:2px 0;">${h}</div>`).join("");
          // Copy result
          navigator.clipboard.writeText(res);
          if (ctx.toast) ctx.toast("Result copied: " + res);
        }
        e.preventDefault();
      }
      if (e.key === "Escape") { close(); e.stopPropagation(); }
      e.stopPropagation();
    });

    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    closeBtn.onclick = close;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    modal.append(header, input, result, history);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    input.focus();
  }

  ctx.commands.push({ name: "🧮 Calculator", key: "", action: openCalc });
}
