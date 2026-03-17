// Show CPU and memory usage in the status bar (own element, not clobbered by status-bar ext)
export default function(ctx) {
  // Create a dedicated perf span in the status bar
  const statusBar = document.getElementById("status-bar");
  const perfEl = document.createElement("span");
  perfEl.style.cssText = "font-size:10px;display:flex;align-items:center;gap:6px;";
  statusBar.appendChild(perfEl);

  async function update() {
    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "top -l 1 -n 0 2>/dev/null | awk '/CPU usage/{printf \"%s %s\",$3,$5}' || ps -A -o %cpu,%mem | awk '{c+=$1;m+=$2} END{n=1;\"sysctl -n hw.ncpu 2>/dev/null\"|getline n;printf \"%.0f%% %.0f%%\",c/n,m}'", cwd: "/" }),
      });
      const data = await res.json();
      if (!data.output) return;
      const parts = data.output.trim().split(/\s+/);
      // macOS top gives "user% sys%" — add them for total CPU
      const v1 = parseFloat(parts[0]) || 0;
      const v2 = parseFloat(parts[1]) || 0;
      const cpuVal = Math.round(v1 + v2);
      const cpuColor = cpuVal > 80 ? "var(--c1)" : cpuVal > 40 ? "var(--c3)" : "var(--c2)";
      perfEl.innerHTML = `<span style="color:${cpuColor}">CPU ${cpuVal}%</span>`;
    } catch {}
  }

  setInterval(update, 60000); // every 60s instead of 10s
  setTimeout(update, 5000);
}
