// Show elapsed time for commands in the status bar
export default function(ctx) {
  const sbRight = document.getElementById("sb-right");
  let timerEl = null;
  let startTime = null;
  let timerInterval = null;

  function startTimer() {
    startTime = Date.now();
    if (!timerEl) {
      timerEl = document.createElement("span");
      timerEl.style.cssText = "color:var(--c3);margin-right:8px;";
      sbRight.insertBefore(timerEl, sbRight.firstChild);
    }
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function stopTimer() {
    clearInterval(timerInterval);
    if (startTime && timerEl) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      timerEl.textContent = `${elapsed}s`;
      timerEl.style.color = "var(--c2)"; // green when done
      setTimeout(() => { if (timerEl) { timerEl.textContent = ""; timerEl.style.color = "var(--c3)"; } }, 5000);
    }
    startTime = null;
  }

  function updateTimer() {
    if (!startTime || !timerEl) return;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    timerEl.textContent = `⏱ ${elapsed}s`;
  }

  // Start timer on Enter (command submission), stop on next prompt
  ctx.bus.on("input:before", (session, data) => {
    if (data === "\r" && session === ctx.getActive() && !session.vt.isAlt) {
      startTimer();
    }
  });

  // Heuristic: if cursor returns to col 0-5 after output, command probably finished
  let lastCurCol = 0;
  ctx.bus.on("render:after", (session) => {
    if (session !== ctx.getActive() || !startTime) return;
    const vt = session.vt;
    if (vt.cursorVisible && vt.curCol <= 5 && lastCurCol > 5) {
      stopTimer();
    }
    lastCurCol = vt.curCol;
  });
}
