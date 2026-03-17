// Replace browser prompt()/alert() with styled modals
export default function(ctx) {

  function createModal(title, fields, onSubmit) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:400px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "padding:12px 16px;border-bottom:1px solid var(--ui-border);font-size:14px;font-weight:600;color:var(--fg);";
    header.textContent = title;

    const body = document.createElement("div");
    body.style.cssText = "padding:14px 16px;display:flex;flex-direction:column;gap:10px;";

    const inputs = {};
    fields.forEach(f => {
      const label = document.createElement("label");
      label.style.cssText = "font-size:11px;color:var(--ui-fg2);text-transform:uppercase;letter-spacing:0.5px;display:flex;flex-direction:column;gap:4px;";
      label.textContent = f.label;

      let input;
      if (f.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = f.rows || 3;
        input.style.cssText = "background:var(--bg);color:var(--fg);border:1px solid var(--ui-border2);border-radius:6px;padding:8px 10px;font-family:inherit;font-size:13px;outline:none;resize:vertical;";
      } else if (f.type === "select") {
        input = document.createElement("select");
        input.style.cssText = "background:var(--bg);color:var(--fg);border:1px solid var(--ui-border2);border-radius:6px;padding:8px 10px;font-family:inherit;font-size:13px;outline:none;";
        (f.options || []).forEach(o => { const opt = document.createElement("option"); opt.value = o; opt.textContent = o; input.appendChild(opt); });
      } else {
        input = document.createElement("input");
        input.type = f.type || "text";
        input.style.cssText = "background:var(--bg);color:var(--fg);border:1px solid var(--ui-border2);border-radius:6px;padding:8px 10px;font-family:inherit;font-size:13px;outline:none;";
      }
      input.placeholder = f.placeholder || "";
      if (f.value) input.value = f.value;
      input.addEventListener("focus", () => input.style.borderColor = "var(--accent)");
      input.addEventListener("blur", () => input.style.borderColor = "var(--ui-border2)");

      label.appendChild(input);
      body.appendChild(label);
      inputs[f.name] = input;
    });

    const footer = document.createElement("div");
    footer.style.cssText = "padding:10px 16px;border-top:1px solid var(--ui-border);display:flex;gap:8px;justify-content:flex-end;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:6px;padding:6px 16px;cursor:pointer;font-family:inherit;font-size:12px;";

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "OK";
    submitBtn.style.cssText = "background:var(--accent);color:#fff;border:none;border-radius:6px;padding:6px 20px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;";

    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    const submit = () => {
      const values = {};
      for (const [k, inp] of Object.entries(inputs)) values[k] = inp.value;
      close();
      onSubmit(values);
    };

    cancelBtn.onclick = close;
    submitBtn.onclick = submit;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    // Enter/Shift+Enter to submit, Escape to cancel
    modal.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { close(); e.preventDefault(); e.stopPropagation(); return; }
      // Shift+Enter always submits (even from textarea)
      if (e.key === "Enter" && e.shiftKey) { submit(); e.preventDefault(); e.stopPropagation(); return; }
      // Plain Enter submits from non-textarea fields
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") { submit(); e.preventDefault(); e.stopPropagation(); return; }
      e.stopPropagation();
    });

    footer.append(cancelBtn, submitBtn);
    modal.append(header, body, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus first input
    const firstInput = body.querySelector("input, textarea, select");
    if (firstInput) setTimeout(() => firstInput.focus(), 50);

    return { close, overlay };
  }

  function showToast(msg, duration = 2000) {
    const toast = document.createElement("div");
    toast.style.cssText = "position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:var(--ui-bg);color:var(--fg);padding:8px 20px;border-radius:8px;border:1px solid var(--ui-border2);font-size:12px;z-index:80;box-shadow:0 4px 16px rgba(0,0,0,.4);opacity:0;transition:opacity 0.2s;";
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.style.opacity = "1");
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 200); }, duration);
  }

  // Async prompt replacement — returns a Promise<string|null>
  function styledPrompt(title, defaultVal) {
    return new Promise(resolve => {
      createModal(title, [
        { name: "value", label: "", type: "text", value: defaultVal || "", placeholder: "Type here…" }
      ], (vals) => resolve(vals.value || null));
    });
  }

  // Async confirm replacement — returns Promise<boolean>
  function styledConfirm(msg) {
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

      const modal = document.createElement("div");
      modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:380px;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

      const body = document.createElement("div");
      body.style.cssText = "padding:20px 20px 14px;font-size:13px;color:var(--fg);line-height:1.6;";
      body.textContent = msg;

      const footer = document.createElement("div");
      footer.style.cssText = "padding:10px 16px;border-top:1px solid var(--ui-border);display:flex;gap:8px;justify-content:flex-end;";

      const noBtn = document.createElement("button");
      noBtn.textContent = "Cancel";
      noBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:6px;padding:6px 16px;cursor:pointer;font-family:inherit;font-size:12px;";

      const yesBtn = document.createElement("button");
      yesBtn.textContent = "OK";
      yesBtn.style.cssText = "background:var(--accent);color:#fff;border:none;border-radius:6px;padding:6px 20px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;";

      const close = (result) => { overlay.remove(); ctx.hiddenInput.focus(); resolve(result); };
      noBtn.onclick = () => close(false);
      yesBtn.onclick = () => close(true);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
      modal.addEventListener("keydown", (e) => { if (e.key === "Escape") close(false); if (e.key === "Enter") close(true); e.stopPropagation(); });

      footer.append(noBtn, yesBtn);
      modal.append(body, footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      yesBtn.focus();
    });
  }

  // Override window.prompt, window.alert, window.confirm for entire app
  window._origPrompt = window.prompt;
  window._origAlert = window.alert;
  window._origConfirm = window.confirm;

  // Sync wrappers that work with existing code (extensions use prompt() synchronously)
  // We can't make them async without rewriting every extension, so we keep
  // the native ones but expose the styled versions for new code.

  ctx.modal = createModal;
  ctx.toast = showToast;
  ctx.prompt = styledPrompt;
  ctx.confirm = styledConfirm;
  ctx.alert = (msg) => showToast(msg, 3000);
}
