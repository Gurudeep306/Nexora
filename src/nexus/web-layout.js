/*
 * The Nexus web layout: every subject is a radial sub-web (a cluster), and
 * the clusters are placed on one canvas automatically. Nothing here knows
 * any subject by name; drop a new outline into content/nexus/ and it gets a
 * place.
 *
 * Inside a cluster: the subject's zones become rings around its roots
 * (chapter 1 innermost), each in-zone row a ring of its own, and the nodes
 * sit as a radial tree, so prerequisite links run outward. A small wedge at
 * the top stays free for the ring labels.
 *
 * Between clusters: a deterministic force layout. Clusters of one domain
 * start around a shared anchor and are pulled together; clusters linked by
 * cross-subject prerequisites are pulled closer (more links, stronger
 * pull); nothing overlaps.
 */

const ROW_GAP = 84; // between rings of one zone
const ZONE_GAP = 34; // extra space between zones
const LABEL_W = 118; // arc length a node and its label need
const MIN_INNER = 76; // first ring radius when there are several roots
const EDGE_PAD = 92; // cluster radius beyond its outer ring
const CLUSTER_GAP = 260; // empty space between clusters

const round = (v) => Math.round(v);

/**
 * Radial layout of one subject — a radial tree. Each node's ring is its
 * (zone, row); its angle is the middle of a sector: roots share the circle
 * in proportion to how much of the tree hangs under them, and every node
 * splits its sector among its children the same way (a node's "parent" for
 * this purpose is its nearest prerequisite on an inner ring). The top of
 * the circle stays free for the ring labels.
 * Returns { r, rings: Map(level → number[]), nodes: Map(id → {x, y}) }.
 */
function clusterLayout(shape, layout) {
  const WEDGE = 0.5; // radians kept free at the top
  const zones = shape.zones.map((z) => z.level);
  const byId = new Map(shape.nodes.map((n) => [n.id, n]));
  // Ring index per node, in (zone, row) order.
  const ringKeys = [];
  for (const level of zones) {
    const rows = [...new Set(shape.nodes.filter((n) => n.zone === level).map((n) => layout.get(n.id)?.row ?? 0))].sort((a, b) => a - b);
    for (const row of rows) ringKeys.push(`${level}:${row}`);
  }
  const ringOf = new Map(shape.nodes.map((n) => [n.id, ringKeys.indexOf(`${n.zone}:${layout.get(n.id)?.row ?? 0}`)]));
  const lx = (id) => layout.get(id)?.x ?? 50;
  // Primary parent: the prerequisite on the nearest inner ring.
  const parent = new Map();
  for (const n of shape.nodes) {
    let best = null;
    for (const r of n.requires || []) {
      if (r.includes(":") || !byId.has(r)) continue;
      if (ringOf.get(r) >= ringOf.get(n.id)) continue;
      if (!best || ringOf.get(r) > ringOf.get(best) || (ringOf.get(r) === ringOf.get(best) && Math.abs(lx(r) - lx(n.id)) < Math.abs(lx(best) - lx(n.id)))) best = r;
    }
    parent.set(n.id, best);
  }
  const kids = new Map(shape.nodes.map((n) => [n.id, []]));
  for (const n of shape.nodes) if (parent.get(n.id)) kids.get(parent.get(n.id)).push(n.id);
  for (const list of kids.values()) list.sort((a, b) => lx(a) - lx(b));
  const weight = new Map();
  const w = (id) => {
    if (weight.has(id)) return weight.get(id);
    const v = Math.max(1, kids.get(id).reduce((s, c) => s + w(c), 0));
    weight.set(id, v);
    return v;
  };
  const angle = new Map();
  const assign = (ids, a0, a1) => {
    const total = ids.reduce((s, id) => s + w(id), 0) || 1;
    let a = a0;
    for (const id of ids) {
      const span = ((a1 - a0) * w(id)) / total;
      angle.set(id, a + span / 2);
      assign(kids.get(id), a, a + span);
      a += span;
    }
  };
  const roots = shape.nodes.filter((n) => !parent.get(n.id)).map((n) => n.id).sort((a, b) => ringOf.get(a) - ringOf.get(b) || lx(a) - lx(b));
  const start = -Math.PI / 2 + WEDGE / 2;
  assign(roots, start, start + 2 * Math.PI - WEDGE);

  // Radii: rings grow outward; each ring is wide enough for its labels.
  const rings = new Map(zones.map((l) => [l, []]));
  const nodes = new Map();
  let r = null;
  let prevZone = null;
  ringKeys.forEach((key, i) => {
    const [level] = key.split(":").map(Number);
    const ids = shape.nodes.filter((n) => ringOf.get(n.id) === i).map((n) => n.id).sort((a, b) => angle.get(a) - angle.get(b));
    const items = ids.map((id) => ({ id, a: angle.get(id) }));
    let need = 0;
    for (let j = 1; j < items.length; j++) need = Math.max(need, LABEL_W / Math.max(0.05, items[j].a - items[j - 1].a));
    const gap = prevZone === null ? 0 : level === prevZone ? ROW_GAP : ROW_GAP + ZONE_GAP;
    if (r === null) r = items.length === 1 ? 0 : Math.max(MIN_INNER, Math.min(need, MIN_INNER * 3));
    else r = Math.max(r + gap, Math.min(need, r + gap * 2.5));
    prevZone = level;
    rings.get(level).push(round(r));
    // Whatever still crowds is spread apart along the ring.
    if (r > 0 && items.length > 1) {
      const min = Math.min(LABEL_W / r, (2 * Math.PI - WEDGE) / items.length);
      for (let pass = 0; pass < 60; pass++) {
        let moved = false;
        for (let j = 1; j < items.length; j++) {
          const d = items[j].a - items[j - 1].a;
          if (d < min - 1e-6) {
            const push = (min - d) / 2;
            items[j - 1].a -= push;
            items[j].a += push;
            moved = true;
          }
        }
        if (!moved) break;
      }
    }
    for (const it of items) nodes.set(it.id, { x: round(Math.cos(it.a) * r), y: round(Math.sin(it.a) * r) });
  });
  for (const [l, list] of rings) if (!list.length) rings.delete(l);
  return { r: round((r || 0) + EDGE_PAD), rings, nodes };
}

/** Deterministic force placement of the clusters. Mutates and returns `items` ({id, domain, order, r, x, y}). */
function placeClusters(items, links) {
  const domains = [...new Set(items.map((c) => c.domain))].sort((a, b) => {
    const oa = Math.min(...items.filter((c) => c.domain === a).map((c) => c.order ?? 99));
    const ob = Math.min(...items.filter((c) => c.domain === b).map((c) => c.order ?? 99));
    return oa - ob || a.localeCompare(b);
  });
  const area = items.reduce((s, c) => s + Math.PI * (c.r + CLUSTER_GAP / 2) ** 2, 0);
  const worldR = Math.sqrt(area / Math.PI);
  const anchor = new Map(
    domains.map((d, i) => {
      const a = (i / domains.length) * 2 * Math.PI - Math.PI / 2;
      const rr = domains.length > 1 ? worldR * 0.62 : 0;
      return [d, { x: Math.cos(a) * rr, y: Math.sin(a) * rr }];
    }),
  );
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (const d of domains) {
    const group = items.filter((c) => c.domain === d).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.id.localeCompare(b.id));
    const avg = group.reduce((s, c) => s + c.r, 0) / group.length;
    group.forEach((c, i) => {
      const t = Math.sqrt(i) * avg * 1.4;
      c.x = anchor.get(d).x + Math.cos(i * golden) * t;
      c.y = anchor.get(d).y + Math.sin(i * golden) * t;
    });
  }
  const byId = new Map(items.map((c) => [c.id, c]));
  const springs = links.map((l) => ({ a: byId.get(l.a), b: byId.get(l.b), w: Math.min(6, l.count) })).filter((s) => s.a && s.b);
  const collide = (strength) => {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d < 1e-6) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const min = a.r + b.r + CLUSTER_GAP;
        if (d < min) {
          const push = ((min - d) / 2) * strength;
          const ux = dx / d;
          const uy = dy / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
  };
  for (let it = 0; it < 420; it++) {
    const cool = 1 - it / 420;
    for (const s of springs) {
      const dx = s.b.x - s.a.x;
      const dy = s.b.y - s.a.y;
      const d = Math.hypot(dx, dy) || 1;
      const target = s.a.r + s.b.r + CLUSTER_GAP;
      if (d > target) {
        const pull = (d - target) * 0.0035 * s.w * cool;
        s.a.x += (dx / d) * pull;
        s.a.y += (dy / d) * pull;
        s.b.x -= (dx / d) * pull;
        s.b.y -= (dy / d) * pull;
      }
    }
    for (const d of domains) {
      const group = items.filter((c) => c.domain === d);
      const cx = group.reduce((s, c) => s + c.x, 0) / group.length;
      const cy = group.reduce((s, c) => s + c.y, 0) / group.length;
      for (const c of group) {
        c.x += (cx - c.x) * 0.03 * cool;
        c.y += (cy - c.y) * 0.03 * cool;
      }
    }
    for (const c of items) {
      c.x -= c.x * 0.004 * cool;
      c.y -= c.y * 0.004 * cool;
    }
    collide(0.6);
  }
  for (let it = 0; it < 300; it++) collide(0.8);
  return items;
}

/**
 * The whole web for a registry: cluster centres and radii, ring radii, and
 * every node's absolute position. Static, so it is computed once.
 */
function webLayout(reg) {
  const clusters = new Map();
  const items = [];
  for (const [sid, s] of reg.subjects) {
    if (!s.shape) continue;
    const c = clusterLayout(s.shape, s.layout);
    clusters.set(sid, c);
    items.push({ id: sid, domain: s.meta.domain, order: s.meta.order, r: c.r, x: 0, y: 0 });
  }
  // Cross-subject link counts between clusters.
  const counts = new Map();
  for (const [sid, s] of reg.subjects) {
    if (!s.shape) continue;
    for (const n of s.shape.nodes) {
      for (const r of n.requires || []) {
        if (!r.includes(":")) continue;
        const other = r.split(":")[0];
        if (other === sid || !clusters.has(other)) continue;
        const key = [sid, other].sort().join("|");
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  const links = [...counts].map(([k, count]) => {
    const [a, b] = k.split("|");
    return { a, b, count };
  });
  placeClusters(items, links);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const it of items) {
    minX = Math.min(minX, it.x - it.r);
    minY = Math.min(minY, it.y - it.r);
    maxX = Math.max(maxX, it.x + it.r);
    maxY = Math.max(maxY, it.y + it.r);
  }
  const PAD = 300;
  for (const it of items) {
    const c = clusters.get(it.id);
    c.x = round(it.x - minX + PAD);
    c.y = round(it.y - minY + PAD);
    c.abs = new Map([...c.nodes].map(([id, p]) => [id, { x: p.x + c.x, y: p.y + c.y }]));
  }
  return {
    clusters,
    links,
    width: round(maxX - minX + PAD * 2),
    height: round(maxY - minY + PAD * 2),
  };
}

module.exports = { webLayout, clusterLayout, placeClusters };
