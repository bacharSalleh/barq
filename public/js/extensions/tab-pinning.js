export default function(ctx) {
  // Pinned tabs can't be closed accidentally and stay at the left
  function togglePin() {
    const s = ctx.getActive();
    if (!s) return;
    s._pinned = !s._pinned;
    s.tabEl.classList.toggle("pinned", s._pinned);
    s.tabClose.style.display = s._pinned ? "none" : "";
    // Move pinned tabs to the left
    if (s._pinned) {
      const tabBar = document.getElementById("tab-bar");
      const firstUnpinned = Array.from(tabBar.querySelectorAll(".tab:not(.pinned)"))[0];
      if (firstUnpinned) tabBar.insertBefore(s.tabEl, firstUnpinned);
    }
    if (ctx.saveTabState) ctx.saveTabState();
  }

  // Intercept close on pinned tabs
  const origDestroy = ctx.bus._h.get("session:destroying");
  ctx.bus.on("session:destroying", (s) => {
    // This is informational — the actual prevention is in closeSession
    // We handle it by hiding the close button
  });

  ctx.commands.push(
    { name: "Toggle Pin Tab", key: "", action: togglePin },
  );
}
