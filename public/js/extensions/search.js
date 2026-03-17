export default function(ctx) {
  const bar = document.getElementById("search-bar");
  const input = document.getElementById("search-input");
  const info = document.getElementById("search-info");
  let matches = [], idx = -1;

  function open() { bar.classList.add("open"); input.focus(); input.select(); }
  function close() { bar.classList.remove("open"); clearHL(); matches = []; idx = -1; info.textContent = "0/0"; ctx.hiddenInput.focus(); }
  function clearHL() { const s = ctx.getActive(); if (!s) return; s.wrapEl.querySelectorAll(".search-match,.search-match-active").forEach(el => el.replaceWith(document.createTextNode(el.textContent))); }

  function doSearch() {
    clearHL(); matches = []; idx = -1;
    const q = input.value, s = ctx.getActive();
    if (!q || !s) { info.textContent = "0/0"; return; }
    let re; try { re = new RegExp(q, "gi"); } catch { info.textContent = "bad regex"; return; }
    s.wrapEl.querySelectorAll(".term-line").forEach(line => {
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent; re.lastIndex = 0;
        const parts = []; let last = 0, m;
        while (m = re.exec(text)) {
          if (m.index > last) parts.push(document.createTextNode(text.slice(last, m.index)));
          const mark = document.createElement("span"); mark.className = "search-match"; mark.textContent = m[0];
          parts.push(mark); matches.push(mark); last = re.lastIndex;
          if (last === m.index) re.lastIndex++;
        }
        if (parts.length) { if (last < text.length) parts.push(document.createTextNode(text.slice(last))); const f = document.createDocumentFragment(); parts.forEach(p => f.appendChild(p)); node.replaceWith(f); }
      }
    });
    info.textContent = matches.length ? `0/${matches.length}` : "no matches";
    if (matches.length) nav(0);
  }

  function nav(i) {
    if (!matches.length) return;
    if (idx >= 0 && idx < matches.length) matches[idx].className = "search-match";
    idx = ((i % matches.length) + matches.length) % matches.length;
    matches[idx].className = "search-match-active";
    matches[idx].scrollIntoView({ block: "center", behavior: "smooth" });
    info.textContent = `${idx + 1}/${matches.length}`;
  }

  input.addEventListener("input", doSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.shiftKey ? nav(idx - 1) : nav(idx + 1); e.preventDefault(); }
    if (e.key === "Escape") { close(); e.preventDefault(); }
    e.stopPropagation();
  });
  document.getElementById("search-next").addEventListener("click", () => nav(idx + 1));
  document.getElementById("search-prev").addEventListener("click", () => nav(idx - 1));
  document.getElementById("search-close").addEventListener("click", close);

  ctx.commands.push({ name: "Search", key: "Ctrl+Shift+F", action: open });
  ctx.openSearch = open;

  ctx.bus.on("shortcut:search", () => bar.classList.contains("open") ? close() : open());
}
