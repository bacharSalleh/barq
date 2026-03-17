// Render markdown files in a modal — uses basic HTML conversion
export default function(ctx) {

  async function previewFile(filePath) {
    const path = filePath || prompt("Markdown file path:");
    if (!path) return;

    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.error) { if(ctx.toast) ctx.toast(data.error); return; }

      showPreview(data.name, data.content);
    } catch (e) { if(ctx.toast) ctx.toast("Error: " + e.message); }
  }

  function showPreview(title, md) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:8px;width:75vw;max-width:800px;height:75vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--ui-border);";
    header.innerHTML = `<span style="font-size:14px;font-weight:600;color:var(--fg);">📄 ${esc(title)}</span>`;
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    closeBtn.onclick = close;
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;overflow:auto;padding:16px 24px;min-height:0;color:var(--fg);font-size:14px;line-height:1.7;user-select:text;cursor:text;";
    body.innerHTML = renderMarkdown(md);

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    const escH = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", escH); const origClose = close; close = () => { document.removeEventListener("keydown", escH); origClose(); };
  }

  function renderMarkdown(md) {
    let html = esc(md);
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3 style="color:var(--accent);margin:16px 0 8px;">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="color:var(--accent);margin:20px 0 8px;border-bottom:1px solid var(--ui-border);padding-bottom:4px;">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="color:var(--accent);margin:20px 0 10px;">$1</h1>');
    // Bold/italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:var(--bg);padding:10px 14px;border-radius:6px;border:1px solid var(--ui-border);margin:8px 0;overflow-x:auto;">$2</pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:var(--ui-bg3);padding:1px 5px;border-radius:3px;font-size:13px;">$1</code>');
    // Lists
    html = html.replace(/^- \[x\] (.+)$/gm, '<div style="padding:2px 0;">☑ $1</div>');
    html = html.replace(/^- \[ \] (.+)$/gm, '<div style="padding:2px 0;">☐ $1</div>');
    html = html.replace(/^[-*] (.+)$/gm, '<div style="padding:2px 0 2px 16px;">• $1</div>');
    html = html.replace(/^\d+\. (.+)$/gm, '<div style="padding:2px 0 2px 16px;">$&</div>');
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--c4);">$1</a>');
    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--ui-border);margin:16px 0;">');
    // Paragraphs (double newline)
    html = html.replace(/\n\n/g, '</p><p style="margin:8px 0;">');
    html = '<p style="margin:8px 0;">' + html + '</p>';
    return html;
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // Hook into file explorer — detect .md files
  ctx.bus.on("session:activated", () => {
    // Register preview for .md in file viewer
  });

  ctx.commands.push(
    { name: "Markdown: Preview File…", key: "", action: () => previewFile() },
    { name: "Markdown: Preview README", key: "", action: () => {
      const s = ctx.getActive();
      const cwd = s?.cwd || "~";
      previewFile(cwd + "/README.md");
    }},
  );

  // Expose for file explorer double-click on .md files
  ctx.previewMarkdown = previewFile;
}
