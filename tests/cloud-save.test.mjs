import test from "node:test";
import assert from "node:assert/strict";
import { initCloud } from "../public/cloud.js";
import { upgradeProject } from "../public/business.js";
test("créer un projet pendant une sauvegarde attend la transaction et ne vide pas le précédent", async () => {
  const original = globalThis.fetch;
  let project = upgradeProject({
      version: 1,
      title: "Premier chantier",
      rows: [
        {
          id: "r",
          label: "Dalle",
          unitPrice: 10,
          input: {
            preset: "dalle",
            dimensionUnit: "m",
            dimensions: { L: "5", w: "4", h: ".2" },
            count: "1",
            deduction: "0",
            openings: [],
          },
        },
      ],
    }),
    records = new Map(),
    nextId = 0,
    release,
    started;
  const didStart = new Promise((r) => (started = r));
  let delayNext = false;
  const json = (x, status = 200) =>
    new Response(JSON.stringify(x), {
      status,
      headers: { "content-type": "application/json" },
    });
  globalThis.fetch = async (path, options = {}) => {
    if (path === "/api/session")
      return json({
        owner: true,
        canCreate: true,
        user: { id: "owner", email: "owner@example.test" },
      });
    if (path === "/api/projects" && !options.method)
      return json({
        projects: [...records].map(([id, p]) => ({
          id,
          title: p.title,
          role: "owner",
          version: p.cloudVersion,
        })),
      });
    if (path === "/api/projects" && options.method === "POST") {
      const p = JSON.parse(await new Response(options.body).text()),
        id = "p" + ++nextId;
      p.cloudId = id;
      p.cloudVersion = 1;
      records.set(id, p);
      return json({ project: p, role: "owner", version: 1 });
    }
    const id = path.split("/").at(-1);
    if (options.method === "PUT") {
      if (delayNext) {
        delayNext = false;
        started();
        await new Promise((r) => (release = r));
      }
      const p = JSON.parse(await new Response(options.body).text());
      p.cloudVersion = records.get(id).cloudVersion + 1;
      records.set(id, p);
      return json({ project: p, role: "owner", version: p.cloudVersion });
    }
    throw new Error("Requête inattendue " + path);
  };
  try {
    const cloud = initCloud({
      get: () => project,
      replace: (p) => (project = p),
      empty: () =>
        upgradeProject({ version: 1, title: "Nouveau chantier", rows: [] }),
      syncFields: (x) => Object.assign(project, x),
      encode: (p) =>
        Promise.resolve(
          new Blob([JSON.stringify(p)], { type: "application/json" }),
        ),
      confirm: async () => true,
    });
    await cloud.ready;
    const first = project.cloudId;
    project = { ...project, title: "Premier chantier modifié" };
    cloud.changed();
    delayNext = true;
    const save = cloud.flush();
    await didStart;
    const creating = cloud.create();
    await Promise.resolve();
    assert.equal(project.cloudId, first);
    release();
    await save;
    await creating;
    assert.notEqual(project.cloudId, first);
    assert.equal(records.get(first).title, "Premier chantier modifié");
    assert.equal(records.get(first).rows.length, 1);
    assert.equal(project.rows.length, 0);
    assert.equal(records.size, 2);
  } finally {
    globalThis.fetch = original;
  }
});
