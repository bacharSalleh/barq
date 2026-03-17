// Developer utility tools — encoders, decoders, converters
export default function(ctx) {

  function runUtil(title, fn) {
    const sel = window.getSelection().toString().trim();
    if (sel) { showResult(title, fn(sel)); return; }
    if (ctx.modal) {
      ctx.modal(title, [{ name: "value", label: "Input", type: "textarea", rows: 3, placeholder: "Paste or type here…" }], (vals) => {
        if (vals.value) showResult(title, fn(vals.value));
      });
      return;
    }
    const input = prompt(title); if (!input) return;
    showResult(title, fn(input));
  }

  function showResult(title, result) {
    // Show in a small modal
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;";
    overlay.innerHTML = `
      <div style="background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:8px;width:500px;max-height:60vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--ui-border);font-size:13px;font-weight:600;color:var(--fg);">
          <span>${title}</span>
          <button id="du-close" style="background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;">✕</button>
        </div>
        <pre style="padding:12px 16px;font-size:13px;line-height:1.5;color:var(--fg);margin:0;overflow:auto;white-space:pre-wrap;word-break:break-all;user-select:text;cursor:text;flex:1;min-height:0;">${esc(result)}</pre>
        <div style="padding:6px 14px;border-top:1px solid var(--ui-border);display:flex;gap:6px;justify-content:flex-end;">
          <button id="du-copy" style="background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:4px;padding:3px 10px;cursor:pointer;font-family:inherit;font-size:11px;">Copy</button>
          <button id="du-insert" style="background:var(--accent);color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-family:inherit;font-size:11px;">Insert into terminal</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    overlay.querySelector("#du-close").onclick = close;
    overlay.querySelector("#du-copy").onclick = () => {
      navigator.clipboard.writeText(result);
      const btn = overlay.querySelector("#du-copy");
      btn.textContent = "Copied!"; setTimeout(() => btn.textContent = "Copy", 1500);
    };
    overlay.querySelector("#du-insert").onclick = () => {
      const s = ctx.getActive();
      if (s) s.sendInput(result);
      close();
    };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); e.stopPropagation(); } });
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  ctx.commands.push(
    { name: "Util: Base64 Encode", key: "", action: () => runUtil("Base64 Encode", s => btoa(unescape(encodeURIComponent(s)))) },
    { name: "Util: Base64 Decode", key: "", action: () => runUtil("Base64 Decode", s => { try { return decodeURIComponent(escape(atob(s))); } catch { return "Invalid Base64"; } }) },
    { name: "Util: URL Encode", key: "", action: () => runUtil("URL Encode", encodeURIComponent) },
    { name: "Util: URL Decode", key: "", action: () => runUtil("URL Decode", s => { try { return decodeURIComponent(s); } catch { return "Invalid URL encoding"; } }) },
    { name: "Util: Timestamp → Date", key: "", action: () => runUtil("Unix Timestamp → Date", s => {
      const ts = parseInt(s);
      const d = new Date(ts < 1e12 ? ts * 1000 : ts);
      return `Unix: ${ts}\nUTC:  ${d.toUTCString()}\nISO:  ${d.toISOString()}\nLocal: ${d.toLocaleString()}`;
    })},
    { name: "Util: Date → Timestamp", key: "", action: () => runUtil("Current Timestamp", () => {
      const now = new Date();
      return `Seconds: ${Math.floor(now.getTime()/1000)}\nMillis:  ${now.getTime()}\nISO:     ${now.toISOString()}\nUTC:     ${now.toUTCString()}`;
    })},
    { name: "Util: Generate UUID", key: "", action: () => runUtil("UUID v4", () => crypto.randomUUID()) },
    { name: "Util: Generate Password", key: "", action: () => runUtil("Random Password (32 chars)", () => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => chars[b % chars.length]).join("");
    })},
    { name: "Util: Hash (SHA-256)", key: "", action: () => {
      runUtil("SHA-256 Hash", (input) => {
        // Can't be async in this flow, so compute inline
        let hex = "computing...";
        crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)).then(buf => {
          hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
          // Update the displayed result if modal is still open
          document.querySelectorAll("#du-result").forEach(el => el.textContent = hex);
        });
        return "computing…";
      });
    }},
    { name: "Util: Word/Char Count", key: "", action: () => runUtil("Count", s => {
      return `Characters: ${s.length}\nWords: ${s.split(/\s+/).filter(Boolean).length}\nLines: ${s.split("\n").length}`;
    })},
  );
}
