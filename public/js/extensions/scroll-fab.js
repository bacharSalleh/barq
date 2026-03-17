// Floating action button — appears when scrolled up, click to snap to bottom
export default function(ctx) {
  const fab = document.getElementById("scroll-fab");
  if (!fab) return;

  fab.addEventListener("click", () => {
    const s = ctx.getActive();
    if (!s) return;
    s.wrapEl.scrollTop = s.wrapEl.scrollHeight;
    fab.classList.remove("show");
    ctx.hiddenInput.focus();
  });

  // Show/hide based on scroll position
  let checkTimer = null;
  function check() {
    const s = ctx.getActive();
    if (!s) { fab.classList.remove("show"); return; }
    const w = s.wrapEl;
    const atBottom = w.scrollHeight - w.scrollTop - w.clientHeight < 50;
    fab.classList.toggle("show", !atBottom && w.scrollHeight > w.clientHeight + 100);
  }

  // Check on scroll (throttled)
  document.getElementById("terminals-container").addEventListener("scroll", () => {
    if (checkTimer) return;
    checkTimer = setTimeout(() => { checkTimer = null; check(); }, 100);
  }, true); // capture to get scroll events from child wrapEls

  // Also check after renders
  ctx.bus.on("render:after", check);
  ctx.bus.on("session:activated", check);
}
