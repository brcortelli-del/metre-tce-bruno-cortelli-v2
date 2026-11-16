import { storagePatch, createRepository } from "./storage-core.js";

export function createLocalStore({
  onStatus = () => {},
  delay = 200,
  maxDelay = 1000,
} = {}) {
  let worker,
    fallback,
    sequence = 0,
    saved = null,
    latest = null,
    reset = true,
    revision = 0,
    generation = 0,
    timer,
    deadline,
    writing = null,
    failure = null;
  const pending = new Map();
  const report = () =>
    onStatus({
      pending: !!latest || !!writing,
      failed: !!failure,
      error: failure?.message || "",
    });
  function rpc(method, payload) {
    if (!worker && !fallback) {
      try {
        if (typeof Worker === "undefined")
          throw new Error("Worker indisponible");
        worker = new Worker(new URL("./storage-worker.js", import.meta.url), {
          type: "module",
        });
        worker.onmessage = ({ data }) => {
          const entry = pending.get(data.id);
          if (!entry) return;
          pending.delete(data.id);
          if (data.error)
            entry.reject(
              Object.assign(new Error(data.error.message), {
                name: data.error.name,
              }),
            );
          else entry.resolve(data.result);
        };
        worker.onerror = () => {
          worker?.terminate();
          worker = null;
          fallback = createRepository(indexedDB);
          // Un Worker refusé/arrêté ne condamne pas les brouillons : rejouer les
          // opérations en IDB asynchrone. Les puts sont idempotents et ordonnés.
          const entries = [...pending.values()];
          pending.clear();
          let retry = Promise.resolve();
          for (const entry of entries)
            retry = retry
              .catch(() => {})
              .then(() => rpc(entry.method, entry.payload))
              .then(entry.resolve, entry.reject);
        };
      } catch {
        fallback = createRepository(indexedDB);
      }
    }
    // Repli asynchrone IDB pour les navigateurs dépourvus de Worker ; jamais
    // de repli vers une écriture locale synchrone du projet entier.
    if (fallback) {
      if (method === "encode")
        return Promise.resolve(
          new Blob([JSON.stringify(payload)], { type: "application/json" }),
        );
      if (method === "parse")
        return Promise.resolve().then(() => JSON.parse(payload));
      if (method === "putAsset")
        return fallback.putAsset(payload.key, payload.blob);
      return fallback[method](payload);
    }
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, method, payload });
      try {
        worker.postMessage({ id, method, payload });
      } catch (error) {
        pending.delete(id);
        reject(error);
      }
    });
  }
  function clearTimers() {
    clearTimeout(timer);
    clearTimeout(deadline);
    timer = deadline = undefined;
  }
  async function flush() {
    clearTimers();
    if (writing) {
      await writing;
      if (latest) return flush();
      return;
    }
    if (!latest) return;
    const snapshot = latest,
      token = revision,
      epoch = generation,
      mustReset = reset;
    latest = null;
    const patch = storagePatch(saved, snapshot, mustReset);
    writing = rpc("write", patch);
    report();
    try {
      await writing;
      if (generation === epoch) {
        saved = snapshot;
        reset = false;
      }
      failure = null;
    } catch (error) {
      failure = error;
      if (!latest && revision === token) latest = snapshot;
      throw error;
    } finally {
      writing = null;
      report();
    }
    if (latest) return flush();
  }
  function schedule(project, { replace = false } = {}) {
    if (replace) {
      generation++;
      reset = true;
    }
    latest = project;
    revision++;
    failure = null;
    clearTimeout(timer);
    timer = setTimeout(() => flush().catch(() => {}), delay);
    deadline ||= setTimeout(() => flush().catch(() => {}), maxDelay);
    report();
  }
  async function load(legacyText) {
    const project = await rpc("load");
    if (project) {
      saved = project;
      reset = false;
      return project;
    }
    if (legacyText) {
      const old = await rpc("parse", legacyText);
      schedule(old, { replace: true });
      await flush();
      return old;
    }
    return null;
  }
  return {
    load,
    schedule,
    flush,
    hasPending: () => !!latest || !!writing,
    encode: (project) => rpc("encode", project),
    parse: (text) => rpc("parse", text),
    putAsset: (key, blob) => rpc("putAsset", { key, blob }),
    getAsset: (key) => rpc("getAsset", key),
    dispose: async () => {
      await flush();
      worker?.terminate();
      await fallback?.close();
    },
  };
}
