export function color256(n) {
  if (n < 16) return ["#000","#a00","#0a0","#a50","#00a","#a0a","#0aa","#aaa","#555","#f55","#5f5","#ff5","#55f","#f5f","#5ff","#fff"][n];
  if (n < 232) { const i=n-16,r=Math.floor(i/36),g=Math.floor((i%36)/6),b=i%6; return `rgb(${r?r*40+55:0},${g?g*40+55:0},${b?b*40+55:0})`; }
  const v = (n-232)*10+8; return `rgb(${v},${v},${v})`;
}

export function colorCss(c) {
  return c === null ? "" : typeof c === "number" ? color256(c) : `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function styleKey(s) {
  return ((s.bold?1:0)|(s.dim?2:0)|(s.italic?4:0)|(s.ul?8:0)|(s.strike?16:0)|(s.reverse?32:0)) + "|" + s.fg + "|" + s.bg;
}

export function escH(t) { return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

export function makeSpan(text, s) {
  const e = escH(text), cls = []; let inl = "";
  if (s.bold) cls.push("ansi-bold");
  if (s.dim) cls.push("ansi-dim");
  if (s.italic) cls.push("ansi-italic");
  if (s.ul) cls.push("ansi-underline");
  if (s.strike) cls.push("ansi-strike");

  let fg = s.fg, bg = s.bg;
  if (s.reverse) { fg = s.bg; bg = s.fg; if (fg === null) fg = [13,13,13]; if (bg === null) bg = [232,232,232]; }
  if (fg !== null) { if (typeof fg === "number" && fg < 16) cls.push("ansi-fg-"+fg); else inl += "color:"+colorCss(fg)+";"; }
  if (bg !== null) { if (typeof bg === "number" && bg < 16) cls.push("ansi-bg-"+bg); else inl += "background:"+colorCss(bg)+";"; }

  const ca = cls.length ? ` class="${cls.join(" ")}"` : "", sa = inl ? ` style="${inl}"` : "";
  return (ca || sa) ? `<span${ca}${sa}>${e}</span>` : e;
}

const URL_RE = /https?:\/\/[^\s<>"'`)\]},;]+/g;
function linkify(html) {
  return html.replace(/(>[^<]*<)/g, seg => seg.replace(URL_RE, u =>
    `<a class="term-link" href="${escH(u)}" target="_blank" rel="noopener">${u}</a>`));
}

export function renderRow(row, cursorCol) {
  let html = "", curKey = null, curStyle = null, text = "";
  let end = row.length - 1;
  while (end >= 0 && row[end].ch === " " && !row[end].s.reverse && row[end].s.fg === null && row[end].s.bg === null
    && !row[end].s.bold && !row[end].s.dim && !row[end].s.italic && !row[end].s.ul && !row[end].s.strike) end--;
  if (cursorCol >= 0) end = Math.max(end, cursorCol);

  for (let i = 0; i <= end; i++) {
    if (i === cursorCol) {
      if (text) { html += makeSpan(text, curStyle); text = ""; }
      html += '<span class="cur">' + (row[i].ch === " " ? "\u00a0" : escH(row[i].ch)) + "</span>";
      curKey = null; curStyle = null; continue;
    }
    const cell = row[i], key = styleKey(cell.s);
    if (key !== curKey) { if (text) html += makeSpan(text, curStyle); text = cell.ch; curStyle = cell.s; curKey = key; }
    else text += cell.ch;
  }
  if (text) html += makeSpan(text, curStyle);
  if (cursorCol < 0) html = linkify(html);
  return html;
}

export function rowToText(row) { let t = ""; for (const c of row) t += c.ch; return t.trimEnd(); }

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
export function detectScript(text) {
  if (ARABIC_RE.test(text)) return "ar";
  if (HEBREW_RE.test(text)) return "he";
  return null;
}
