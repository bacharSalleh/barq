// Quick database connections — run queries against postgres/mysql/sqlite
export default function(ctx) {
  const KEY = "ttb-db-connections";
  const store = ctx.store;
  let connections = JSON.parse(store.getItem(KEY) || "[]");
  function save() { store.setItem(KEY, JSON.stringify(connections)); }

  function addConnection() {
    const type = prompt("Database type (postgres / mysql / sqlite):");
    if (!type) return;
    const name = prompt("Connection name:");
    if (!name) return;
    let connStr;
    if (type === "sqlite") {
      connStr = prompt("Database file path:");
    } else {
      const host = prompt("Host:", "localhost");
      const port = prompt("Port:", type === "postgres" ? "5432" : "3306");
      const db = prompt("Database name:");
      const user = prompt("Username:");
      connStr = `${user}@${host}:${port}/${db}`;
    }
    if (!connStr) return;
    connections.push({ name, type, connStr });
    save(); rebuild();
  }

  function connectDb(conn) {
    const s = ctx.createSession();
    const onConn = (session) => {
      if (session !== s) return;
      ctx.bus.off("session:connected", onConn);
      setTimeout(() => {
        let cmd;
        if (conn.type === "postgres") {
          const [userHost, db] = conn.connStr.split("/");
          const [user, hostPort] = userHost.split("@");
          const [host, port] = hostPort.split(":");
          cmd = `psql -h ${host} -p ${port} -U ${user} ${db}`;
        } else if (conn.type === "mysql") {
          const [userHost, db] = conn.connStr.split("/");
          const [user, hostPort] = userHost.split("@");
          const [host, port] = hostPort.split(":");
          cmd = `mysql -h ${host} -P ${port} -u ${user} -p ${db}`;
        } else if (conn.type === "sqlite") {
          cmd = `sqlite3 ${conn.connStr}`;
        }
        if (cmd) s.sendInput(cmd + "\r");
        s._customName = "🗄 " + conn.name;
        s.tabLabel.textContent = s._customName;
      }, 300);
    };
    ctx.bus.on("session:connected", onConn);
  }

  function runQuery() {
    const s = ctx.getActive();
    if (!s) return;
    const query = prompt("SQL query:");
    if (query) { s.sendInput(query + "\r"); ctx.hiddenInput.focus(); }
  }

  function removeConnection() {
    if (!connections.length) { if(ctx.toast) ctx.toast("No saved connections"); return; }
    const name = prompt("Remove which?\n" + connections.map(c => c.name).join(", "));
    if (!name) return;
    connections = connections.filter(c => c.name !== name);
    save(); rebuild();
  }

  function rebuild() {
    for (let i = ctx.commands.length - 1; i >= 0; i--) if (ctx.commands[i]._db) ctx.commands.splice(i, 1);
    connections.forEach(c => {
      ctx.commands.push({ name: `DB: Connect ${c.name} (${c.type})`, key: "", _db: true, action: () => connectDb(c) });
    });
  }

  ctx.commands.push(
    { name: "DB: Add Connection…", key: "", action: addConnection },
    { name: "DB: Remove Connection…", key: "", action: removeConnection },
    { name: "DB: Run Query…", key: "", action: runQuery },
  );
  rebuild();
}
