export default function(ctx) {
  const tabBar = document.getElementById("tab-bar");
  let dragTab = null;

  // Make tabs draggable
  ctx.bus.on("session:activated", () => {
    ctx.sessions.forEach(s => {
      s.tabEl.draggable = true;
    });
  });

  tabBar.addEventListener("dragstart", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    dragTab = tab;
    tab.style.opacity = "0.4";
    e.dataTransfer.effectAllowed = "move";
  });

  tabBar.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const target = e.target.closest(".tab");
    if (!target || target === dragTab) return;
    const rect = target.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    if (e.clientX < mid) {
      tabBar.insertBefore(dragTab, target);
    } else {
      tabBar.insertBefore(dragTab, target.nextSibling);
    }
  });

  tabBar.addEventListener("dragend", () => {
    if (dragTab) dragTab.style.opacity = "";
    dragTab = null;
    // Sync sessions array order with DOM order
    const tabs = Array.from(tabBar.querySelectorAll(".tab"));
    ctx.sessions.sort((a, b) => tabs.indexOf(a.tabEl) - tabs.indexOf(b.tabEl));
    if (ctx.saveTabState) ctx.saveTabState();
  });
}
