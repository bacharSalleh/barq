// Encrypted secret storage — store API keys, tokens, passwords
// Uses Web Crypto API with a user-provided passphrase
export default function(ctx) {
  const store = ctx.store;
  const KEY = "ttb-vault";

  async function deriveKey(passphrase) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: enc.encode("barq-vault-salt"), iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  async function encrypt(text, passphrase) {
    const key = await deriveKey(passphrase);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
    return JSON.stringify({ iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) });
  }

  async function decrypt(data, passphrase) {
    const { iv, ct } = JSON.parse(data);
    const key = await deriveKey(passphrase);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, new Uint8Array(ct));
    return new TextDecoder().decode(plain);
  }

  function showVault() {
    if (!ctx.modal) return;
    ctx.modal("🔐 Secret Vault — Unlock", [
      { name: "pass", label: "Passphrase", type: "text", placeholder: "Enter your vault passphrase" },
    ], async (vals) => {
      if (!vals.pass) return;
      const pass = vals.pass;

      let secrets = {};
      const stored = store.getItem(KEY);
      if (stored) {
        try { secrets = JSON.parse(await decrypt(stored, pass)); }
        catch { if (ctx.toast) ctx.toast("Wrong passphrase"); return; }
      }

      showSecretList(secrets, pass);
    });
  }

  function showSecretList(secrets, pass) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:450px;max-height:60vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--ui-border);";
    header.innerHTML = `<span style="font-size:14px;font-weight:600;color:var(--fg);">🔐 Secrets (${Object.keys(secrets).length})</span>`;

    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;gap:6px;";
    const addBtn = document.createElement("button");
    addBtn.textContent = "+ Add";
    addBtn.style.cssText = "background:var(--accent);color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:11px;";
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕"; closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    btns.append(addBtn, closeBtn);
    header.appendChild(btns);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;overflow:auto;min-height:0;";

    async function saveToDisk() { store.setItem(KEY, await encrypt(JSON.stringify(secrets), pass)); }

    function render() {
      const keys = Object.keys(secrets);
      body.innerHTML = keys.length ? keys.map(k => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--ui-border);">
          <span style="flex:1;font-size:12px;font-weight:600;color:var(--fg);">${esc(k)}</span>
          <button data-copy="${esc(k)}" style="background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:4px;padding:2px 8px;cursor:pointer;font-size:10px;">Copy</button>
          <button data-paste="${esc(k)}" style="background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:4px;padding:2px 8px;cursor:pointer;font-size:10px;">Paste</button>
          <button data-del="${esc(k)}" style="background:none;border:none;color:var(--c1);cursor:pointer;font-size:12px;">✕</button>
        </div>`).join("")
        : '<div style="padding:16px;color:var(--ui-fg2);text-align:center;">No secrets stored</div>';
    }

    body.addEventListener("click", async (e) => {
      const copy = e.target.closest("button[data-copy]");
      if (copy) { navigator.clipboard.writeText(secrets[copy.dataset.copy]); if (ctx.toast) ctx.toast("Copied to clipboard"); return; }
      const paste = e.target.closest("button[data-paste]");
      if (paste) { const s = ctx.getActive(); if (s) s.sendInput(secrets[paste.dataset.paste]); close(); return; }
      const del = e.target.closest("button[data-del]");
      if (del) { delete secrets[del.dataset.del]; await saveToDisk(); render(); }
    });

    addBtn.onclick = () => {
      if (!ctx.modal) return;
      ctx.modal("Add Secret", [
        { name: "name", label: "Name", type: "text", placeholder: "e.g. OPENAI_KEY" },
        { name: "value", label: "Value", type: "text", placeholder: "sk-..." },
      ], async (vals) => {
        if (vals.name && vals.value) { secrets[vals.name] = vals.value; await saveToDisk(); render(); showSecretList(secrets, pass); }
      });
      overlay.remove();
    };

    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    closeBtn.onclick = close;
    render();
    modal.append(header, body); overlay.appendChild(modal); document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    modal.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); e.stopPropagation(); } });
  }

  function esc(s) { return (s||"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  ctx.commands.push({ name: "🔐 Secret Vault", key: "", action: showVault });
}
