export default function(ctx) {

  function splitActive(direction) {
    const session = ctx.getActive();
    if (!session) return;

    const wrap = session.wrapEl;
    const parent = wrap.parentElement;
    const container = document.getElementById("terminals-container");

    // Create split structure
    const splitEl = document.createElement("div");
    splitEl.className = "split-container " + direction;

    const pane1 = document.createElement("div");
    pane1.className = "split-pane active-pane";

    const divider = document.createElement("div");
    divider.className = "split-divider";

    const pane2 = document.createElement("div");
    pane2.className = "split-pane";

    // Insert split where the wrap was
    parent.insertBefore(splitEl, wrap);

    // Move existing session into pane1
    wrap.classList.add("active");
    pane1.appendChild(wrap);

    splitEl.appendChild(pane1);
    splitEl.appendChild(divider);
    splitEl.appendChild(pane2);

    // Create new session for pane2
    const newSession = ctx.createSession();
    newSession.wrapEl.remove(); // remove from container (createSession appends there)
    newSession.wrapEl.classList.add("active");
    pane2.appendChild(newSession.wrapEl);

    // Track which pane owns which session
    pane1._session = session;
    pane2._session = newSession;

    setTimeout(() => resizeAll(splitEl), 100);
    setupDividerDrag(divider, splitEl, pane1, pane2);

    pane1.addEventListener("mousedown", () => activate(pane1));
    pane2.addEventListener("mousedown", () => activate(pane2));
  }

  function activate(paneEl) {
    document.querySelectorAll(".split-pane").forEach(p => p.classList.remove("active-pane"));
    paneEl.classList.add("active-pane");
    if (paneEl._session) ctx.switchTo(paneEl._session);
  }

  function resizeAll(splitEl) {
    splitEl.querySelectorAll(".terminal-wrap").forEach(wrap => {
      const session = ctx.sessions.find(s => s.wrapEl === wrap);
      if (!session) return;
      const rect = wrap.getBoundingClientRect();
      const cw = ctx.probe.offsetWidth / 20 || 8.4;
      const cols = Math.floor((rect.width - 24) / cw) || 80;
      const rows = Math.floor(rect.height / (14 * 1.4)) || 20;
      session.resize(rows, cols);
    });
    ctx.scheduleRender();
  }

  function setupDividerDrag(divider, splitEl, pane1, pane2) {
    const isV = splitEl.classList.contains("vertical");
    divider.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startPos = isV ? e.clientX : e.clientY;
      const startS1 = isV ? pane1.offsetWidth : pane1.offsetHeight;
      const startS2 = isV ? pane2.offsetWidth : pane2.offsetHeight;
      const onMove = (e) => {
        const d = (isV ? e.clientX : e.clientY) - startPos;
        const total = startS1 + startS2;
        pane1.style.flex = `0 0 ${Math.max(50, Math.min(total-50, startS1+d))}px`;
        pane2.style.flex = `0 0 ${total - Math.max(50, Math.min(total-50, startS1+d))}px`;
      };
      const onUp = () => { document.removeEventListener("mousemove",onMove); document.removeEventListener("mouseup",onUp); resizeAll(splitEl); };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  // Clean up split when a session inside it is closed/destroyed
  ctx.bus.on("session:destroying", cleanup);

  function cleanup(session) {
    const wrap = session.wrapEl;
    const pane = wrap.closest(".split-pane");
    if (!pane) return;

    const splitEl = pane.closest(".split-container");
    if (!splitEl) return;

    // Find the sibling pane (the one that stays)
    const allPanes = Array.from(splitEl.querySelectorAll(":scope > .split-pane"));
    const siblingPane = allPanes.find(p => p !== pane);

    if (siblingPane) {
      // Unwrap: replace the split container with the sibling's content
      const siblingWrap = siblingPane.querySelector(".terminal-wrap");
      const parent = splitEl.parentElement;

      if (siblingWrap) {
        parent.insertBefore(siblingWrap, splitEl);
      }
      splitEl.remove();

      // If sibling has a session, resize it to fill the space
      const sibSession = ctx.sessions.find(s => s.wrapEl === siblingWrap);
      if (sibSession) {
        setTimeout(() => {
          const rect = siblingWrap.getBoundingClientRect();
          const cw = ctx.probe.offsetWidth / 20 || 8.4;
          sibSession.resize(
            Math.floor(rect.height / (14*1.4)) || 30,
            Math.floor((rect.width-24) / cw) || 120
          );
          ctx.scheduleRender();
        }, 50);
      }
    } else {
      // No sibling, just remove the split
      splitEl.remove();
    }
  }

  ctx.commands.push(
    { name: "Split Vertical", key: "Ctrl+Shift+D", action: () => splitActive("vertical") },
    { name: "Split Horizontal", key: "Ctrl+Shift+E", action: () => splitActive("horizontal") },
  );

  ctx.bus.on("shortcut:split-v", () => splitActive("vertical"));
  ctx.bus.on("shortcut:split-h", () => splitActive("horizontal"));
}
