// Network diagnostics and inspection tools
export default function(ctx) {

  function netScan() {
    if (!ctx.modal) return;
    ctx.modal("Network Scan", [
      { name: "host", label: "Host", type: "text", value: "localhost", placeholder: "hostname or IP" },
      { name: "ports", label: "Ports", type: "text", value: "80,443,3000,5432,8080,8443", placeholder: "comma-separated" },
    ], (vals) => {
      if (!vals.host) return;
      const s = ctx.getActive();
      if (!s) return;
      const ports = vals.ports.split(",").map(p => p.trim()).filter(Boolean);
      const cmd = ports.map(p => `(echo >/dev/tcp/${vals.host}/${p}) 2>/dev/null && echo "  ✓ ${p} open" || echo "  ✗ ${p} closed"`).join("; ");
      s.sendInput(`echo "Scanning ${vals.host}..."; ${cmd}\r`);
      ctx.hiddenInput.focus();
    });
  }

  function curlTest() {
    if (!ctx.modal) return;
    ctx.modal("Quick HTTP Test", [
      { name: "url", label: "URL", type: "text", placeholder: "https://api.example.com/health" },
      { name: "verbose", label: "Show headers?", type: "select", options: ["No", "Yes"] },
    ], (vals) => {
      if (!vals.url) return;
      const s = ctx.getActive();
      if (!s) return;
      const v = vals.verbose === "Yes" ? " -v" : " -s -w '\\nHTTP %{http_code} | %{time_total}s | %{size_download} bytes\\n'";
      s.sendInput(`curl${v} '${vals.url}'\r`);
      ctx.hiddenInput.focus();
    });
  }

  function dnsLookup() {
    if (!ctx.modal) return;
    ctx.modal("DNS Lookup", [
      { name: "domain", label: "Domain", type: "text", placeholder: "example.com" },
      { name: "type", label: "Record type", type: "select", options: ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"] },
    ], (vals) => {
      if (!vals.domain) return;
      const s = ctx.getActive();
      if (s) { s.sendInput(`dig ${vals.domain} ${vals.type} +short\r`); ctx.hiddenInput.focus(); }
    });
  }

  function pingTest() {
    if (!ctx.modal) return;
    ctx.modal("Ping", [
      { name: "host", label: "Host", type: "text", placeholder: "google.com" },
      { name: "count", label: "Count", type: "text", value: "5" },
    ], (vals) => {
      if (!vals.host) return;
      const s = ctx.getActive();
      if (s) { s.sendInput(`ping -c ${vals.count || 5} ${vals.host}\r`); ctx.hiddenInput.focus(); }
    });
  }

  ctx.commands.push(
    { name: "Network: Port Scan…", key: "", action: netScan },
    { name: "Network: HTTP Test…", key: "", action: curlTest },
    { name: "Network: DNS Lookup…", key: "", action: dnsLookup },
    { name: "Network: Ping…", key: "", action: pingTest },
    { name: "Network: My Public IP", key: "", action: () => { const s = ctx.getActive(); if (s) { s.sendInput("curl -s ifconfig.me && echo ''\r"); ctx.hiddenInput.focus(); } }},
    { name: "Network: Speed Test", key: "", action: () => { const s = ctx.getActive(); if (s) { s.sendInput("curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3\r"); ctx.hiddenInput.focus(); } }},
    { name: "Network: Active Connections", key: "", action: () => { const s = ctx.getActive(); if (s) { s.sendInput("netstat -an | grep ESTABLISHED | head -20\r"); ctx.hiddenInput.focus(); } }},
    { name: "Network: Route Table", key: "", action: () => { const s = ctx.getActive(); if (s) { s.sendInput("netstat -rn | head -20\r"); ctx.hiddenInput.focus(); } }},
  );
}
