/** Index de hauteurs pour trouver une ligne par défilement en O(log N).
 * Les lignes gardent une hauteur naturelle : aucune troncature des justificatifs. */
export class HeightIndex {
  constructor(values = []) {
    this.values = values.slice();
    this.tree = Array(values.length + 1).fill(0);
    values.forEach((v, i) => this.add(i, v));
  }
  add(index, delta) {
    for (let i = index + 1; i < this.tree.length; i += i & -i)
      this.tree[i] += delta;
  }
  set(index, value) {
    const delta = value - this.values[index];
    if (!delta) return;
    this.values[index] = value;
    this.add(index, delta);
  }
  prefix(count) {
    let sum = 0;
    for (let i = count; i > 0; i -= i & -i) sum += this.tree[i];
    return sum;
  }
  atOffset(offset) {
    let lo = 0,
      hi = this.values.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.prefix(mid + 1) <= offset) lo = mid + 1;
      else hi = mid;
    }
    return Math.min(lo, Math.max(0, this.values.length - 1));
  }
}

/** Virtualisation des deux tableaux : seuls l'écran et une marge de lignes
 * existent dans le DOM. Une cellule patchée ne remonte pas le tbody complet. */
export function createVirtualTable({
  container,
  body,
  columns,
  renderRow,
  updateRow,
  estimate = 100,
  overscan = 6,
}) {
  let items = [],
    heights = new Map(),
    index = new HeightIndex(),
    mounted = new Map(),
    positions = new Map(),
    frame = 0,
    printing = false,
    destroyed = false;
  const spacer = () => {
    const tr = document.createElement("tr"),
      td = document.createElement("td");
    tr.setAttribute("aria-hidden", "true");
    tr.className = "virtual-spacer";
    td.colSpan = columns;
    tr.append(td);
    return tr;
  };
  const before = spacer(),
    after = spacer();
  body.replaceChildren(before, after);
  const schedule = () => {
    if (!frame && !destroyed)
      frame = requestAnimationFrame(() => {
        frame = 0;
        draw();
      });
  };
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver((entries) => {
          let changed = false,
            shift = 0;
          const top = container.scrollTop;
          for (const entry of entries) {
            const id = entry.target.dataset.rowId,
              i = positions.get(id);
            if (i === undefined) continue;
            const height =
              entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height;
            if (
              height > 0 &&
              Math.abs((heights.get(id) || estimate) - height) > 0.5
            ) {
              const delta = height - index.values[i];
              if (index.prefix(i + 1) < top) shift += delta;
              heights.set(id, height);
              index.set(i, height);
              changed = true;
            }
          }
          if (shift) container.scrollTop += shift;
          if (changed) schedule();
        });
  function draw() {
    if (
      destroyed ||
      !container.isConnected ||
      (!container.clientHeight && !printing)
    )
      return;
    const header = body.closest("table")?.tHead?.offsetHeight || 0;
    const top = Math.max(0, container.scrollTop - header),
      visible = Math.max(250, container.clientHeight);
    const start = printing ? 0 : Math.max(0, index.atOffset(top) - overscan);
    const end = printing
      ? items.length
      : Math.min(items.length, index.atOffset(top + visible) + overscan + 2);
    const retained = new Set(items.slice(start, end).map((item) => item.id));
    for (const [id, entry] of mounted)
      if (!retained.has(id)) {
        if (entry.node.contains(document.activeElement))
          document.activeElement.blur();
        observer?.unobserve(entry.node);
        entry.node.remove();
        mounted.delete(id);
      }
    let previous = before;
    for (let i = start; i < end; i++) {
      const row = items[i];
      let entry = mounted.get(row.id);
      if (!entry) {
        const node = renderRow(row, i);
        node.dataset.rowId = row.id;
        entry = { node, row, position: i };
        mounted.set(row.id, entry);
        observer?.observe(node);
      } else if (entry.row !== row || entry.position !== i) {
        updateRow(entry.node, row, entry.row, i);
        entry.row = row;
        entry.position = i;
      }
      if (previous.nextSibling !== entry.node)
        body.insertBefore(entry.node, previous.nextSibling);
      previous = entry.node;
    }
    if (previous.nextSibling !== after) body.append(after);
    before.firstChild.style.height =
      (printing ? 0 : index.prefix(start)) + "px";
    after.firstChild.style.height =
      (printing ? 0 : index.prefix(items.length) - index.prefix(end)) + "px";
    body.dataset.mountedRows = String(mounted.size);
    body.dataset.totalRows = String(items.length);
  }
  function setItems(next) {
    items = next;
    positions = new Map(items.map((r, i) => [r.id, i]));
    index = new HeightIndex(
      items.map((row) => heights.get(row.id) || estimate),
    );
    schedule();
  }
  function ensureVisible(position) {
    position = Math.min(items.length - 1, Math.max(0, position));
    if (position < 0) return;
    const y = index.prefix(position),
      bottom = index.prefix(position + 1),
      head = body.closest("table")?.tHead?.offsetHeight || 0;
    if (y < container.scrollTop) container.scrollTop = y;
    else if (bottom + head > container.scrollTop + container.clientHeight)
      container.scrollTop = bottom + head - container.clientHeight;
    draw();
    return mounted.get(items[position].id)?.node;
  }
  container.addEventListener("scroll", schedule, { passive: true });
  const resize =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  resize?.observe(container);
  return {
    setItems,
    refresh: schedule,
    renderNow: draw,
    ensureVisible,
    items: () => items,
    forEachMounted: (fn) => {
      for (const entry of mounted.values()) fn(entry.node, entry.row);
    },
    print: (enabled) => {
      printing = enabled;
      draw();
    },
    destroy: () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resize?.disconnect();
      container.removeEventListener("scroll", schedule);
      mounted.clear();
    },
  };
}

/** Navigation tableur sans intercepter le déplacement du caret dans une formule. */
export function installGridKeyboard(body, virtual) {
  const editable = (row) => [
    ...row.querySelectorAll("input:not([disabled]):not([readonly])"),
  ];
  body.addEventListener("keydown", (event) => {
    const input = event.target.closest("input[data-minute-field]");
    if (!input) return;
    const tr = input.closest("tr[data-row-id]"),
      rows = virtual.items(),
      position = rows.findIndex((r) => r.id === tr.dataset.rowId),
      cells = editable(tr),
      column = cells.indexOf(input);
    let row = position,
      col = column,
      handled = true;
    if (event.key === "Enter" || event.key === "Tab") {
      col += event.shiftKey ? -1 : 1;
      if (col < 0) {
        row--;
        col = -1;
      } else if (col >= cells.length) {
        row++;
        col = 0;
      }
      if (row < 0 || row >= rows.length) return; // Tab permet aussi de quitter le tableau.
    } else if (
      (event.key === "Home" || event.key === "End") &&
      (event.ctrlKey || event.metaKey)
    ) {
      row = event.key === "Home" ? 0 : rows.length - 1;
      col = event.key === "Home" ? 0 : -1;
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown")
      row += event.key === "ArrowUp" ? -1 : 1;
    else if (event.key === "ArrowLeft" && input.selectionStart === 0) col--;
    else if (
      event.key === "ArrowRight" &&
      input.selectionEnd === input.value.length
    )
      col++;
    else handled = false;
    if (!handled) return;
    event.preventDefault();
    const targetRow = virtual.ensureVisible(
      Math.max(0, Math.min(rows.length - 1, row)),
    );
    if (!targetRow) return;
    const targets = editable(targetRow),
      field =
        row !== position &&
        ["ArrowUp", "ArrowDown"].includes(event.key)
          ? input.dataset.minuteField
          : null;
    const target =
      (field && targets.find((el) => el.dataset.minuteField === field)) ||
      targets[col < 0 ? targets.length - 1 : Math.min(col, targets.length - 1)];
    target?.focus({ preventScroll: true });
    target?.select();
  });
}
