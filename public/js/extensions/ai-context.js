// AI Context Builder — packages terminal context for Claude prompts
export default function(ctx) {

  // Build rich context from current terminal state
  async function buildContext() {
    const s = ctx.getActive();
    if (!s) return {};

    const cwd = s.cwd || "unknown";
    const parts = { cwd };

    // Git info
    try {
      const res = await fetch("/api/exec", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "git rev-parse --abbrev-ref HEAD 2>/dev/null && echo '---' && git diff --stat HEAD 2>/dev/null | tail -5", cwd }) });
      const data = await res.json();
      if (data.output?.trim()) parts.git = data.output.trim();
    } catch {}

    // Recent terminal output (last 20 visible lines)
    const lines = [];
    for (let i = Math.max(0, s.vt.rows - 20); i < s.vt.rows; i++) {
      const row = s.vt.buffer[i];
      let line = "";
      for (const cell of row) line += cell.ch;
      line = line.trimEnd();
      if (line) lines.push(line);
    }
    if (lines.length) parts.recentOutput = lines.join("\n");

    // Last error (scan screen for error patterns)
    const errorRe = /error|ERR!|FATAL|panic|exception|traceback|failed|failure|not found|permission denied/i;
    const errorLines = lines.filter(l => errorRe.test(l));
    if (errorLines.length) parts.errors = errorLines.join("\n");

    return parts;
  }

  function formatContext(parts) {
    let ctx_text = "";
    if (parts.cwd) ctx_text += `Working directory: ${parts.cwd}\n`;
    if (parts.git) ctx_text += `\nGit:\n${parts.git}\n`;
    if (parts.errors) ctx_text += `\nErrors found:\n${parts.errors}\n`;
    if (parts.recentOutput) ctx_text += `\nRecent terminal output:\n${parts.recentOutput}\n`;
    return ctx_text;
  }

  // Expose for other extensions
  ctx.buildAIContext = buildContext;
  ctx.formatAIContext = formatContext;
}
