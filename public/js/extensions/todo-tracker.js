export default function(ctx) {
  const KEY = "ttb-todos";
  let todos = JSON.parse(localStorage.getItem(KEY) || "[]");
  function save() { localStorage.setItem(KEY, JSON.stringify(todos)); }

  function showTodos() {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:450px;max-height:65vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--ui-border);";
    header.innerHTML = `<span style="font-size:14px;font-weight:600;color:var(--fg);">📋 Todos (${todos.filter(t=>!t.done).length} active)</span>`;
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕"; closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    closeBtn.onclick = close;
    header.appendChild(closeBtn);

    // Add input
    const addBar = document.createElement("div");
    addBar.style.cssText = "display:flex;gap:6px;padding:8px 16px;border-bottom:1px solid var(--ui-border);";
    const input = document.createElement("input");
    input.type = "text"; input.placeholder = "Add todo...";
    input.style.cssText = "flex:1;background:var(--bg);color:var(--fg);border:1px solid var(--ui-border2);border-radius:6px;padding:6px 10px;font-family:inherit;font-size:12px;outline:none;";
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) { todos.unshift({ text: input.value.trim(), done: false, priority: "normal", created: Date.now() }); save(); input.value = ""; render(); } e.stopPropagation(); });
    addBar.appendChild(input);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;overflow:auto;min-height:0;";

    function render() {
      header.querySelector("span").textContent = `📋 Todos (${todos.filter(t=>!t.done).length} active)`;
      body.innerHTML = todos.length ? todos.map((t, i) => {
        const pColor = t.priority === "high" ? "var(--c1)" : t.priority === "low" ? "var(--c4)" : "var(--fg)";
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 16px;border-bottom:1px solid var(--ui-border);${t.done ? 'opacity:0.4;' : ''}">
          <input type="checkbox" data-idx="${i}" ${t.done ? "checked" : ""} style="cursor:pointer;">
          <span style="flex:1;font-size:12px;color:${pColor};${t.done ? 'text-decoration:line-through;' : ''}">${esc(t.text)}</span>
          <button data-pri="${i}" style="background:none;border:none;color:var(--ui-fg3);cursor:pointer;font-size:10px;" title="Cycle priority">◆</button>
          <button data-del="${i}" style="background:none;border:none;color:var(--c1);cursor:pointer;font-size:10px;">✕</button>
        </div>`;
      }).join("") : '<div style="padding:16px;color:var(--ui-fg2);text-align:center;">No todos yet</div>';
    }

    body.addEventListener("change", (e) => {
      const cb = e.target.closest("input[data-idx]");
      if (cb) { todos[cb.dataset.idx].done = cb.checked; save(); render(); }
    });
    body.addEventListener("click", (e) => {
      const del = e.target.closest("button[data-del]");
      if (del) { todos.splice(del.dataset.del, 1); save(); render(); return; }
      const pri = e.target.closest("button[data-pri]");
      if (pri) { const t = todos[pri.dataset.pri]; t.priority = t.priority === "normal" ? "high" : t.priority === "high" ? "low" : "normal"; save(); render(); }
    });

    render();
    modal.append(header, addBar, body); overlay.appendChild(modal); document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    modal.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); e.stopPropagation(); } });
    input.focus();
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  ctx.commands.push({ name: "📋 Todo List", key: "", action: showTodos });
}
