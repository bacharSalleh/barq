const THEMES = {
  dark:"Dark", dracula:"Dracula", nord:"Nord",
  solarized:"Solarized", monokai:"Monokai", onedark:"One Dark"
};

export default function(ctx) {
  const picker = document.getElementById("theme-picker");
  const btn = document.getElementById("theme-btn");
  let current = localStorage.getItem("ttb-theme") || "dark";

  function apply(id) {
    document.documentElement.dataset.theme = id;
    current = id; localStorage.setItem("ttb-theme", id);
    ctx.sessions.forEach(s => s.prevHtml.fill(""));
    ctx.scheduleRender(); build();
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

  // Register commands
  for (const [id, name] of Object.entries(THEMES)) {
    ctx.commands.push({ name: "Theme: " + name, key: "", action: () => apply(id) });
  }
}
