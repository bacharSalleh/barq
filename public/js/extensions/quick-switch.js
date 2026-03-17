// Quick tab switching with number keys (Ctrl+1-9)
export default function(ctx) {
  ctx.hiddenInput.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      const idx = num - 1;
      if (idx < ctx.sessions.length) {
        ctx.switchTo(ctx.sessions[idx]);
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true); // capture phase
}
