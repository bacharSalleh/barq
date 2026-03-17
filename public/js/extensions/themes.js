const THEMES = {
  dark: "Dark",
  light: "Light",
  matrix: "Matrix",
  "dark+": "Dark+"
};

export default function(ctx) {
  const picker = document.getElementById("theme-picker");
  const btn = document.getElementById("theme-btn");
  let current = localStorage.getItem("ttb-theme") || "dark";
  let rainAnim = null;

  function apply(id) {
    document.documentElement.dataset.theme = id;
    current = id; localStorage.setItem("ttb-theme", id);
    ctx.sessions.forEach(s => s.prevHtml.fill(""));
    ctx.scheduleRender(); build();

    // Matrix rain
    if (id === "matrix") startMatrixRain();
    else stopMatrixRain();
  }

  function build() {
    picker.innerHTML = "";
    for (const [id, name] of Object.entries(THEMES)) {
      const opt = document.createElement("div");
      opt.className = "theme-option" + (id === current ? " active" : "");
      opt.innerHTML = `<span class="theme-swatch" style="background:var(--bg)"></span>${name}`;
      opt.addEventListener("click", () => { apply(id); picker.classList.remove("open"); ctx.hiddenInput.focus(); });
      picker.appendChild(opt);
    }
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    picker.classList.toggle("open");
    if (picker.classList.contains("open")) {
      build();
      const r = btn.getBoundingClientRect();
      picker.style.top = (r.bottom + 4) + "px";
      picker.style.right = (window.innerWidth - r.right) + "px";
      picker.style.left = "auto";
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#theme-picker") && !e.target.closest("#theme-btn"))
      picker.classList.remove("open");
  });

  if (current !== "dark") apply(current);

  for (const [id, name] of Object.entries(THEMES)) {
    ctx.commands.push({ name: "Theme: " + name, key: "", action: () => apply(id) });
  }

  // ─── Matrix rain ──────────────────────────────────────────────
  const canvas = document.getElementById("matrix-rain");
  let cols = 0, drops = [];

  function startMatrixRain() {
    if (rainAnim) return;
    const container = document.getElementById("terminals-container");
    const cctx = canvas.getContext("2d");

    function resize() {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      const fontSize = 14;
      cols = Math.floor(canvas.width / fontSize);
      // Keep existing drops, extend or trim
      while (drops.length < cols) drops.push(Math.random() * -50 | 0);
      drops.length = cols;
    }

    resize();
    window.addEventListener("resize", resize);
    canvas._resizeHandler = resize;

    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
    const fontSize = 14;

    function draw() {
      cctx.fillStyle = "rgba(0, 10, 0, 0.06)";
      cctx.fillRect(0, 0, canvas.width, canvas.height);
      cctx.fillStyle = "#00ff41";
      cctx.font = fontSize + "px monospace";

      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.random() * chars.length | 0];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Brighter head
        if (Math.random() > 0.5) {
          cctx.fillStyle = "#aaffaa";
          cctx.fillText(ch, x, y);
          cctx.fillStyle = "#00ff41";
        } else {
          cctx.fillText(ch, x, y);
        }

        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }

      rainAnim = requestAnimationFrame(draw);
    }

    draw();
  }

  function stopMatrixRain() {
    if (rainAnim) { cancelAnimationFrame(rainAnim); rainAnim = null; }
    if (canvas._resizeHandler) {
      window.removeEventListener("resize", canvas._resizeHandler);
      canvas._resizeHandler = null;
    }
    const cctx = canvas.getContext("2d");
    cctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Auto-start if matrix is already active
  if (current === "matrix") startMatrixRain();
}
