import { VT } from './vt.js';
import { renderRow, rowToText, detectScript } from './renderer.js';

let counter = 0;

export class Session {
  constructor(bus, resolveDir) {
    this.id = ++counter;
    this.bus = bus;
    this._resolveDir = resolveDir;
    this.vt = new VT(30, 120);
    this.ws = null;
    this.renderedSerial = 0;
    this.prevHtml = [];
    this.screenDivs = [];
    this.alive = true;
    this._prevCurRow = -1;
    this._customName = null;
    this.cmdStart = null;
    this._destroyed = false;
    this._reconnectDelay = 1000;
    this._userScrolledUp = false;
    this._pendingScrollback = 0; // scrollback lines queued while user scrolled up

    // DOM
    this.wrapEl = document.createElement("div");
    this.wrapEl.className = "terminal-wrap";
    this.scrollbackEl = document.createElement("div");
    this.screenEl = document.createElement("div");
    this.screenEl.className = "screen-area";
    this.wrapEl.appendChild(this.scrollbackEl);
    this.wrapEl.appendChild(this.screenEl);

    // Track user scroll position
    this.wrapEl.addEventListener("scroll", () => {
      const gap = this.wrapEl.scrollHeight - this.wrapEl.scrollTop - this.wrapEl.clientHeight;
      this._userScrolledUp = gap > 80;
    });

    // Tab
    this.tabEl = document.createElement("div");
    this.tabEl.className = "tab";
    this.activityDot = document.createElement("span");
    this.activityDot.className = "activity-dot";
    this.tabLabel = document.createElement("span");
    this.tabLabel.textContent = "Terminal " + this.id;
    this.tabClose = document.createElement("button");
    this.tabClose.className = "close-tab";
    this.tabClose.textContent = "\u00d7";
    this.tabClose.title = "Close tab";
    this.tabEl.appendChild(this.activityDot);
    this.tabEl.appendChild(this.tabLabel);
    this.tabEl.appendChild(this.tabClose);

    this._initScreenDivs();
  }

  _initScreenDivs() {
    // Incremental: add/remove divs to match vt.rows instead of clearing all
    while (this.screenDivs.length > this.vt.rows) {
      this.screenDivs.pop().remove();
      this.prevHtml.pop();
    }
    while (this.screenDivs.length < this.vt.rows) {
      const div = document.createElement("div");
      div.className = "term-line";
      this.screenEl.appendChild(div);
      this.screenDivs.push(div);
      this.prevHtml.push("");
    }
  }

  connect(cwd) {
    // Send VT reports directly on WebSocket — NOT through sendInput,
    // because sendInput resets _userScrolledUp which kills scroll
    this.vt.onReport = (data) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN)
        this.ws.send(JSON.stringify({ type: "input", data }));
    };
    this.vt.onBell = () => this.bus.emit("bell", this);

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${proto}//${location.host}`);

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: "init", cwd: cwd || null, cols: this.vt.cols, rows: this.vt.rows }));
      this.alive = true;
      this._reconnectDelay = 1000;
      this.tabLabel.textContent = this._customName || "Terminal " + this.id;
      this.bus.emit("session:connected", this);
    };
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "output") {
        this.vt.write(msg.data);
        this.bus.emit("session:output", this);
      } else if (msg.type === "cwd") {
        this.cwd = msg.cwd;
      } else if (msg.type === "exit") {
        this.alive = false;
        this.tabLabel.textContent = (this._customName || "Terminal " + this.id) + " (exited)";
        this.bus.emit("session:exited", this);
      }
    };
    this.ws.onclose = () => {
      this.alive = false;
      this.tabLabel.textContent = (this._customName || "Terminal " + this.id) + " (reconnecting…)";
      this.bus.emit("session:closed", this);
      // Auto-reconnect with exponential backoff
      if (!this._destroyed) this._reconnect(cwd);
    };
    this.ws.onerror = () => this.bus.emit("session:error", this);
  }

  queryCwd() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "get-cwd" }));
    }
  }

  sendInput(data) {
    this.bus.emit("input:before", this, data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "input", data }));
    }
  }

  resize(rows, cols) {
    if (rows === this.vt.rows && cols === this.vt.cols) return; // no change
    this.vt.resize(rows, cols);
    this._initScreenDivs();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  }

  render() {
    const vt = this.vt;
    const wrap = this.wrapEl;
    const atBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 80;

    this.scrollbackEl.style.display = vt.isAlt ? "none" : "";

    if (vt._scrollbackCleared) {
      this.scrollbackEl.innerHTML = "";
      this.renderedSerial = 0;
      vt._scrollbackCleared = false;
    }

    // ── Scrollback rendering ──────────────────────────────────────
    const newSerial = vt.scrollbackSerial;
    if (newSerial > this.renderedSerial) {
      if (this._userScrolledUp) {
        // User is scrolled up reading — don't add DOM nodes that shift scroll position.
        // Just track how many lines we're deferring.
        this._pendingScrollback = newSerial - this.renderedSerial;
      } else {
        // At bottom — render all pending + new scrollback
        const totalNew = newSerial - this.renderedSerial;
        const start = Math.max(0, vt.scrollback.length - totalNew);
        for (let i = start; i < vt.scrollback.length; i++) {
          const div = document.createElement("div");
          div.className = "term-line";
          const text = rowToText(vt.scrollback[i]);
          div.dir = this._resolveDir(text);
          const script = detectScript(text);
          if (script) div.lang = script;
          div.innerHTML = renderRow(vt.scrollback[i]);
          this.scrollbackEl.appendChild(div);
        }
        this.renderedSerial = newSerial;
        this._pendingScrollback = 0;
        while (this.scrollbackEl.children.length > vt.maxScrollback) this.scrollbackEl.firstChild.remove();
      }
    }

    // When user scrolls back to bottom, flush deferred scrollback
    if (atBottom && this._pendingScrollback > 0) {
      const start = Math.max(0, vt.scrollback.length - this._pendingScrollback);
      for (let i = start; i < vt.scrollback.length; i++) {
        const div = document.createElement("div");
        div.className = "term-line";
        const text = rowToText(vt.scrollback[i]);
        div.dir = this._resolveDir(text);
        const script = detectScript(text);
        if (script) div.lang = script;
        div.innerHTML = renderRow(vt.scrollback[i]);
        this.scrollbackEl.appendChild(div);
      }
      this.renderedSerial = vt.scrollbackSerial;
      this._pendingScrollback = 0;
      while (this.scrollbackEl.children.length > vt.maxScrollback) this.scrollbackEl.firstChild.remove();
    }

    // ── Screen buffer rendering ───────────────────────────────────
    const curRow = vt.cursorVisible ? vt.curRow : -1;
    const curCol = vt.cursorVisible ? vt.curCol : -1;

    for (let i = 0; i < vt.rows; i++) {
      const cCol = (i === curRow) ? curCol : -1;
      const html = renderRow(vt.buffer[i], cCol);
      if (html !== this.prevHtml[i] || i === curRow || i === this._prevCurRow) {
        const text = rowToText(vt.buffer[i]);
        this.screenDivs[i].dir = this._resolveDir(text);
        const script = detectScript(text);
        if (script) this.screenDivs[i].lang = script;
        else this.screenDivs[i].removeAttribute("lang");
        this.screenDivs[i].innerHTML = html;
        this.prevHtml[i] = html;
      }
    }
    this._prevCurRow = curRow;

    if (!this._customName && vt.title && this.tabLabel.textContent !== vt.title) {
      this.tabLabel.textContent = vt.title;
    }

    // Auto-scroll only if user is at the bottom
    if (atBottom) {
      this._userScrolledUp = false;
      wrap.scrollTop = wrap.scrollHeight;
    }
    this.bus.emit("render:after", this);
  }

  _reconnect(cwd) {
    if (this._destroyed) return;
    setTimeout(() => {
      if (this._destroyed) return;
      this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, 10000);
      this.connect(cwd || this.cwd);
    }, this._reconnectDelay);
  }

  destroy() {
    this._destroyed = true;
    if (this.ws) try { this.ws.close(); } catch {}
    this.wrapEl.remove();
    this.tabEl.remove();
  }
}
