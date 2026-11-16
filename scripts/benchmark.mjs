import {
  recalculateProject as baselineRecalculate,
  upgradeProject as baselineUpgrade,
} from "../benchmarks/baseline-v4/business.js";
import { upgradeProject } from "../public/business.js";
import { patchProjectRow } from "../public/project-state.js";
import { storagePatch } from "../public/storage-core.js";
const fixture = {
  version: 1,
  title: "Benchmark 500 lignes",
  rows: Array.from({ length: 500 }, (_, i) => ({
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
};
const old = baselineUpgrade(fixture),
  project = upgradeProject(fixture);
const stats = (fn) => {
  for (let i = 0; i < 5; i++) fn();
  const values = [];
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    fn();
    values.push(performance.now() - start);
  }
  values.sort((a, b) => a - b);
  return {
    p50_ms: Number(values[25].toFixed(3)),
    p95_ms: Number(values[47].toFixed(3)),
  };
};
const before = stats(() => {
  const next = structuredClone(old);
  next.rows[250].input.dimensions.h = ".25";
  JSON.stringify(baselineRecalculate(next));
});
const after = stats(() => {
  const next = patchProjectRow(
    project,
    "r250",
    (r) => (r.input.dimensions.h = ".25"),
  );
  storagePatch(project, next);
});
console.log(
  JSON.stringify(
    {
      rows: 500,
      before_full_recalculate_and_json: before,
      after_single_row_and_storage_patch: after,
      note: "Mesure CPU Node.js : calcul et préparation de sauvegarde, hors DOM, réseau et écriture disque.",
    },
    null,
    2,
  ),
);
