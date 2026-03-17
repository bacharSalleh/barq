// Record terminal sessions and replay them — asciicast v2 format
export default function(ctx) {
  let recording = null; // { session, startTime, events }
  let isRecording = false;

  function startRecording() {
    const s = ctx.getActive();
    if (!s) return;
    recording = {
      session: s,
      startTime: Date.now(),
      cols: s.vt.cols,
      rows: s.vt.rows,
      events: [],
    };
    isRecording = true;
    if (ctx.toast) ctx.toast("⏺ Recording started");

    // Capture output by hooking into session:output
    recording._handler = (session) => {
      if (session !== recording.session || !isRecording) return;
      // We can't capture raw data from the event, so we snapshot screen state
      // Instead, hook into the VT write
    };
  }

  // Patch VT.write to capture data during recording
  const origWrite = ctx.sessions.length ? null : null;

  ctx.bus.on("session:connected", (session) => {
    const origW = session.vt.write.bind(session.vt);
    session.vt.write = function(data) {
      if (isRecording && recording && recording.session === session) {
        const elapsed = (Date.now() - recording.startTime) / 1000;
        recording.events.push([elapsed, "o", data]);
      }
      origW(data);
    };
  });

  function stopRecording() {
    if (!isRecording || !recording) return;
    isRecording = false;
    if (ctx.toast) ctx.toast("⏹ Recording stopped — " + recording.events.length + " events");
  }

  function saveRecording() {
    if (!recording || recording.events.length === 0) {
      if (ctx.toast) ctx.toast("No recording to save");
      return;
    }

    // Asciicast v2 format
    const header = JSON.stringify({
      version: 2,
      width: recording.cols,
      height: recording.rows,
      timestamp: Math.floor(recording.startTime / 1000),
      title: "barq recording",
      env: { TERM: "xterm-256color", SHELL: "/bin/zsh" },
    });

    const lines = [header];
    recording.events.forEach(([time, type, data]) => {
      lines.push(JSON.stringify([time, type, data]));
    });

    const blob = new Blob([lines.join("\n")], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "recording-" + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + ".cast";
    a.click();
    URL.revokeObjectURL(a.href);
    if (ctx.toast) ctx.toast("Recording saved as .cast file");
  }

  function replayRecording() {
    if (!ctx.modal) return;
    ctx.modal("Replay Recording", [
      { name: "file", label: "Paste asciicast JSON or drag a .cast file", type: "textarea", rows: 5, placeholder: '{"version":2,...}\n[0.1,"o","data"]...' },
    ], (vals) => {
      if (!vals.file) return;
      try {
        const lines = vals.file.trim().split("\n");
        const header = JSON.parse(lines[0]);
        const events = lines.slice(1).map(l => JSON.parse(l));

        // Create a new tab for replay
        const s = ctx.createSession();
        const onConn = (session) => {
          if (session !== s) return;
          ctx.bus.off("session:connected", onConn);

          s._customName = "▶ Replay";
          s.tabLabel.textContent = s._customName;

          // Replay events with timing
          let i = 0;
          function playNext() {
            if (i >= events.length) {
              if (ctx.toast) ctx.toast("Replay finished");
              return;
            }
            const [time, type, data] = events[i];
            const nextTime = i + 1 < events.length ? events[i + 1][0] : time;
            const delay = Math.min((nextTime - time) * 1000, 2000); // cap at 2s

            if (type === "o") {
              s.vt.write(data);
              ctx.scheduleRender();
            }
            i++;
            setTimeout(playNext, delay);
          }
          setTimeout(playNext, 500);
        };
        ctx.bus.on("session:connected", onConn);
      } catch (e) {
        if (ctx.toast) ctx.toast("Invalid recording format: " + e.message);
      }
    });
  }

  ctx.commands.push(
    { name: "⏺ Record: Start", key: "", action: startRecording },
    { name: "⏹ Record: Stop", key: "", action: stopRecording },
    { name: "💾 Record: Save to File", key: "", action: saveRecording },
    { name: "▶ Record: Replay from File…", key: "", action: replayRecording },
  );
}
