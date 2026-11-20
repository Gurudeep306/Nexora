// Who is in each Live room right now (one server, so memory is enough).
//   rooms: code → { id, peers: Map<peerId, Peer>, waiting: Map<waitId, Wait>,
//                   transport: 'sfu' | 'mesh', spotlight, cohosts: Set,
//                   admitted: Set (let in from the waiting room; they may come back) }
// A Peer is one device in the room: a person's computer or phone ("main") or
// the tablet they joined by QR ("tablet").
const rooms = new Map();

function roomState(code, id, transport) {
  let s = rooms.get(code);
  if (!s) {
    s = { id, code, peers: new Map(), waiting: new Map(), transport, spotlight: null, cohosts: new Set(), admitted: new Set(), startedAt: Date.now() };
    rooms.set(code, s);
  }
  return s;
}

const peerView = (p) => ({
  peerId: p.peerId,
  username: p.username,
  name: p.name,
  avatar: p.avatar,
  avatarUrl: p.avatarUrl,
  device: p.device,
  role: p.role,
  mic: p.mic,
  cam: p.cam,
  screens: p.screens,
  hand: p.hand,
  recording: !!p.recording,
  pubs: p.pubs || [],
  cf: p.cf || null,
  joinedAt: p.joinedAt,
});

/** People (not devices) in a room right now. */
function headcount(code) {
  const s = rooms.get(code);
  if (!s) return 0;
  return new Set([...s.peers.values()].map((p) => p.username)).size;
}

function dropIfEmpty(code) {
  const s = rooms.get(code);
  if (s && s.peers.size === 0 && s.waiting.size === 0) rooms.delete(code);
}

module.exports = { rooms, roomState, peerView, headcount, dropIfEmpty };
