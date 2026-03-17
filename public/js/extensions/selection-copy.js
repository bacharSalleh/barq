export default function(ctx) {
  const container = document.getElementById("terminals-container");

  container.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    ctx.isSelecting = true;
    ctx.hiddenInput.blur();
  });

  document.addEventListener("mouseup", () => {
    if (!ctx.isSelecting) return;
    ctx.isSelecting = false;
    setTimeout(() => {
      const sel = window.getSelection().toString();
      if (sel) {
        navigator.clipboard.writeText(sel).catch(() => {});
      } else {
        ctx.hiddenInput.focus();
      }
    }, 10);
  });

  container.addEventListener("click", () => {
    setTimeout(() => { if (!window.getSelection().toString()) ctx.hiddenInput.focus(); }, 50);
  });
}
