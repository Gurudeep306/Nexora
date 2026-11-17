// Realtime layer for Hive: a socket.io namespace only staff can join, presence
// (who is online and what they are looking at), and broadcast helpers.
let nsp = null;
const presence = new Map(); // username -> { sockets: Set, view: { projectId, taskId }, since }

function roster() {
  return [...presence.entries()].map(([username, p]) => ({ username, view: p.view || null, since: p.since }));
}

// In-process listeners (e.g. the Copilot reviewing finished sessions).
const bus = new (require("events").EventEmitter)();
bus.setMaxListeners(50);

function emit(event, payload) {
  nsp?.to("hive").emit(event, payload);
  try {
    bus.emit(event, payload);
  } catch {
    /* a listener failed: never break the broadcast */
  }
}
function emitTask(taskId, event, payload) {
  nsp?.to(`task:${taskId}`).emit(event, payload);
}
function emitConvo(convoId, event, payload) {
  nsp?.to(`convo:${convoId}`).emit(event, payload);
}

/**
 * attachHive(io, { authorize(socket) → Promise<username|null> })
 * authorize must check the session, bans/private mode and staff permission.
 */
function attachHive(io, { authorize, canSeeConvo }) {
  nsp = io.of("/hive");
  nsp.use(async (socket, next) => {
    try {
      const username = await authorize(socket);
      if (!username) return next(new Error("Not found"));
      socket.data.username = username;
      next();
    } catch {
      next(new Error("Not found"));
    }
  });
  nsp.on("connection", (socket) => {
    const me = socket.data.username;
    socket.join("hive");
    let p = presence.get(me);
    if (!p) presence.set(me, (p = { sockets: new Set(), view: null, since: Date.now() }));
    p.sockets.add(socket.id);
    emit("presence", roster());

    socket.on("view", (v) => {
      const view = v && typeof v === "object" ? { projectId: String(v.projectId || "") || null, taskId: String(v.taskId || "") || null } : null;
      p.view = view;
      for (const room of socket.rooms) if (room.startsWith("task:")) socket.leave(room);
      if (view?.taskId && view.taskId.length <= 64) socket.join(`task:${view.taskId}`);
      emit("presence", roster());
    });
    // Chats are private unless shared: check before joining their stream.
    socket.on("convo", async (v) => {
      for (const room of socket.rooms) if (room.startsWith("convo:")) socket.leave(room);
      const id = v && typeof v.id === "string" ? v.id.slice(0, 64) : null;
      if (!id) return;
      try {
        if (canSeeConvo && (await canSeeConvo(id, me))) socket.join(`convo:${id}`);
      } catch {}
    });
    socket.on("typing", (v) => {
      const projectId = v && typeof v.projectId === "string" ? v.projectId.slice(0, 64) : null;
      if (projectId) socket.to("hive").emit("typing", { username: me, projectId });
    });
    socket.on("disconnect", () => {
      p.sockets.delete(socket.id);
      if (!p.sockets.size) presence.delete(me);
      emit("presence", roster());
    });
  });
  return nsp;
}

/**
 * Drop every live Hive connection whose person may no longer use Hive (the
 * owner set Hive to "Owner only" in Admin → Site map, or a role changed).
 * stillAllowed(username) → Promise<boolean>.
 */
async function recheck(stillAllowed) {
  if (!nsp) return 0;
  let dropped = 0;
  for (const socket of nsp.sockets.values()) {
    let okay = false;
    try {
      okay = await stillAllowed(socket.data.username);
    } catch {}
    if (!okay) {
      socket.disconnect(true);
      dropped++;
    }
  }
  return dropped;
}

module.exports = { attachHive, emit, emitTask, emitConvo, roster, bus, recheck };
