export default function(ctx) {
  const GROUP_COLORS = {
    red: "#e06c75", green: "#98c379", blue: "#61afef",
    yellow: "#e5c07b", purple: "#c678dd", cyan: "#56b6c2",
    orange: "#d19a66", pink: "#ff79c6",
  };
  function setGroup(session, groupName) {
    if (groupName) {
      session.tabEl.dataset.group = groupName;
      session.tabEl.style.setProperty("--tab-group-color", GROUP_COLORS[groupName] || groupName);
      session._group = groupName;
    } else {
      delete session.tabEl.dataset.group;
      session.tabEl.style.removeProperty("--tab-group-color");
      session._group = null;
    }
    if (ctx.saveTabState) ctx.saveTabState();
  }

  function assignGroup() {
    const s = ctx.getActive();
    if (!s) return;
    const colors = Object.keys(GROUP_COLORS);
    const name = prompt("Group color:\n" + colors.join(", ") + "\n\n(empty to remove)");
    if (name === null) return;
    setGroup(s, name.trim() || null);
  }

  function switchToNextInGroup() {
    const s = ctx.getActive();
    if (!s?._group) return;
    const group = ctx.sessions.filter(x => x._group === s._group);
    const idx = group.indexOf(s);
    if (group.length > 1) ctx.switchTo(group[(idx + 1) % group.length]);
  }

  function closeGroup() {
    const s = ctx.getActive();
    if (!s?._group) return;
    const group = ctx.sessions.filter(x => x._group === s._group);
    if (!confirm(`Close ${group.length} tabs in group "${s._group}"?`)) return;
    group.forEach(x => {
      const idx = ctx.sessions.indexOf(x);
      if (idx >= 0) { ctx.bus.emit("session:destroying", x); ctx.sessions.splice(idx, 1); x.destroy(); }
    });
    if (ctx.sessions.length === 0) ctx.createSession();
    else ctx.switchTo(ctx.sessions[0]);
  }

  // Restore groups from tab persistence
  ctx.bus.on("session:activated", () => {
    // Groups are stored in _group property, restored by tab-persistence via _customName
    // We just need to re-apply the visual style
    ctx.sessions.forEach(s => {
      if (s._group) setGroup(s, s._group);
    });
  });

  ctx.commands.push(
    { name: "Tab Group: Assign Color…", key: "", action: assignGroup },
    { name: "Tab Group: Next in Group", key: "", action: switchToNextInGroup },
    { name: "Tab Group: Close All in Group", key: "", action: closeGroup },
    { name: "Tab Group: Remove from Group", key: "", action: () => { const s = ctx.getActive(); if (s) setGroup(s, null); } },
  );
}
