// Auto-highlight errors/warnings + click error to send to Claude
export default function(ctx) {
  const style = document.createElement("style");
  style.textContent = `
    .term-line-error { border-left: 2px solid var(--c1); padding-left: 10px !important; }
    .term-line-warning { border-left: 2px solid var(--c3); padding-left: 10px !important; }
    .term-line-success { border-left: 2px solid var(--c2); padding-left: 10px !important; }
  `;
  document.head.appendChild(style);

  const ERROR_RE = /\b(error|ERR!|FATAL|fatal|panic|exception|traceback|failed|failure|ENOENT|EACCES|EPERM|EISDIR|ECONNREFUSED|ETIMEOUT|ENOMEM|segfault|segmentation fault|core dumped|undefined is not|cannot find|not found|no such file|permission denied|command not found|module not found|import error|syntax error|type error|reference error|assertion error|key error|value error|index error|attribute error|name error|runtime error|overflow error|zero division|null pointer|nil pointer|stack overflow|out of memory|connection refused|timeout|abort|killed|rejected|unhandled|uncaught)\b/i;
  const WARN_RE = /\b(warning|warn|deprecated|WARN|caution|notice|FutureWarning|DeprecationWarning|UserWarning)\b/i;
  const SUCCESS_RE = /\b(success|passed|✓|✔|done|completed|built in|compiled|finished|uploaded|deployed|installed|created|resolved|approved|merged)\b/i;

  ctx.bus.on("render:after", (session) => {
    session.screenDivs.forEach(div => {
      const text = div.textContent;
      div.classList.remove("term-line-error", "term-line-warning", "term-line-success");
      div.style.position = "relative";
      if (ERROR_RE.test(text)) div.classList.add("term-line-error");
      else if (WARN_RE.test(text)) div.classList.add("term-line-warning");
      else if (SUCCESS_RE.test(text)) div.classList.add("term-line-success");
    });
  });

}
