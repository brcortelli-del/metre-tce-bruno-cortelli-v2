import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { upgradeProject } from "../public/business.js";
import { patchProjectRow, patchProjectPlan } from "../public/project-state.js";
import { storagePatch, createRepository } from "../public/storage-core.js";
import { HeightIndex } from "../public/virtual-table.js";
import {
  orthogonalPoint,
  createPlanRenderer,
} from "../public/plan-renderer.js";
const fixture = (n = 500) =>
  upgradeProject({
    version: 1,
    title: "Chantier 500 lignes",
    rows: Array.from({ length: n }, (_, i) => ({
      id: "r" + i,
      label: "Dalle " + i,
      lot: "Gros œuvre",
      unitPrice: 100,
      input: {
        preset: "dalle",
        dimensionUnit: "m",
        dimensions: { L: "10", w: "5", h: ".2" },
        count: "1",
        deduction: "0",
        openings: [],
      },
    })),
  });
test("500 lignes : une cellule modifiée conserve les 499 autres objets et résultats", () => {
  const p = fixture(),
    next = patchProjectRow(p, "r250", (r) => (r.input.dimensions.h = ".25"));
  assert.equal(next.rows[250].result.total, 12.5);
  assert.equal(p.rows[250].result.total, 10);
  for (let i = 0; i < 500; i++)
    if (i !== 250) {
      assert.equal(next.rows[i], p.rows[i]);
      assert.equal(next.rows[i].result, p.rows[i].result);
    }
  const patch = storagePatch(p, next);
  assert.equal(patch.rows.length, 1);
  assert.equal(patch.pages.length, 0);
  assert.equal(patch.reset, false);
  assert.throws(() =>
    patchProjectRow(p, "r250", (r) => (r.input.dimensions.h = "invalide")),
  );
  assert.equal(p.rows[250].input.dimensions.h, ".2");
});
test("sommet lié : recalcul des seules lignes dépendantes, métadonnées sans recalcul", () => {
  const p = fixture();
  p.rows[1].input.planLink = { ids: ["a"], field: "L" };
  p.rows[3].input.planLink = { purpose: "fondations", field: "L" };
  const plan = {
    fileName: "Plan.pdf",
    page: 1,
    pages: {
      1: {
        scale: 0.1,
        reference: 10,
        calibration: [],
        traces: [
          { id: "a", points: [], purpose: "fondations", value: 20, unit: "m" },
        ],
      },
    },
  };
  const next = patchProjectPlan(p, plan, {
    traceIds: ["a"],
    purposes: ["fondations"],
  });
  assert.equal(next.rows[1].result.total, 20);
  assert.equal(next.rows[3].result.total, 20);
  assert.equal(next.rows[400], p.rows[400]);
  const meta = patchProjectPlan(next, { ...plan, page: 2 });
  assert.equal(meta.rows, next.rows);
});
test("sauvegarde normalisée : un relevé change, les autres points ne sont pas renvoyés", () => {
  const p = fixture(2),
    a = {
      id: "a",
      points: Array.from({ length: 500 }, (_, i) => ({ x: i, y: i % 17 })),
      value: 4,
    },
    b = {
      id: "b",
      points: Array.from({ length: 500 }, (_, i) => ({ x: i, y: 2 })),
      value: 8,
    };
  p.planWorkspace = {
    fileName: "Plan.pdf",
    pages: { 1: { scale: 1, reference: 10, calibration: [], traces: [a, b] } },
  };
  const next = {
    ...p,
    planWorkspace: {
      ...p.planWorkspace,
      pages: {
        1: { ...p.planWorkspace.pages[1], traces: [{ ...a, value: 6 }, b] },
      },
    },
  };
  const patch = storagePatch(p, next);
  assert.equal(patch.rows.length, 0);
  assert.equal(patch.traceWrites.length, 1);
  assert.equal(patch.traceWrites[0][1].id, "a");
  assert.equal(patch.pages[0][1].traces, undefined);
  assert.equal(JSON.stringify(patch).includes('"id":"b"'), false);
});
test("IndexedDB : restauration atomique des lignes, pages, révisions et Blob de 32 Mio", async () => {
  const db = new IDBFactory(),
    repo = createRepository(db),
    p = fixture();
  p.planWorkspace = {
    fileName: "Plan.pdf",
    pages: {
      1: {
        scale: 1,
        reference: 10,
        calibration: [],
        traces: [{ id: "t", value: 4, points: [{ x: 1, y: 2 }] }],
      },
    },
  };
  await repo.write(storagePatch(null, p));
  const blob = new Blob([new Uint8Array(32 * 1024 * 1024)], {
    type: "application/pdf",
  });
  await repo.putAsset("large-plan", blob);
  const next = patchProjectRow(p, "r250", (r) => (r.input.dimensions.h = ".3"));
  await repo.write(storagePatch(p, next));
  await repo.close();
  const reader = createRepository(db),
    loaded = await reader.load();
  assert.deepEqual(loaded, next);
  assert.equal((await reader.getAsset("large-plan")).size, blob.size);
  await reader.close();
});
test("IndexedDB : une transaction avortée ne remplace pas une sauvegarde valide", async () => {
  const db = new IDBFactory(),
    repo = createRepository(db),
    p = fixture(2);
  await repo.write(storagePatch(null, p));
  const next = patchProjectRow(p, "r1", (r) => (r.input.dimensions.h = ".4")),
    put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, key) {
    if (this.name === "rows")
      throw new DOMException("Stockage plein", "QuotaExceededError");
    return put.call(this, value, key);
  };
  try {
    await assert.rejects(
      repo.write(storagePatch(p, next)),
      /Stockage plein|interrompue/,
    );
  } finally {
    IDBObjectStore.prototype.put = put;
  }
  assert.deepEqual(await repo.load(), p);
  await repo.close();
});
test("index de hauteurs : accès à la 500e ligne et correction de hauteur sans défilement linéaire", () => {
  const index = new HeightIndex(Array(500).fill(100));
  assert.equal(index.atOffset(49950), 499);
  index.set(0, 200);
  assert.equal(index.prefix(500), 50100);
  assert.equal(index.atOffset(150), 0);
  assert.equal(index.atOffset(250), 1);
});
test("Maj contraint horizontalement ou verticalement ; sans Maj garde la cote", () => {
  assert.deepEqual(orthogonalPoint({ x: 10, y: 20 }, { x: 90, y: 42 }, true), {
    x: 90,
    y: 20,
  });
  assert.deepEqual(orthogonalPoint({ x: 10, y: 20 }, { x: 15, y: 90 }, true), {
    x: 10,
    y: 90,
  });
  assert.deepEqual(orthogonalPoint({ x: 0, y: 0 }, { x: 10, y: 20 }, false), {
    x: 10,
    y: 20,
  });
});
test("1000 mouvements : un frame d’interaction, aucun dessin du fond ou des tracés validés", () => {
  const old = globalThis.Path2D;
  globalThis.Path2D = class {
    moveTo() {}
    lineTo() {}
    closePath() {}
  };
  const calls = { image: 0 };
  const canvas = () => ({
    width: 1200,
    height: 750,
    dataset: {},
    getContext: () => ({
      clearRect() {},
      fillRect() {},
      drawImage() {
        calls.image++;
      },
      stroke() {},
      save() {},
      restore() {},
      fill() {},
      beginPath() {},
      arc() {},
      fillText() {},
    }),
  });
  let nextFrame;
  const r = createPlanRenderer({
    background: canvas(),
    vectors: canvas(),
    interaction: canvas(),
    requestFrame: (fn) => ((nextFrame = fn), 1),
    cancelFrame: () => {},
  });
  try {
    r.setBackground({ width: 1200, height: 750 });
    r.setTraces(
      [
        {
          id: "a",
          kind: "length",
          points: [
            { x: 1, y: 2 },
            { x: 20, y: 30 },
          ],
          label: "A",
        },
      ],
      [],
    );
    nextFrame();
    const before = r.stats();
    for (let i = 0; i < 1000; i++)
      r.setInteraction({ cursor: { x: i, y: i }, draft: [{ x: 0, y: 0 }] });
    nextFrame();
    const after = r.stats();
    assert.equal(after.background, before.background);
    assert.equal(after.vectors, before.vectors);
    assert.equal(after.interaction, before.interaction + 1);
    assert.equal(calls.image, 1);
  } finally {
    r.destroy();
    globalThis.Path2D = old;
  }
});
test("file de sauvegarde : modifications rapprochées et changement de projet conservent le dernier état", async () => {
  const old = globalThis.indexedDB;
  globalThis.indexedDB = new IDBFactory();
  try {
    const { createLocalStore } = await import("../public/storage.js");
    const events = [],
      store = createLocalStore({
        onStatus: (s) => events.push(s),
        delay: 10000,
        maxDelay: 10000,
      }),
      p = fixture(3);
    store.schedule(p, { replace: true });
    const writing = store.flush();
    const q = patchProjectRow(p, "r1", (r) => (r.input.dimensions.h = ".45"));
    store.schedule(q);
    await writing;
    await store.flush();
    const reader = createRepository(globalThis.indexedDB);
    assert.deepEqual(await reader.load(), q);
    const replacement = fixture(1);
    replacement.title = "Autre chantier";
    store.schedule(replacement, { replace: true });
    await store.flush();
    assert.deepEqual(await reader.load(), replacement);
    assert.equal(events.at(-1).pending, false);
    assert.equal(events.at(-1).failed, false);
    await store.dispose();
    await reader.close();
  } finally {
    globalThis.indexedDB = old;
  }
});
test("valeur retenue supprimée : retour à la mesure graphique sur les seules lignes liées", () => {
  const p = fixture(2);
  p.rows[0].input.planLink = { ids: ["t"], field: "L" };
  const trace = {
      id: "t",
      purpose: "fondations",
      value: 8,
      retained: "12",
      points: [],
      unit: "m",
    },
    page = { scale: 1, reference: 20, traces: [trace], calibration: [] },
    plan = { pages: { 1: page } };
  const a = patchProjectPlan(p, plan, { traceIds: ["t"] });
  assert.equal(a.rows[0].result.total, 12);
  const nextTrace = { ...trace };
  delete nextTrace.retained;
  const b = patchProjectPlan(
    a,
    { pages: { 1: { ...page, traces: [nextTrace] } } },
    { traceIds: ["t"] },
  );
  assert.equal(b.rows[0].result.total, 8);
  assert.equal(b.rows[1], p.rows[1]);
});
test("migration d’un ancien JSON local vers IndexedDB, puis restauration sans le JSON", async () => {
  const old = globalThis.indexedDB;
  globalThis.indexedDB = new IDBFactory();
  try {
    const { createLocalStore } = await import("../public/storage.js");
    const source = fixture(500),
      store = createLocalStore();
    assert.deepEqual(await store.load(JSON.stringify(source)), source);
    await store.dispose();
    const reader = createLocalStore();
    assert.deepEqual(await reader.load(), source);
    await reader.dispose();
  } finally {
    globalThis.indexedDB = old;
  }
});
