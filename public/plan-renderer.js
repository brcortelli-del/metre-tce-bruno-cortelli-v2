/** Trois calques indépendants : fond raster, tracés validés, interaction.
 * Un pointermove ne peint que le dernier calque et ne déclenche aucune
 * sauvegarde. Les invalidations sont fusionnées en un requestAnimationFrame. */
import { workColor } from './professional-core.js';
export function createPlanRenderer({
  background,
  vectors,
  interaction,
  requestFrame = requestAnimationFrame,
  cancelFrame = cancelAnimationFrame,
}) {
  const canvases = [background, vectors, interaction],
    contexts = canvases.map((c) => c.getContext("2d"));
  let source = null,
    traces = [],
    calibration = [],
    selected = "",
    draft = [],
    cursor = null,
    hover = null,
    drag = null,
    kind = "length",
    draftColor = "#2563EB",
    frame = 0,
    dirty = 7,
    destroyed = false;
  let cache = new Map(),
    bounds = [];
  const stats = { background: 0, vectors: 0, interaction: 0 };
  const request = (mask) => {
    dirty |= mask;
    if (!frame && !destroyed) frame = requestFrame(paint);
  };
  function path(points, closed) {
    const p = new Path2D();
    points.forEach((v, i) => (i ? p.lineTo(v.x, v.y) : p.moveTo(v.x, v.y)));
    if (closed) p.closePath();
    return p;
  }
  function line(ctx, points, color, closed = false, label = "", cached) {
    if (!points.length) return;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, interaction.width / 750);
    const p = cached || path(points, closed);
    ctx.stroke(p);
    if (closed) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fill(p);
      ctx.restore();
    }
    for (const point of points) {
      ctx.beginPath();
      ctx.arc(
        point.x,
        point.y,
        Math.max(4, interaction.width / (ctx === contexts[2] ? 180 : 400)),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (label) {
      ctx.font = `600 ${Math.max(15, interaction.width / 90)}px Arial`;
      ctx.fillText(label, points[0].x + 8, points[0].y - 10);
    }
  }
  function paint() {
    frame = 0;
    if (destroyed) return;
    const flags = dirty;
    dirty = 0;
    if (flags & 1) {
      const ctx = contexts[0];
      ctx.clearRect(0, 0, background.width, background.height);
      ctx.fillStyle = "#fcfcf8";
      ctx.fillRect(0, 0, background.width, background.height);
      if (source)
        ctx.drawImage(source, 0, 0, background.width, background.height);
      background.dataset.paints = String(++stats.background);
    }
    if (flags & 2) {
      const ctx = contexts[1];
      ctx.clearRect(0, 0, vectors.width, vectors.height);
      for (const t of traces) {
        const c = cache.get(t.id);
        if (c)
          line(ctx, t.points, workColor(t), t.kind === "area", t.label, c.path);
      }
      line(ctx, calibration, "#b38b35", false, "Étalon");
      vectors.dataset.paints = String(++stats.vectors);
    }
    if (flags & 4) {
      const ctx = contexts[2];
      ctx.clearRect(0, 0, interaction.width, interaction.height);
      const id = drag?.id || hover?.id || selected,
        t = traces.find((t) => t.id === id);
      if (t)
        line(
          ctx,
          drag?.points || t.points,
          workColor(t),
          t.kind === "area",
          t.label,
          drag ? null : cache.get(t.id)?.path,
        );
      const pending = cursor && draft.length ? [...draft, cursor] : draft;
      line(ctx, pending, draftColor, kind === "area", "En cours");
      interaction.dataset.paints = String(++stats.interaction);
    }
  }
  function setTraces(next, scalePoints = []) {
    if (traces === next && calibration === scalePoints) return;
    traces = next;
    calibration = scalePoints;
    const nextCache = new Map();
    bounds = [];
    for (const trace of traces) {
      if (!trace.points?.length) continue;
      const old = cache.get(trace.id),
        entry =
          old && old.points === trace.points && old.kind === trace.kind
            ? old
            : {
                points: trace.points,
                kind: trace.kind,
                path: path(trace.points, trace.kind === "area"),
              };
      nextCache.set(trace.id, entry);
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (const p of trace.points) {
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y);
        y1 = Math.max(y1, p.y);
      }
      bounds.push({ id: trace.id, x0, y0, x1, y1, trace });
    }
    cache = nextCache;
    request(6);
  }
  function hit(point, tolerance = 10) {
    // Filtre AABB : on ne teste les segments que des tracés proches du curseur.
    for (let i = bounds.length - 1; i >= 0; i--) {
      const b = bounds[i];
      if (
        point.x < b.x0 - tolerance ||
        point.x > b.x1 + tolerance ||
        point.y < b.y0 - tolerance ||
        point.y > b.y1 + tolerance
      )
        continue;
      for (let j = 0; j < b.trace.points.length; j++) {
        const p = b.trace.points[j];
        if (Math.hypot(point.x - p.x, point.y - p.y) <= tolerance)
          return { id: b.id, vertex: j };
      }
      const pts = b.trace.points,
        n = b.trace.kind === "area" ? pts.length : pts.length - 1;
      for (let j = 0; j < n; j++) {
        const a = pts[j],
          c = pts[(j + 1) % pts.length],
          dx = c.x - a.x,
          dy = c.y - a.y,
          f = Math.max(
            0,
            Math.min(
              1,
              ((point.x - a.x) * dx + (point.y - a.y) * dy) /
                (dx * dx + dy * dy || 1),
            ),
          );
        if (
          Math.hypot(point.x - a.x - f * dx, point.y - a.y - f * dy) <=
          tolerance
        )
          return { id: b.id };
      }
    }
    return null;
  }
  return {
    setBackground(
      image,
      width = image?.width || 1200,
      height = image?.height || 750,
    ) {
      if (
        source === image &&
        background.width === width &&
        background.height === height
      )
        return;
      source = image;
      for (const canvas of canvases) {
        canvas.width = width;
        canvas.height = height;
      }
      request(7);
    },
    setTraces,
    hit,
    setInteraction(value = {}) {
      let changed = false;
      if("draftColor" in value && draftColor!==value.draftColor){draftColor=value.draftColor;changed=true;}
      if ("selected" in value && selected !== value.selected) {
        selected = value.selected;
        changed = true;
      }
      if ("draft" in value && draft !== value.draft) {
        draft = value.draft;
        changed = true;
      }
      if (
        "cursor" in value &&
        (cursor?.x !== value.cursor?.x || cursor?.y !== value.cursor?.y)
      ) {
        cursor = value.cursor;
        changed = true;
      }
      if (
        "hover" in value &&
        (hover?.id !== value.hover?.id || hover?.vertex !== value.hover?.vertex)
      ) {
        hover = value.hover;
        changed = true;
      }
      if ("drag" in value && drag !== value.drag) {
        drag = value.drag;
        changed = true;
      }
      if ("kind" in value && kind !== value.kind) {
        kind = value.kind;
        changed = true;
      }
      if (changed) request(4);
    },
    stats: () => ({ ...stats }),
    flush: () => {
      if (frame) cancelFrame(frame);
      paint();
    },
    destroy() {
      destroyed = true;
      cancelFrame(frame);
      cache.clear();
      bounds = [];
      source = null;
    },
  };
}

export function orthogonalPoint(origin, point, locked) {
  if (!origin || !locked) return point;
  return Math.abs(point.x - origin.x) >= Math.abs(point.y - origin.y)
    ? { x: point.x, y: origin.y }
    : { x: origin.x, y: point.y };
}
