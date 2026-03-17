// Smart suggestions — detect failed commands, offer to send to Claude
export default function(ctx) {
  const style = document.createElement("style");
  style.textContent = `
    #ai-suggest {
      display: none; position: absolute; bottom: 28px; right: 16px; z-index: 10;
      background: var(--ui-bg); border: 1px solid var(--accent);
      border-radius: 8px; padding: 6px 12px;
      box-shadow: 0 4px 16px rgba(124,91,240,0.3);
      font-size: 11px; color: var(--fg); cursor: pointer;
      opacity: 0; transform: translateY(4px);
      transition: opacity 0.2s, transform 0.2s;
    }
    #ai-suggest.show { display: block; opacity: 1; transform: translateY(0); }
    #ai-suggest:hover { background: var(--accent); color: #fff; }
  `;
  document.head.appendChild(style);

  const suggest = document.createElement("div");
  suggest.id = "ai-suggest";
  suggest.innerHTML = '🤖 Ask Claude to fix?';
  document.getElementById("terminals-container").appendChild(suggest);

  let hideTimer = null;
  let lastError = "";

  // Detect errors in screen after render
  const ERROR_RE = /\b(error|ERR!|FATAL|panic|exception|traceback|failed|failure|command not found|No such file|Permission denied)\b/i;

  ctx.bus.on("render:after", (session) => {
    if (session !== ctx.getActive() || session.vt.isAlt) return;

    // Check last few screen lines for errors
    const vt = session.vt;
    for (let i = Math.max(0, vt.curRow - 3); i <= vt.curRow; i++) {
      let line = "";
      for (const cell of vt.buffer[i]) line += cell.ch;
      line = line.trim();
      if (ERROR_RE.test(line) && line !== lastError) {
        lastError = line;
        showSuggest(line, session);
        return;
      }
    }
  });

  function showSuggest(errorLine, session) {
    suggest.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => suggest.classList.remove("show"), 8000);

    suggest.onclick = async () => {
      suggest.classList.remove("show");

      let prompt = `I got this error, please help fix it:\n\n${errorLine}`;
      if (ctx.buildAIContext) {
        const context = await ctx.buildAIContext();
        prompt += `\n\nWorking directory: ${context.cwd}`;
        if (context.git) prompt += `\nGit: ${context.git.split("\n")[0]}`;
        if (context.recentOutput) prompt += `\n\nRecent output:\n${context.recentOutput.slice(-500)}`;
      }

      const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      session.sendInput(`claude -p "${escaped}"\r`);
      ctx.hiddenInput.focus();
      if (ctx.toast) ctx.toast("🤖 Asking Claude…");
    };
  }
}
