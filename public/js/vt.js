export class VT {
  constructor(rows = 30, cols = 120) {
    this.rows = rows;
    this.cols = cols;

    // Screen buffer & scrollback
    this.buffer = this._makeBuffer();
    this.scrollback = [];
    this.scrollbackSerial = 0;
    this.maxScrollback = 5000;
    this._scrollbackCleared = false;

    // Cursor
    this.curRow = 0;
    this.curCol = 0;
    this.savedCur = null;
    this.cursorVisible = true;

    // Style
    this.style = this._ds();

    // Scroll region (DECSTBM)
    this.scrollRegionTop = 0;
    this.scrollRegionBottom = rows - 1;
    this.originMode = false; // DECOM

    // Alternate screen buffer
    this.altBuffer = null;
    this.altCurRow = 0;
    this.altCurCol = 0;
    this.isAlt = false;

    // Parser state: 0=ground 1=ESC 2=CSI 3=OSC 4=OSC-ST 5=charset
    this.state = 0;
    this.escBuf = "";

    // Callback for device status report responses
    this.onReport = null;
  }

  // --- Factories ---
  _ds() { return { bold:false, dim:false, italic:false, ul:false, strike:false, reverse:false, fg:null, bg:null }; }
  _bc() { return { ch:" ", s:this._ds() }; }
  _br() { return Array.from({length:this.cols}, ()=>this._bc()); }
  _makeBuffer() { return Array.from({length:this.rows}, ()=>this._br()); }

  // --- Resize ---
  resize(rows, cols) {
    if (rows === this.rows && cols === this.cols) return;
    const oR = this.rows, oC = this.cols;
    this.rows = rows; this.cols = cols;
    this.scrollRegionTop = 0;
    this.scrollRegionBottom = rows - 1;
    this.buffer = this._resizeBuf(this.buffer, oR, oC, rows, cols);
    if (this.altBuffer) this.altBuffer = this._resizeBuf(this.altBuffer, oR, oC, rows, cols);
    this.curRow = Math.min(this.curRow, rows - 1);
    this.curCol = Math.min(this.curCol, cols - 1);
  }
  _resizeBuf(buf, oR, oC, nR, nC) {
    const nb = [];
    for (let r = 0; r < nR; r++) {
      if (r < buf.length) {
        const row = buf[r];
        if (nC > oC) for (let c = oC; c < nC; c++) row.push(this._bc());
        else row.length = nC;
        nb.push(row);
      } else nb.push(this._br());
    }
    return nb;
  }

  // --- Write data ---
  write(data) { for (const ch of data) this._proc(ch); }

  _proc(ch) {
    const code = ch.codePointAt(0);
    switch (this.state) {
      case 0: // ground
        if      (code === 0x1b) { this.state = 1; this.escBuf = ""; }
        else if (code === 0x0a) this._lf();
        else if (code === 0x0d) this.curCol = 0;
        else if (code === 0x08) { if (this.curCol > 0) this.curCol--; }
        else if (code === 0x09) this.curCol = Math.min((Math.floor(this.curCol/8)+1)*8, this.cols-1);
        else if (code === 0x07) { if (this.onBell) this.onBell(); }
        else if (code >= 0x20) this._put(ch);
        break;
      case 1: // ESC
        if      (ch === "[") { this.state = 2; this.escBuf = ""; }
        else if (ch === "]") { this.state = 3; this.escBuf = ""; }
        else if (ch === "(" || ch === ")") this.state = 5;
        else if (ch === "7") { this.savedCur = {r:this.curRow,c:this.curCol,s:{...this.style}}; this.state=0; }
        else if (ch === "8") { if (this.savedCur) {this.curRow=this.savedCur.r;this.curCol=this.savedCur.c;this.style={...this.savedCur.s};} this.state=0; }
        else if (ch === "M") { if (this.curRow===this.scrollRegionTop) this._regionScrollDown(1); else if (this.curRow>0) this.curRow--; this.state=0; }
        else if (ch === "=" || ch === ">") this.state = 0;
        else this.state = 0;
        break;
      case 2: // CSI
        if (code >= 0x40 && code <= 0x7e) { this._csi(this.escBuf, ch); this.state = 0; }
        else this.escBuf += ch;
        break;
      case 3: // OSC
        if (code === 0x07) {
          // Parse OSC: code;payload
          const semi = this.escBuf.indexOf(";");
          if (semi !== -1) {
            const oscCode = parseInt(this.escBuf.slice(0, semi));
            const payload = this.escBuf.slice(semi + 1);
            if (oscCode === 0 || oscCode === 2) this.title = payload; // window title
          }
          this.state = 0;
        }
        else if (code === 0x1b) this.state = 4;
        else this.escBuf += ch;
        break;
      case 4: this.state = 0; break; // OSC ST
      case 5: this.state = 0; break; // charset
    }
  }

  // --- Character output ---
  _put(ch) {
    if (this.curCol >= this.cols) { this.curCol = 0; this._lf(); }
    this.buffer[this.curRow][this.curCol] = { ch, s:{...this.style} };
    this.curCol++;
  }

  // --- Line feed & scrolling ---
  _lf() {
    if (this.curRow === this.scrollRegionBottom) this._regionScrollUp(1);
    else if (this.curRow < this.rows - 1) this.curRow++;
  }
  _regionScrollUp(n) {
    for (let i = 0; i < n; i++) {
      const row = this.buffer.splice(this.scrollRegionTop, 1)[0];
      // Always save to scrollback (not just when scrollRegionTop===0)
      // Claude sets scroll region starting at row 1+ for its header,
      // but we still want to preserve content that scrolls off.
      if (!this.isAlt) {
        this.scrollback.push(row); this.scrollbackSerial++;
        if (this.scrollback.length > this.maxScrollback) this.scrollback.shift();
      }
      this.buffer.splice(this.scrollRegionBottom, 0, this._br());
    }
  }
  _regionScrollDown(n) {
    for (let i = 0; i < n; i++) {
      this.buffer.splice(this.scrollRegionBottom, 1);
      this.buffer.splice(this.scrollRegionTop, 0, this._br());
    }
  }

  // --- CSI command dispatch ---
  _csi(params, cmd) {
    const priv = params.startsWith("?");
    const clean = params.replace(/^[?>=!]/, "");
    const args = clean ? clean.split(";").map(n => parseInt(n)||0) : [];
    const a0 = args[0] || 0;

    switch (cmd) {
      // Cursor movement
      case "A": this.curRow = Math.max(0, this.curRow-(a0||1)); break;
      case "B": this.curRow = Math.min(this.rows-1, this.curRow+(a0||1)); break;
      case "C": this.curCol = Math.min(this.cols-1, this.curCol+(a0||1)); break;
      case "D": this.curCol = Math.max(0, this.curCol-(a0||1)); break;
      case "E": this.curRow = Math.min(this.rows-1, this.curRow+(a0||1)); this.curCol=0; break;
      case "F": this.curRow = Math.max(0, this.curRow-(a0||1)); this.curCol=0; break;
      case "G": this.curCol = Math.min(this.cols-1, Math.max(0,(a0||1)-1)); break;
      case "d": // VPA — vertical position absolute
        if (this.originMode) this.curRow = Math.min(this.scrollRegionBottom, Math.max(this.scrollRegionTop, this.scrollRegionTop+(a0||1)-1));
        else this.curRow = Math.min(this.rows-1, Math.max(0,(a0||1)-1));
        break;
      case "H": case "f": // CUP — cursor position
        if (this.originMode) this.curRow = Math.min(this.scrollRegionBottom, Math.max(this.scrollRegionTop, this.scrollRegionTop+(args[0]||1)-1));
        else this.curRow = Math.min(this.rows-1, Math.max(0,(args[0]||1)-1));
        this.curCol = Math.min(this.cols-1, Math.max(0,(args[1]||1)-1));
        break;
      case "s": this.savedCur = {r:this.curRow,c:this.curCol,s:{...this.style}}; break;
      case "u": if (this.savedCur) {this.curRow=this.savedCur.r;this.curCol=this.savedCur.c;this.style={...this.savedCur.s};} break;

      // Erase
      case "J": this._eraseDisplay(a0); break;
      case "K": this._eraseLine(a0); break;
      case "X": { const row=this.buffer[this.curRow]; for (let i=0;i<(a0||1)&&this.curCol+i<this.cols;i++) row[this.curCol+i]=this._bc(); } break;

      // Insert / delete
      case "L": for (let i=0;i<(a0||1);i++){this.buffer.splice(this.scrollRegionBottom,1);this.buffer.splice(this.curRow,0,this._br());} break;
      case "M": for (let i=0;i<(a0||1);i++){this.buffer.splice(this.curRow,1);this.buffer.splice(this.scrollRegionBottom,0,this._br());} break;
      case "P": { const row=this.buffer[this.curRow]; row.splice(this.curCol,a0||1); for(let i=0;i<(a0||1);i++) row.push(this._bc()); } break;
      case "@": { const row=this.buffer[this.curRow]; for(let i=0;i<(a0||1);i++) row.splice(this.curCol,0,this._bc()); row.length=this.cols; } break;

      // Scroll
      case "S": this._regionScrollUp(a0||1); break;
      case "T": this._regionScrollDown(a0||1); break;

      // Scroll region
      case "r":
        this.scrollRegionTop = (args[0]||1)-1;
        this.scrollRegionBottom = (args[1]||this.rows)-1;
        this.curRow = this.originMode ? this.scrollRegionTop : 0;
        this.curCol = 0;
        break;

      // SGR
      case "m": this._sgr(args.length ? args : [0]); break;

      // Private modes
      case "h": if (priv) this._privMode(args, true); break;
      case "l": if (priv) this._privMode(args, false); break;

      // Device status report
      case "n":
        if (a0 === 6 && this.onReport) {
          const rr = this.originMode ? (this.curRow-this.scrollRegionTop+1) : (this.curRow+1);
          this.onReport(`\x1b[${rr};${this.curCol+1}R`);
        } else if (a0 === 5 && this.onReport) {
          this.onReport("\x1b[0n");
        }
        break;
    }
  }

  // --- Private modes ---
  _privMode(args, on) {
    for (const a of args) {
      if (a===1049||a===47||a===1047) { on ? this._enterAlt() : this._leaveAlt(); }
      if (a===6)  this.originMode = on;
      if (a===25) this.cursorVisible = on;
      if (a===2004) this.bracketedPaste = on;
    }
  }

  // --- Alternate screen ---
  _enterAlt() {
    if (this.isAlt) return;
    this.altBuffer=this.buffer; this.altCurRow=this.curRow; this.altCurCol=this.curCol;
    this._altSRT=this.scrollRegionTop; this._altSRB=this.scrollRegionBottom;
    this.buffer=this._makeBuffer(); this.curRow=0; this.curCol=0;
    this.scrollRegionTop=0; this.scrollRegionBottom=this.rows-1;
    this.isAlt=true;
  }
  _leaveAlt() {
    if (!this.isAlt) return;
    this.buffer=this.altBuffer; this.curRow=this.altCurRow; this.curCol=this.altCurCol;
    this.scrollRegionTop=this._altSRT||0; this.scrollRegionBottom=this._altSRB||(this.rows-1);
    this.altBuffer=null; this.isAlt=false;
  }

  // --- Erase ---
  _eraseDisplay(mode) {
    if (mode===0) { this._eraseLine(0); for(let r=this.curRow+1;r<this.rows;r++) this.buffer[r]=this._br(); }
    else if (mode===1) { for(let r=0;r<this.curRow;r++) this.buffer[r]=this._br(); this._eraseLine(1); }
    else if (mode===2||mode===3) {
      // Just clear the screen buffer. Scrollback is preserved.
      // Content enters scrollback only via _regionScrollUp (natural scroll).
      // Don't push screen to scrollback here — Claude sends CSI 2J on every
      // redraw, which would dump half-rendered frames into scrollback.
      for(let r=0;r<this.rows;r++) this.buffer[r]=this._br();
    }
  }
  _eraseLine(mode) {
    const row=this.buffer[this.curRow];
    if (mode===0) for(let c=this.curCol;c<this.cols;c++) row[c]=this._bc();
    else if (mode===1) for(let c=0;c<=this.curCol;c++) row[c]=this._bc();
    else if (mode===2) for(let c=0;c<this.cols;c++) row[c]=this._bc();
  }

  // --- SGR ---
  _sgr(codes) {
    for (let i=0; i<codes.length; i++) {
      const c = codes[i];
      if      (c===0)  this.style = this._ds();
      else if (c===1)  this.style.bold = true;
      else if (c===2)  this.style.dim = true;
      else if (c===3)  this.style.italic = true;
      else if (c===4)  this.style.ul = true;
      else if (c===7)  this.style.reverse = true;
      else if (c===9)  this.style.strike = true;
      else if (c===22) { this.style.bold=false; this.style.dim=false; }
      else if (c===23) this.style.italic = false;
      else if (c===24) this.style.ul = false;
      else if (c===27) this.style.reverse = false;
      else if (c===29) this.style.strike = false;
      else if (c>=30 && c<=37) this.style.fg = c-30;
      else if (c===38) {
        if (codes[i+1]===5 && codes[i+2]!==undefined) { this.style.fg=codes[i+2]; i+=2; }
        else if (codes[i+1]===2 && codes.length>i+4) { this.style.fg=[codes[i+2],codes[i+3],codes[i+4]]; i+=4; }
      }
      else if (c===39) this.style.fg = null;
      else if (c>=40 && c<=47) this.style.bg = c-40;
      else if (c===48) {
        if (codes[i+1]===5 && codes[i+2]!==undefined) { this.style.bg=codes[i+2]; i+=2; }
        else if (codes[i+1]===2 && codes.length>i+4) { this.style.bg=[codes[i+2],codes[i+3],codes[i+4]]; i+=4; }
      }
      else if (c===49) this.style.bg = null;
      else if (c>=90  && c<=97)  this.style.fg = c-82;
      else if (c>=100 && c<=107) this.style.bg = c-92;
    }
  }
}