export class EventBus {
  constructor() { this._h = new Map(); }
  on(e, fn) { if (!this._h.has(e)) this._h.set(e, []); this._h.get(e).push(fn); }
  off(e, fn) { const a = this._h.get(e); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
  emit(e, ...args) { (this._h.get(e) || []).forEach(fn => fn(...args)); }
}
