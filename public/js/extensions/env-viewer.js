export default function(ctx) {
  ctx.commands.push({
    name: "Show Environment Variables",
    key: "",
    action: () => {
      const s = ctx.getActive();
      if (s) { s.sendInput("env | sort\r"); ctx.hiddenInput.focus(); }
    }
  }, {
    name: "Show PATH (formatted)",
    key: "",
    action: () => {
      const s = ctx.getActive();
      if (s) { s.sendInput("echo $PATH | tr ':' '\\n'\r"); ctx.hiddenInput.focus(); }
    }
  }, {
    name: "Show Disk Usage",
    key: "",
    action: () => {
      const s = ctx.getActive();
      if (s) { s.sendInput("df -h .\r"); ctx.hiddenInput.focus(); }
    }
  }, {
    name: "Show System Info",
    key: "",
    action: () => {
      const s = ctx.getActive();
      if (s) { s.sendInput("uname -a && echo '' && sw_vers 2>/dev/null || cat /etc/os-release 2>/dev/null\r"); ctx.hiddenInput.focus(); }
    }
  }, {
    name: "Show Port Usage",
    key: "",
    action: () => {
      const s = ctx.getActive();
      if (s) { s.sendInput("lsof -iTCP -sTCP:LISTEN -P 2>/dev/null || ss -tlnp 2>/dev/null\r"); ctx.hiddenInput.focus(); }
    }
  });
}
