export default function(ctx) {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "file-viewer-overlay";
  overlay.innerHTML = `
    <div id="file-viewer">
      <div class="fv-header">
        <span><span class="fv-title"></span><span class="fv-path"></span></span>
        <div class="fv-actions">
          <button class="fv-edit-btn">Edit</button>
          <button class="fv-save-btn primary" style="display:none">Save</button>
          <button class="fv-copy-btn">Copy</button>
          <button class="fv-insert-btn">Insert Path</button>
          <button class="fv-close-btn">Close</button>
        </div>
      </div>
      <div class="fv-body"></div>
      <div class="fv-status"><span class="fv-info"></span><span class="fv-lang"></span></div>
    </div>`;
  document.body.appendChild(overlay);

  const viewer = overlay.querySelector("#file-viewer");
  const title = viewer.querySelector(".fv-title");
  const pathEl = viewer.querySelector(".fv-path");
  const body = viewer.querySelector(".fv-body");
  const info = viewer.querySelector(".fv-info");
  const lang = viewer.querySelector(".fv-lang");
  const editBtn = viewer.querySelector(".fv-edit-btn");
  const saveBtn = viewer.querySelector(".fv-save-btn");
  const copyBtn = viewer.querySelector(".fv-copy-btn");
  const insertBtn = viewer.querySelector(".fv-insert-btn");
  const closeBtn = viewer.querySelector(".fv-close-btn");

  let currentFile = null;
  let isEditing = false;

  async function openFile(filePath) {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.error) { if(ctx.toast) ctx.toast(data.error); return; }

      currentFile = data;
      isEditing = false;
      title.textContent = data.name;
      pathEl.textContent = data.path;
      info.textContent = `${data.size} bytes · ${data.content.split("\n").length} lines`;
      lang.textContent = data.ext || "txt";

      showContent(data.content);
      editBtn.style.display = "";
      saveBtn.style.display = "none";
      overlay.classList.add("open");
    } catch (err) { if(ctx.toast) ctx.toast("Failed to open file: " + err.message); }
  }

  function showContent(content) {
    const pre = document.createElement("pre");
    pre.textContent = content;
    body.innerHTML = "";
    body.appendChild(pre);
  }

  function startEditing() {
    if (!currentFile) return;
    isEditing = true;
    const ta = document.createElement("textarea");
    ta.value = currentFile.content;
    ta.spellcheck = false;
    body.innerHTML = "";
    body.appendChild(ta);
    ta.focus();
    editBtn.style.display = "none";
    saveBtn.style.display = "";

    // Tab key inserts tab in textarea
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = ta.selectionStart;
        ta.value = ta.value.slice(0, start) + "\t" + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = start + 1;
      }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveFile();
      }
      e.stopPropagation();
    });
  }

  async function saveFile() {
    if (!currentFile) return;
    const ta = body.querySelector("textarea");
    if (!ta) return;
    const content = ta.value;
    try {
      const res = await fetch("/api/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentFile.path, content }),
      });
      const data = await res.json();
      if (data.error) { if(ctx.toast) ctx.toast("Save failed: " + data.error); return; }
      currentFile.content = content;
      info.textContent = `${content.length} bytes · ${content.split("\n").length} lines · saved ✓`;
    } catch (err) { if(ctx.toast) ctx.toast("Save failed: " + err.message); }
  }

  function close() {
    overlay.classList.remove("open");
    isEditing = false;
    currentFile = null;
    ctx.hiddenInput.focus();
  }

  editBtn.addEventListener("click", startEditing);
  saveBtn.addEventListener("click", saveFile);
  copyBtn.addEventListener("click", () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content);
    const orig = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    copyBtn.style.background = "var(--accent)";
    copyBtn.style.color = "#fff";
    setTimeout(() => { copyBtn.textContent = orig; copyBtn.style.background = ""; copyBtn.style.color = ""; }, 1500);
  });
  insertBtn.addEventListener("click", () => { if (currentFile) { const s = ctx.getActive(); if (s) s.sendInput(currentFile.path + " "); close(); } });
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("open")) { close(); e.preventDefault(); } });

  // Expose for other extensions (file explorer uses this)
  ctx.openFile = openFile;

  ctx.commands.push({ name: "Open File…", key: "", action: () => {
    const p = prompt("File path:");
    if (p) openFile(p);
  }});
}
