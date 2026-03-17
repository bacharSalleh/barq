// AI Prompt Templates — one-click Claude prompts with auto-context
export default function(ctx) {

  const TEMPLATES = [
    {
      name: "🔧 Fix This Error",
      prompt: (c) => `Fix this error. Here's the context:\n\n${c.errors || c.recentOutput || "No error detected"}\n\nWorking directory: ${c.cwd}${c.git ? "\nGit: " + c.git.split("\n")[0] : ""}`,
    },
    {
      name: "💡 Explain Output",
      prompt: (c) => `Explain this terminal output in simple terms:\n\n${c.recentOutput || "No output"}\n\nWorking directory: ${c.cwd}`,
    },
    {
      name: "🧪 Write Tests",
      prompt: (c) => `Write comprehensive tests for the code in ${c.cwd}. Focus on the recently changed files:\n${c.git || "No git info"}`,
    },
    {
      name: "📝 Code Review",
      prompt: (c) => `Review the current changes for bugs, security issues, and improvements:\n\n${c.git || "No changes detected"}\n\nWorking directory: ${c.cwd}`,
    },
    {
      name: "⚡ Optimize",
      prompt: (c) => `Look at the code in ${c.cwd} and suggest performance optimizations. Recent output:\n${c.recentOutput || "None"}`,
    },
    {
      name: "📖 Document",
      prompt: (c) => `Write documentation for the code in ${c.cwd}. Add docstrings, comments, and a README section for the recently changed files:\n${c.git || "No git info"}`,
    },
    {
      name: "🐛 Debug",
      prompt: (c) => `Help me debug this issue. Here's what I see:\n\n${c.recentOutput || "No output"}\n\nErrors:\n${c.errors || "None detected"}\n\nWorking directory: ${c.cwd}`,
    },
    {
      name: "🔄 Refactor",
      prompt: (c) => `Refactor the code in ${c.cwd} for better readability and maintainability. Focus on:\n${c.git || "recent changes"}`,
    },
  ];

  async function runTemplate(template) {
    const s = ctx.getActive();
    if (!s) return;

    if (!ctx.buildAIContext) { if (ctx.toast) ctx.toast("AI Context extension not loaded"); return; }

    const context = await ctx.buildAIContext();
    const prompt = template.prompt(context);

    // Send to Claude in the terminal
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    s.sendInput(`claude -p "${escaped}"\r`);
    ctx.hiddenInput.focus();
  }

  // Register all templates as commands
  TEMPLATES.forEach(t => {
    ctx.commands.push({ name: `AI: ${t.name}`, key: "", action: () => runTemplate(t) });
  });

  // Custom prompt with context
  ctx.commands.push({
    name: "AI: Custom Prompt with Context…",
    key: "",
    action: async () => {
      if (!ctx.modal || !ctx.buildAIContext) return;
      const context = await ctx.buildAIContext();
      const ctxPreview = ctx.formatAIContext(context);

      ctx.modal("AI Prompt with Context", [
        { name: "prompt", label: "Your prompt", type: "textarea", rows: 4, placeholder: "What do you want Claude to do?" },
        { name: "context", label: "Auto-detected context (editable)", type: "textarea", rows: 6, value: ctxPreview },
      ], (vals) => {
        if (!vals.prompt) return;
        const s = ctx.getActive();
        if (!s) return;
        const full = vals.prompt + "\n\n--- Context ---\n" + vals.context;
        const escaped = full.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        s.sendInput(`claude -p "${escaped}"\r`);
        ctx.hiddenInput.focus();
      });
    }
  });
}
