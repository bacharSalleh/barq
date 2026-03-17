export default function(ctx) {
  const container = document.getElementById("terminals-container");

  // Visual feedback
  let overlay = null;

  function showOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.style.cssText = "position:absolute;inset:0;background:rgba(233,69,96,0.15);border:2px dashed var(--accent);z-index:40;display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--accent);pointer-events:none;border-radius:4px;";
    overlay.textContent = "Drop files to insert paths";
    container.appendChild(overlay);
  }

  function hideOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  container.addEventListener("dragenter", (e) => {
    if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); showOverlay(); }
  });
  container.addEventListener("dragover", (e) => {
    if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }
  });
  container.addEventListener("dragleave", (e) => {
    if (e.relatedTarget && container.contains(e.relatedTarget)) return;
    hideOverlay();
  });
  container.addEventListener("drop", (e) => {
    e.preventDefault();
    hideOverlay();
    const s = ctx.getActive();
    if (!s) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Insert file paths (space-separated, escaped)
    const paths = files.map(f => {
      // webkitRelativePath or name — browsers don't give full path for security
      // But if dropped from Finder on macOS, the path is available via dataTransfer
      return f.name;
    });

    // Try to get actual file paths from items (works in some contexts)
    const items = Array.from(e.dataTransfer.items || []);
    const entries = items.map(it => it.webkitGetAsEntry?.()).filter(Boolean);

    if (entries.length > 0) {
      // Use entry fullPath (relative path within dropped folder)
      const entryPaths = entries.map(en => en.fullPath || en.name);
      s.sendInput(entryPaths.join(" "));
    } else {
      s.sendInput(paths.join(" "));
    }
  });
}
