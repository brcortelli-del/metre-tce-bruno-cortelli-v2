/** Historique d'actions à partage structurel. Ni sérialisation du chantier,
 * ni copie des Blobs de plans à chaque frappe. Une série de frappes dans la
 * même cellule constitue une action ; les transactions d'import sont atomiques. */
export function createHistory(limit = 60, now = () => Date.now()) {
  let past = [],
    future = [],
    lastKey = "",
    lastTime = 0;
  return {
    record(before, after, key = "") {
      if (before === after) return;
      const time = now();
      if (!key || key !== lastKey || time - lastTime > 900) {
        past.push(before);
        if (past.length > limit) past.shift();
      }
      future = [];
      lastKey = key;
      lastTime = time;
    },
    undo(current) {
      if (!past.length) return null;
      future.push(current);
      lastKey = "";
      return past.pop();
    },
    redo(current) {
      if (!future.length) return null;
      past.push(current);
      lastKey = "";
      return future.pop();
    },
    clear() {
      past = [];
      future = [];
      lastKey = "";
    },
    state() {
      return { undo: past.length, redo: future.length };
    },
  };
}
