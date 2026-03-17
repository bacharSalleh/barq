// Prompt/command library — save, organize, search, and run saved prompts
export default function(ctx) {
  const KEY = "ttb-snippets";
  let snippets = JSON.parse(localStorage.getItem(KEY) || "[]");
  // Migrate old format (no category/type)
  snippets.forEach(s => {
    if (!s.category) s.category = "General";
    if (!s.type) s.type = "command";
  });
  function save() { localStorage.setItem(KEY, JSON.stringify(snippets)); }

  function openLibrary() {
    if (!ctx.modal) return;
    // Build a searchable list panel
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    const panel = document.createElement("div");
    panel.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:520px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

    // Header
    const header = document.createElement("div");
    header.style.cssText = "padding:12px 16px;border-bottom:1px solid var(--ui-border);display:flex;justify-content:space-between;align-items:center;";
    header.innerHTML = '<span style="font-size:14px;font-weight:600;color:var(--fg)">Prompt Library</span>';
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "\u2715";
    closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    closeBtn.addEventListener("click", close);
    header.appendChild(closeBtn);

    // Search
    const searchWrap = document.createElement("div");
    searchWrap.style.cssText = "padding:8px 16px;border-bottom:1px solid var(--ui-border);";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search prompts...";
    searchInput.style.cssText = "width:100%;background:var(--bg);color:var(--fg);border:1px solid var(--ui-border2);border-radius:6px;padding:8px 10px;font-family:inherit;font-size:13px;outline:none;";
    searchWrap.appendChild(searchInput);

    // List
    const list = document.createElement("div");
    list.style.cssText = "flex:1;overflow-y:auto;padding:8px;scrollbar-width:thin;";

    // Footer
    const footer = document.createElement("div");
    footer.style.cssText = "padding:10px 16px;border-top:1px solid var(--ui-border);display:flex;gap:8px;";
    const addBtn = document.createElement("button");
    addBtn.textContent = "+ Add New";
    addBtn.style.cssText = "background:var(--accent);color:#fff;border:none;border-radius:6px;padding:6px 16px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;";
    addBtn.addEventListener("click", () => { close(); addSnippet(); });
    const importBtn = document.createElement("button");
    importBtn.textContent = "Import";
    importBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:6px;padding:6px 12px;cursor:pointer;font-family:inherit;font-size:12px;";
    importBtn.addEventListener("click", () => { close(); importSnippets(); });
    const exportBtn = document.createElement("button");
    exportBtn.textContent = "Export";
    exportBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:6px;padding:6px 12px;cursor:pointer;font-family:inherit;font-size:12px;";
    exportBtn.addEventListener("click", () => {
      const json = JSON.stringify(snippets, null, 2);
      navigator.clipboard.writeText(json).then(() => { if (ctx.toast) ctx.toast("Exported to clipboard"); });
    });
    footer.appendChild(addBtn);
    footer.appendChild(importBtn);
    footer.appendChild(exportBtn);

    panel.appendChild(header);
    panel.appendChild(searchWrap);
    panel.appendChild(list);
    panel.appendChild(footer);
    overlay.appendChild(panel);

    function close() { overlay.remove(); ctx.hiddenInput.focus(); }
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    function renderList(filter) {
      list.innerHTML = "";
      const q = (filter || "").toLowerCase();
      const cats = {};
      snippets.forEach((s, i) => {
        if (q && !s.name.toLowerCase().includes(q) && !s.cmd.toLowerCase().includes(q) && !(s.category || "").toLowerCase().includes(q)) return;
        const cat = s.category || "General";
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push({ ...s, _idx: i });
      });

      if (Object.keys(cats).length === 0) {
        list.innerHTML = '<div style="color:var(--ui-fg2);text-align:center;padding:20px;font-size:13px;">No prompts found</div>';
        return;
      }

      for (const [cat, items] of Object.entries(cats)) {
        const catEl = document.createElement("div");
        catEl.style.cssText = "font-size:10px;color:var(--ui-fg2);text-transform:uppercase;letter-spacing:0.5px;padding:8px 8px 4px;font-weight:600;";
        catEl.textContent = cat;
        list.appendChild(catEl);

        items.forEach(s => {
          const row = document.createElement("div");
          row.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;transition:background 0.1s;";
          row.addEventListener("mouseenter", () => row.style.background = "rgba(124,91,240,0.08)");
          row.addEventListener("mouseleave", () => row.style.background = "");

          const icon = document.createElement("span");
          icon.textContent = s.type === "prompt" ? "💬" : "⚡";
          icon.style.cssText = "font-size:14px;flex-shrink:0;";

          const info = document.createElement("div");
          info.style.cssText = "flex:1;min-width:0;";
          const title = document.createElement("div");
          title.style.cssText = "font-size:13px;color:var(--fg);font-weight:500;";
          title.textContent = s.name;
          const preview = document.createElement("div");
          preview.style.cssText = "font-size:11px;color:var(--ui-fg2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;";
          preview.textContent = s.cmd.slice(0, 80);
          info.appendChild(title);
          info.appendChild(preview);

          const actions = document.createElement("div");
          actions.style.cssText = "display:flex;gap:4px;flex-shrink:0;";
          const runBtn = document.createElement("button");
          runBtn.textContent = "Run";
          runBtn.style.cssText = "background:var(--accent);color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:11px;font-weight:600;";
          runBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            close();
            const sess = ctx.getActive();
            if (sess) { sess.sendInput(s.cmd + (s.type === "command" ? "\r" : "")); ctx.hiddenInput.focus(); }
          });
          const editBtn = document.createElement("button");
          editBtn.textContent = "Edit";
          editBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;";
          editBtn.addEventListener("click", (e) => { e.stopPropagation(); close(); editSnippet(s._idx); });
          const delBtn = document.createElement("button");
          delBtn.textContent = "Del";
          delBtn.style.cssText = "background:none;color:var(--ui-fg2);border:1px solid var(--ui-border);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;";
          delBtn.addEventListener("click", (e) => { e.stopPropagation(); snippets.splice(s._idx, 1); save(); rebuild(); renderList(searchInput.value); });

          actions.appendChild(runBtn);
          actions.appendChild(editBtn);
          actions.appendChild(delBtn);

          row.appendChild(icon);
          row.appendChild(info);
          row.appendChild(actions);

          // Click row = run
          row.addEventListener("click", () => {
            close();
            const sess = ctx.getActive();
            if (sess) { sess.sendInput(s.cmd + (s.type === "command" ? "\r" : "")); ctx.hiddenInput.focus(); }
          });

          list.appendChild(row);
        });
      }
    }

    searchInput.addEventListener("input", () => renderList(searchInput.value));
    document.body.appendChild(overlay);
    renderList();
    searchInput.focus();
  }

  function addSnippet() {
    if (!ctx.modal) return;
    ctx.modal("Save Prompt", [
      { name: "name", label: "Title", type: "text", placeholder: "e.g. Deploy to staging" },
      { name: "category", label: "Category", type: "text", placeholder: "e.g. Deploy, Git, Claude, Docker", value: "General" },
      { name: "type", label: "Type", type: "select", options: ["command", "prompt"] },
      { name: "cmd", label: "Command / Prompt text", type: "textarea", rows: 5, placeholder: "The command or prompt to save..." },
    ], (vals) => {
      if (!vals.name || !vals.cmd) return;
      snippets.push({ name: vals.name, cmd: vals.cmd, category: vals.category || "General", type: vals.type || "command" });
      save(); rebuild();
      if (ctx.toast) ctx.toast("Saved: " + vals.name);
    });
  }

  function editSnippet(idx) {
    const s = snippets[idx];
    if (!s || !ctx.modal) return;
    ctx.modal("Edit Prompt", [
      { name: "name", label: "Title", type: "text", value: s.name },
      { name: "category", label: "Category", type: "text", value: s.category || "General" },
      { name: "type", label: "Type", type: "select", options: ["command", "prompt"] },
      { name: "cmd", label: "Command / Prompt text", type: "textarea", rows: 5, value: s.cmd },
    ], (vals) => {
      if (!vals.name || !vals.cmd) return;
      snippets[idx] = { name: vals.name, cmd: vals.cmd, category: vals.category || "General", type: vals.type || "command" };
      save(); rebuild();
    });
  }

  function importSnippets() {
    if (!ctx.modal) return;
    ctx.modal("Import Prompts", [
      { name: "json", label: "Paste JSON array", type: "textarea", rows: 6, placeholder: '[{"name":"...", "cmd":"...", "category":"...", "type":"command"}]' },
    ], (vals) => {
      try {
        const arr = JSON.parse(vals.json);
        if (!Array.isArray(arr)) throw new Error("Not an array");
        arr.forEach(s => {
          if (s.name && s.cmd) snippets.push({ name: s.name, cmd: s.cmd, category: s.category || "General", type: s.type || "command" });
        });
        save(); rebuild();
        if (ctx.toast) ctx.toast("Imported " + arr.length + " prompts");
      } catch (e) { if (ctx.toast) ctx.toast("Invalid JSON: " + e.message); }
    });
  }

  function rebuild() {
    for (let i = ctx.commands.length - 1; i >= 0; i--) if (ctx.commands[i]._snip) ctx.commands.splice(i, 1);
    snippets.forEach(s => {
      ctx.commands.push({ name: (s.type === "prompt" ? "💬 " : "⚡ ") + s.name, key: "", _snip: true, action: () => {
        const a = ctx.getActive();
        if (a) { a.sendInput(s.cmd + (s.type === "command" ? "\r" : "")); ctx.hiddenInput.focus(); }
      }});
    });
  }

  ctx.commands.push(
    { name: "Prompt Library", key: "Ctrl+Shift+;", action: openLibrary },
    { name: "Save Prompt…", key: "", action: addSnippet },
  );

  rebuild();
}
