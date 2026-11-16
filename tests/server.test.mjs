import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handleApi } from "../server/api.js";
import { upgradeProject } from "../public/business.js";
import { plainBlocks } from "../public/cctp-model.js";
const makeEnv = () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../drizzle/0000_majestic_slapstick.sql", import.meta.url),
      "utf8",
    ),
  );
  const DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let args = [];
      const self = {
        bind(...values) {
          args = values;
          return self;
        },
        async first() {
          return statement.get(...args) || null;
        },
        async all() {
          return { results: statement.all(...args) };
        },
        async run() {
          return { meta: { changes: Number(statement.run(...args).changes) } };
        },
      };
      return self;
    },
  };
  const objects = new Map();
  return {
    DB,
    BUCKET: {
      async put(key, bytes) {
        objects.set(key, bytes);
      },
      async get(key) {
        return objects.has(key) ? { body: objects.get(key) } : null;
      },
    },
  };
};
const owner = { uid: "test-owner", email: "owner@example.test" },
  metreur = { uid: "test-metreur", email: "metreur@example.test" },
  conducteur = { uid: "test-conducteur", email: "conducteur@example.test" },
  dirigeant = { uid: "test-dirigeant", email: "dirigeant@example.test" },
  stranger = { uid: "test-stranger", email: "stranger@example.test" };
const initial = () =>
  upgradeProject({
    version: 1,
    title: "Projet de validation",
    rows: [
      {
        id: "r1",
        label: "Dalle",
        lot: "Gros œuvre",
        unitPrice: 123.45,
        costs: { materials: 67, kOverride: 1.5 },
        input: {
          preset: "dalle",
          dimensionUnit: "m",
          dimensions: { L: "10", w: "5", h: ".2" },
          count: "1",
          deduction: "0",
          openings: [],
        },
      },
    ],
  });
async function call(
  env,
  path = "",
  method = "GET",
  body,
  user = owner,
  version,
) {
  const headers = {};
  if (user) {
    headers["oai-authenticated-user-id"] = user.uid;
    headers["oai-authenticated-user-email"] = user.email;
  }
  if (method !== "GET") headers.origin = "https://atelier.example";
  if (version !== undefined) headers["if-match"] = String(version);
  if (body && !(body instanceof FormData)) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(body);
  }
  const response = await handleApi(
    new Request("https://atelier.example/api/" + path, {
      method,
      headers,
      body,
    }),
    env,
  );
  let data;
  if (response.headers.get("content-type")?.includes("application/json"))
    data = await response.json();
  else data = await response.arrayBuffer();
  return { status: response.status, data };
}
async function setup() {
  const env = makeEnv();
  assert.equal((await call(env, "session")).status, 200);
  const created = await call(env, "projects", "POST", initial());
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const pid = created.data.project.cloudId;
  for (const [u, role] of [
    [metreur, "metreur"],
    [conducteur, "conducteur"],
    [dirigeant, "dirigeant"],
  ])
    assert.equal(
      (
        await call(env, `projects/${pid}/members`, "POST", {
          email: u.email,
          role,
        })
      ).status,
      200,
    );
  return { env, pid };
}
test("authentification, origine et accès projet exigés", async () => {
  const { env, pid } = await setup();
  assert.equal(
    (await call(env, "projects", "GET", undefined, null)).status,
    401,
  );
  assert.equal(
    (await call(env, `projects/${pid}`, "GET", undefined, stranger)).status,
    403,
  );
  const r = await handleApi(
    new Request("https://atelier.example/api/projects", {
      method: "POST",
      headers: { "oai-authenticated-user-id": owner.uid },
      body: "{}",
    }),
    env,
  );
  assert.equal(r.status, 403);
  assert.equal(
    (await call(env, "health", "GET", undefined, null)).data.ready,
    true,
  );
});
test('assistant IA : identité propriétaire et origine exigées, sans exposer de clé',async()=>{
  const {env}=await setup();
  assert.equal((await call(env,'assistant','GET',undefined,null)).status,401);
  assert.equal((await call(env,'assistant','GET',undefined,stranger)).status,403);
  assert.equal((await call(env,'assistant','POST',{text:'Mur 12 m2',lignes:[]},metreur)).status,403);
  const caps=await call(env,'assistant');assert.equal(caps.status,200);assert.equal(caps.data.configured,false);
  const local=await call(env,'assistant','POST',{text:'Mur 12 m2',lignes:[]});
  assert.equal(local.status,200);assert.equal(local.data.moteur,'local');assert.equal(local.data.fallback_reason,'cle_absente');
  assert.equal(local.data.postes_detectes[0].quantite_estimee,12);
  const rejected=await handleApi(new Request('https://atelier.example/api/assistant',{method:'POST',headers:{'oai-authenticated-user-id':owner.uid,origin:'https://autre.example'},body:'{}'}),env);
  assert.equal(rejected.status,403);
  env.OPENAI_API_KEY='secret-de-test';
  const configured=await call(env,'assistant');assert.equal(configured.data.configured,true);assert.ok(!JSON.stringify(configured.data).includes('secret-de-test'));
  assert.equal((await call(env,'assistant','POST',{text:'',lignes:[]})).status,400);
  assert.equal((await call(env,'analyse-metre','GET',undefined,null)).status,401);
  assert.equal((await call(env,'analyse-metre','POST',{texteClient:'Mur 12 m²',lignesMetreActuelles:[]},stranger)).status,403);
  assert.equal((await call(env,'analyse-metre')).data.configured,true);
  assert.equal((await call(env,'analyse-metre','POST',{texteClient:'',lignesMetreActuelles:[]})).status,400);
});
test("conducteur : consultation sans prix et refus de modification côté serveur", async () => {
  const { env, pid } = await setup();
  const result = await call(
    env,
    `projects/${pid}`,
    "GET",
    undefined,
    conducteur,
  );
  assert.equal(result.data.role, "conducteur");
  const p = result.data.project;
  assert.equal(p.rows[0].unitPrice, null);
  assert.equal(p.rows[0].costs, undefined);
  assert.equal(p.settings.k, 1);
  assert.equal(p.settings.profitRisk, 0);
  assert.equal(p.assemblies[0].components[0].unitCost, null);
  assert.equal(
    (await call(env, `projects/${pid}`, "PUT", initial(), conducteur, 1))
      .status,
    403,
  );
  assert.equal(
    (
      await call(
        env,
        `projects/${pid}/approve`,
        "POST",
        undefined,
        conducteur,
        1,
      )
    ).status,
    403,
  );
  assert.equal(
    (await call(env, "projects", "POST", initial(), conducteur)).status,
    403,
  );
});
test("métreur : quantités autorisées, coefficients du dirigeant protégés", async () => {
  const { env, pid } = await setup();
  let p = (await call(env, `projects/${pid}`, "GET", undefined, metreur)).data
    .project;
  p.rows[0].input.dimensions.L = "12";
  let result = await call(env, `projects/${pid}`, "PUT", p, metreur, 1);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.project.rows[0].result.total, 12);
  p = result.data.project;
  p.settings.k = 2;
  assert.equal(
    (await call(env, `projects/${pid}`, "PUT", p, metreur, 2)).status,
    403,
  );
  p.settings.k = 1.3;
  p.rows[0].costs.kOverride = 2;
  assert.equal(
    (await call(env, `projects/${pid}`, "PUT", p, metreur, 2)).status,
    403,
  );
  assert.equal(
    (await call(env, `projects/${pid}/members`, "GET", undefined, metreur))
      .status,
    403,
  );
});
test("validation dirigeant, concurrence, révisions et restauration", async () => {
  const { env, pid } = await setup();
  let result = await call(
    env,
    `projects/${pid}/approve`,
    "POST",
    undefined,
    dirigeant,
    1,
  );
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.project.approval.status, "approved");
  const p = result.data.project;
  assert.equal(
    (await call(env, `projects/${pid}`, "PUT", p, owner, 1)).status,
    409,
  );
  assert.equal(
    (await call(env, `projects/${pid}`, "PUT", p, owner)).status,
    428,
  );
  const revision = await call(env, `projects/${pid}/revisions`, "POST", {});
  assert.equal(revision.status, 201);
  assert.equal(revision.data.label, "Indice A");
  p.rows[0].input.dimensions.L = "20";
  result = await call(env, `projects/${pid}`, "PUT", p, owner, 2);
  assert.equal(result.data.project.approval, null);
  assert.equal(result.data.version, 3);
  result = await call(
    env,
    `projects/${pid}/revisions/${revision.data.id}/restore`,
    "POST",
    undefined,
    owner,
    3,
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.project.rows[0].result.total, 10);
  const redacted = await call(
    env,
    `projects/${pid}/revisions/${revision.data.id}`,
    "GET",
    undefined,
    conducteur,
  );
  assert.equal(redacted.data.revision.data.rows[0].unitPrice, null);
});
test("plans privés : sauvegarde et restitution protégées par le rôle", async () => {
  const { env, pid } = await setup();
  const form = new FormData();
  form.append(
    "file",
    new File([new Uint8Array([1, 2, 3])], "plan.dxf", {
      type: "application/octet-stream",
    }),
  );
  const saved = await call(env, `projects/${pid}/assets`, "POST", form);
  assert.equal(saved.status, 201);
  assert.equal(
    (
      await call(
        env,
        `projects/${pid}/assets/${saved.data.id}`,
        "GET",
        undefined,
        stranger,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        env,
        `projects/${pid}/assets/${saved.data.id}`,
        "GET",
        undefined,
        conducteur,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call(env, `projects/${pid}/assets`, "POST", form, conducteur))
      .status,
    403,
  );
});
test("CCTP : persistance cloud, champs filtrés et droits de consultation", async () => {
  const { env, pid } = await setup();
  const p = (await call(env, `projects/${pid}`, "GET", undefined, metreur)).data
    .project;
  p.cctp = {
    version: 1,
    articles: [
      {
        id: "a1",
        title: "Décapage",
        lotNumber: "01",
        lotName: "Terrassement",
        sublot: "Déblais",
        description: plainBlocks("Prescription adaptée au chantier"),
        measurement: plainBlocks("Mesurage suivant l’emprise du plan"),
        execution: [],
        location: [],
        rowIds: ["r1"],
        reviewed: false,
        quantity: 999,
        html: "<script>alert(1)</script>",
      },
    ],
  };
  const saved = await call(env, `projects/${pid}`, "PUT", p, metreur, 1);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const read = (
    await call(env, `projects/${pid}`, "GET", undefined, conducteur)
  ).data.project;
  assert.equal(
    read.cctp.articles[0].description[0].runs[0].text,
    "Prescription adaptée au chantier",
  );
  assert(!("quantity" in read.cctp.articles[0]));
  assert.equal(
    read.cctp.articles[0].measurement[0].runs[0].text,
    "Mesurage suivant l’emprise du plan",
  );
  assert(!("html" in read.cctp.articles[0]));
  read.cctp.articles[0].title = "Modification interdite";
  assert.equal(
    (await call(env, `projects/${pid}`, "PUT", read, conducteur, 2)).status,
    403,
  );
});


test("chiffrage : majorations successives protégées, sous-détails incomplets persistés sans faux prix", async () => {
  const {env,pid}=await setup();
  let p=(await call(env,`projects/${pid}`)).data.project;
  p.settings.sellMode='markup'; p.settings.overhead=15; p.settings.profitRisk=10;
  p.rows[0].pricingMode='study';p.rows[0].costs={materials:0,hours:.35,equipment:null,materialsSource:'manual',requireComplete:true};
  let saved=await call(env,`projects/${pid}`,'PUT',p,owner,1);
  assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.project.rows[0].unitPrice,null);
  p=saved.data.project;p.settings.profitRisk=11;
  assert.equal((await call(env,`projects/${pid}`,'PUT',p,metreur,2)).status,403);
  p.settings.profitRisk=10;p.rows[0].costs.equipment=18.5;
  saved=await call(env,`projects/${pid}`,'PUT',p,metreur,2);
  assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.project.rows[0].unitPrice,38.9);
});

test("chiffrage : ancien projet sans profitRisk reste modifiable par le métreur", async () => {
  const {env,pid}=await setup();
  const record=await env.DB.prepare('SELECT data FROM projects WHERE id=?').bind(pid).first();
  const legacy=JSON.parse(record.data);delete legacy.settings.profitRisk;
  await env.DB.prepare('UPDATE projects SET data=? WHERE id=?').bind(JSON.stringify(legacy),pid).run();
  const p=(await call(env,`projects/${pid}`,'GET',undefined,metreur)).data.project;
  p.rows[0].input.dimensions.L='12';
  const saved=await call(env,`projects/${pid}`,'PUT',p,metreur,1);
  assert.equal(saved.status,200,JSON.stringify(saved.data));
  assert.equal(saved.data.project.settings.profitRisk,10);
});

test('statut IA : propriétaire seul, GET seul et aucun secret dans la réponse', async () => {
  const env = makeEnv();
  await call(env, 'session');
  assert.equal((await call(env, 'status-ia', 'GET', undefined, null)).status, 401);
  assert.equal((await call(env, 'status-ia', 'GET', undefined, {uid:'other',email:'other@example.com'})).status, 403);
  const absent = await call(env, 'status-ia');
  assert.equal(absent.status, 200);
  assert.equal(absent.data.configured, false);
  assert.equal(absent.data.provider, 'local');
  env.OPENAI_API_KEY = 'secret-only-server';
  const originalFetch = globalThis.fetch;
  let configured;
  try {
    globalThis.fetch = async () => Response.json({data:[]});
    configured = await call(env, 'status-ia');
  } finally { globalThis.fetch = originalFetch; }
  assert.equal(configured.data.configured, true);
  assert.equal(configured.data.model, 'gpt-4o-mini');
  assert.equal(configured.data.verification, 'connection_verified');
  assert.equal(configured.data.connexionReelle, true);
  assert.ok(!JSON.stringify(configured.data).includes(env.OPENAI_API_KEY));
  assert.equal((await call(env, 'status-ia', 'POST', {})).status, 405);
});
