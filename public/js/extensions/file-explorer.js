export default function(ctx) {
  // Create the panel DOM
  const panel = document.createElement("div");
  panel.id = "file-explorer";

  const header = document.createElement("div");
  header.className = "fe-header";
  header.innerHTML = '<span>Explorer</span><button id="fe-close" title="Close">\u2715</button>';

  const pathEl = document.createElement("div");
  pathEl.className = "fe-path";

  const list = document.createElement("div");
  list.className = "fe-list";

  const toggle = document.createElement("div");
  toggle.className = "fe-toggle";
  toggle.innerHTML = '<input type="checkbox" id="fe-hidden"> Show hidden files';

  panel.appendChild(header);
  panel.appendChild(pathEl);
  panel.appendChild(list);
  panel.appendChild(toggle);

  // Insert before the terminals container
  const container = document.getElementById("terminals-container");
  const mainArea = container.parentElement;

  // Wrap container + panel in a flex row
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display:flex;flex:1;overflow:hidden;";
  mainArea.insertBefore(wrapper, container);
  wrapper.appendChild(panel);
  wrapper.appendChild(container);

  let currentPath = null;
  let showHidden = false;

  async function loadDir(dir) {
    try {
      const url = `/api/files?path=${encodeURIComponent(dir)}&hidden=${showHidden ? "1" : "0"}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) { console.error(data.error); return; }

      currentPath = data.path;
      pathEl.textContent = data.path.replace(/^\/Users\/[^/]+/, "~");
      pathEl.title = data.path;

      list.innerHTML = "";

      // Parent directory
      if (data.parent !== data.path) {
        const up = document.createElement("div");
        up.className = "fe-item dir";
        up.innerHTML = '<span class="fe-icon" style="font-size:13px">⬆</span><span class="fe-name">..</span>';
        up.addEventListener("click", () => loadDir(data.parent));
        list.appendChild(up);
      }

      for (const item of data.items) {
        const el = document.createElement("div");
        el.className = "fe-item " + item.type;
        el.innerHTML = `<span class="fe-icon"></span><span class="fe-name">${escName(item.name)}</span>`;
        el.title = item.path;

        // Click: navigate dirs, select files. Ctrl/Cmd+click for multi-select.
        el.addEventListener("click", (e) => {
          if (item.type === "dir") {
            loadDir(item.path);
          } else {
            if (!e.ctrlKey && !e.metaKey) {
              list.querySelectorAll(".fe-item.selected").forEach(x => x.classList.remove("selected"));
            }
            el.classList.toggle("selected");
          }
        });

        // Double-click file: open in built-in file viewer
        if (item.type !== "dir") {
          el.addEventListener("dblclick", () => {
            if (ctx.openFile) ctx.openFile(item.path);
          });
        }

        // Right-click: context menu with cd, copy path, etc.
        el.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          showFileMenu(e.clientX, e.clientY, item);
        });

        list.appendChild(el);
      }
    } catch (err) {
      console.error("File explorer error:", err);
    }
  }

  // File explorer right-click menu
  let feMenu = document.createElement("div");
  feMenu.id = "fe-context-menu";
  feMenu.style.cssText = "display:none;position:fixed;z-index:70;background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:6px;padding:4px 0;min-width:180px;box-shadow:0 4px 16px rgba(0,0,0,.5);font-size:12px;";
  document.body.appendChild(feMenu);

  function showFileMenu(x, y, item) {
    const isDir = item.type === "dir";
    const selected = Array.from(list.querySelectorAll(".fe-item.selected"));
    const multiCount = selected.length;
    feMenu.innerHTML = [
      isDir ? `<div class="ctx-item" data-a="cd"><span>cd into this</span></div>` : "",
      isDir ? `<div class="ctx-item" data-a="cd-tab"><span>cd in new tab</span></div>` : "",
      !isDir ? `<div class="ctx-item" data-a="view"><span>View / Edit</span></div>` : "",
      !isDir ? `<div class="ctx-item" data-a="edit-term"><span>Open in terminal editor</span></div>` : "",
      `<div class="ctx-item" data-a="insert"><span>Insert path</span></div>`,
      `<div class="ctx-item" data-a="copy"><span>Copy path</span></div>`,
      multiCount > 1 ? `<div class="ctx-sep"></div>` : "",
      multiCount > 1 ? `<div class="ctx-item" data-a="insert-all"><span>Insert ${multiCount} paths</span></div>` : "",
      multiCount > 1 ? `<div class="ctx-item" data-a="copy-all"><span>Copy ${multiCount} paths</span></div>` : "",
      `<div class="ctx-sep"></div>`,
      !isDir ? `<div class="ctx-item" data-a="cat"><span>Cat file</span></div>` : "",
      isDir ? `<div class="ctx-item" data-a="ls"><span>List contents</span></div>` : "",
    ].filter(Boolean).join("");
    feMenu.style.left = Math.min(x, innerWidth - 200) + "px";
    feMenu.style.top = Math.min(y, innerHeight - 200) + "px";
    feMenu.style.display = "block";

    const onClick = (e) => {
      const it = e.target.closest(".ctx-item");
      if (!it) return;
      feMenu.style.display = "none";
      const s = ctx.getActive();
      switch (it.dataset.a) {
        case "cd": if (s) { s.sendInput("cd " + shellEscape(item.path) + "\r"); ctx.hiddenInput.focus(); } break;
        case "cd-tab": { const ns = ctx.createSession(item.path); break; }
        case "view": if (ctx.openFile) ctx.openFile(item.path); break;
        case "edit-term": if (s) { s.sendInput("${EDITOR:-vim} " + shellEscape(item.path) + "\r"); ctx.hiddenInput.focus(); } break;
        case "insert": if (s) { s.sendInput(shellEscape(item.path) + " "); ctx.hiddenInput.focus(); } break;
        case "copy": navigator.clipboard.writeText(item.path); break;
        case "cat": if (s) { s.sendInput("cat " + shellEscape(item.path) + "\r"); ctx.hiddenInput.focus(); } break;
        case "ls": if (s) { s.sendInput("ls -la " + shellEscape(item.path) + "\r"); ctx.hiddenInput.focus(); } break;
        case "insert-all": if (s) { const paths = selected.map(el => shellEscape(el.title)).join(" "); s.sendInput(paths + " "); ctx.hiddenInput.focus(); } break;
        case "copy-all": { const paths = selected.map(el => el.title).join("\n"); navigator.clipboard.writeText(paths); } break;
      }
    };
    // Remove previous listener, add new one for this menu instance
    feMenu.onclick = onClick;
  }

  document.addEventListener("click", () => { feMenu.style.display = "none"; });

  function escName(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function shellEscape(s) {
    if (/^[~/\w.\-/]+$/.test(s)) return s;
    return "'" + s.replace(/'/g, "'\\''") + "'";
  }

  // Open/close
  function openPanel() {
    panel.classList.add("open");
    // Start from active session's cwd or home
    const s = ctx.getActive();
    const dir = s?.cwd || s?.vt?.title || "~";
    loadDir(dir);
  }

  function closePanel() {
    panel.classList.remove("open");
    ctx.hiddenInput.focus();
  }

  header.querySelector("#fe-close").addEventListener("click", closePanel);
  pathEl.addEventListener("click", () => {
    if (currentPath) {
      const s = ctx.getActive();
      if (s) s.sendInput("cd " + shellEscape(currentPath) + "\r");
      ctx.hiddenInput.focus();
    }
  });

  document.getElementById("fe-hidden").addEventListener("change", (e) => {
    showHidden = e.target.checked;
    if (currentPath) loadDir(currentPath);
  });

  // Refresh when session cwd changes
  ctx.bus.on("session:activated", () => {
    if (panel.classList.contains("open")) {
      const s = ctx.getActive();
      if (s?.cwd) loadDir(s.cwd);
    }
  });

  // Commands
  ctx.commands.push(
    { name: "Toggle File Explorer", key: "Ctrl+Shift+B", action: () => panel.classList.contains("open") ? closePanel() : openPanel() },
  );

  ctx.bus.on("shortcut:file-explorer", () => panel.classList.contains("open") ? closePanel() : openPanel());
}
