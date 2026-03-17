export default function(ctx) {
  let scrollMode = false;
  const container = document.getElementById("terminals-container");

  function enter() {
    scrollMode = true;
    container.style.outline = "2px solid var(--accent)";
    container.style.outlineOffset = "-2px";
  }

  function exit() {
    scrollMode = false;
    container.style.outline = "";
    container.style.outlineOffset = "";
    // Scroll to bottom
    const s = ctx.getActive();
    if (s) s.wrapEl.scrollTop = s.wrapEl.scrollHeight;
  }

  ctx.bus.on("shortcut:scroll-mode", () => scrollMode ? exit() : enter());

  // Intercept keys in scroll mode
  const hiddenInput = ctx.hiddenInput;
  hiddenInput.addEventListener("keydown", (e) => {
    if (!scrollMode) return;
    const s = ctx.getActive();
    if (!s) return;
    const wrap = s.wrapEl;
    const pageH = wrap.clientHeight;

    switch (e.key) {
      case "k": case "ArrowUp": wrap.scrollTop -= 20; e.preventDefault(); e.stopPropagation(); break;
      case "j": case "ArrowDown": wrap.scrollTop += 20; e.preventDefault(); e.stopPropagation(); break;
      case "u": wrap.scrollTop -= pageH / 2; e.preventDefault(); e.stopPropagation(); break;
      case "d": wrap.scrollTop += pageH / 2; e.preventDefault(); e.stopPropagation(); break;
      case "g": wrap.scrollTop = 0; e.preventDefault(); e.stopPropagation(); break;
      case "G": wrap.scrollTop = wrap.scrollHeight; e.preventDefault(); e.stopPropagation(); break;
      case "q": case "Escape": exit(); e.preventDefault(); e.stopPropagation(); break;
      default:
        // Any other key exits scroll mode and passes through
        exit();
    }
  }, true); // capture phase — before terminal keydown

  ctx.commands.push(
    { name: "Toggle Scroll Mode (vim keys)", key: "Ctrl+Shift+K", action: () => scrollMode ? exit() : enter() },
  );
}
