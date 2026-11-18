import {encodeProjectArchive,decodeProjectArchive,ARCHIVE_LIMIT} from './project-archive.js';
import {localProjectLibrary} from './project-library.js';
import {extensionChildRows} from './extension-children.js';
import { DEMO_MODE, createDemoStore } from './demo-mode.js';
import { createDemoProject } from './demo-project.js';
import { workColor, professionalTraceRow } from './professional-core.js';
import { saveCctpToProject } from './row-cctp.js';
import {validateExtension,extensionResults,slopeInfo,validateMeasurementModel} from './premium-metre.js';
import { createLocalStore } from "./storage.js";
import { createHistory } from "./history.js";
import { preparerLigneAssistant } from './assistant-metre.js';
import { createTakeoffView } from "./takeoff-view.js";
import {
  patchProjectRow,
  insertProjectRows,
  patchProjectPlan,
  updateWholeProject,
} from "./project-state.js";
import { initPro } from "./pro.js";
import {
  upgradeProject,
  recalculateProject,
  applyPlanLinks,
} from "./business.js";
import { evaluateExpression } from "./expression.js";
import { initPlan } from "./plan.js";
import { COUNTRIES, defaultProfile } from './country-rules.js';
import { catalogueIndex, importMinute } from './cctp-model.js';
import { countryCatalogue, switchCountryCctp, adoptCountryCctp } from './country-cctp.js';
import { decorateNormativeCatalogue, adoptNormativeCctp, calculatorNormativeProfile } from './normative-fr.js';
import {
  PRESETS,
  calculate,
  fmt,
  number,
  totalsByLot,
  csvValue,
  validateProject,
  parseUnitPrice,
  lineAmount,
  money,
  pricingSummary,
  takeoffRecords,
  fieldsFor,
  unitsFor,
  BASES,
} from "./core.js";
const $ = (id) => document.getElementById(id),
  KEY = "atelier-metre-tce-v1";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let project = upgradeProject({
    version: 1,
    title: "Mon projet de formation",
    rows: [],
  }),
  editId = null,
  latest = null,
  storageOK = true,
  toastTimer,
  previousUnit = "m",
  currentMeasurement = null,
  currentPlanLink = null,
  currentBpuId = null,
  planApi = null,
  proApi = null;
let countryBusy=false, crossDataPromise;
const actionHistory=createHistory();
let currentView='calculator';
function notifyProject(detail={}) {
  document.dispatchEvent(new CustomEvent('atelier:project',{detail}));
  document.dispatchEvent(new CustomEvent('atelier:meta'));
}
let normativeIndex=null,normativeIndexPromise,normativeWarningKey='';
function loadNormativeIndex(){
  return normativeIndexPromise ||= fetch('/data/normative-fr-index.json').then(r=>{if(!r.ok)throw new Error('Référentiel normatif France indisponible.');return r.json();}).then(data=>{normativeIndex=data;return data;}).catch(e=>{normativeIndexPromise=null;throw e;});
}
function refreshNormativeWarning(){
  const box=$('normativeVigilance'),key=[project.country,$('preset').value,!!normativeIndex].join('|');
  if(!box||key===normativeWarningKey)return;
  normativeWarningKey=key;box.hidden=project.country==='luxembourg';
  if(box.hidden)return;
  const p=calculatorNormativeProfile($('preset').value,normativeIndex);
  box.textContent='Vigilance Métreur · France : '+(p?.alerte_interface_site||'Chargement des références vérifiées…');
}
const storeOptions = {
  onStatus: (status) => {
    storageOK = !status.failed;
    if (DEMO_MODE) { $("saveStatus").textContent = "Démo · modifications temporaires"; return; }
    $("saveStatus").textContent = status.failed
      ? "Sauvegarde en échec : " + status.error
      : status.pending
        ? "Enregistrement local…"
        : "Enregistré sur cet appareil";
    $("saveStatus").dataset.pending = String(status.pending);
  },
};
const localStore = DEMO_MODE ? createDemoStore(createDemoProject(),storeOptions) : createLocalStore(storeOptions);
const takeoffView = createTakeoffView({
  container: $("tableContainer"),
  body: $("rows"),
  getProject: () => project,
  isReadOnly: () => proApi?.isReadOnly() || false,
});
let renderedBpu = null,
  renderedReuse = null;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4500);
}
function persist() {
  const title=$("projectTitle").value.trim() || "Mon projet";
  if(project.title!==title) project={...project,title};
  proApi?.onPersist();
  saveLocal();
}
function saveLocal(options) {
  localStore.schedule(project, options);
  if(project.localProjectId)localProjectLibrary.schedule(project);
}
function inputState() {
  return {
    ...(editId&&$("outputUnit").value==='m²'&&project.rows.find(r=>r.id===editId)?.input.preset===$("preset").value&&project.rows.find(r=>r.id===editId)?.input.slope?{slope:structuredClone(project.rows.find(r=>r.id===editId).input.slope)}:{}),
    preset: $("preset").value,
    dimensionUnit: $("dimensionUnit").value,
    outputUnit: $("outputUnit").value,
    basis: $("basis").value,
    planMeasurement: currentMeasurement,
    planLink: currentPlanLink,
    measurementProfile: $('measurementProfile').value || defaultProfile($('preset').value),
    dimensions: Object.fromEntries(
      fieldsFor($("preset").value, $("outputUnit").value).map(([key]) => [
        key,
        $("dim-" + key).value,
      ]),
    ),
    count: $("count").value,
    deduction: $("deduction").value,
    openings: [...document.querySelectorAll(".opening-row")].map((r) => ({
      w: r.querySelector('[data-field="w"]').value,
      h: r.querySelector('[data-field="h"]').value,
      n: r.querySelector('[data-field="n"]').value,
    })),
  };
}
function renderFields(values) {
  const p = PRESETS[$("preset").value],
    u = $("dimensionUnit").value,
    resultUnit = $("outputUnit").value || p.unit;
  $("dimensions").innerHTML = fieldsFor($("preset").value, resultUnit)
    .map(([key, label, kind = "m"]) => {
      const suffix =
        kind === "m"
          ? u
          : kind === "cote"
            ? "m"
            : kind === "coef"
              ? "×"
              : kind === "result"
                ? resultUnit
                : kind;
      return `<label for="dim-${key}">${esc(label)}<div class="dimension-input"><input id="dim-${key}" value="${esc(values[key] ?? p.defaults[key] ?? "")}" type="text" inputmode="decimal" autocomplete="off" maxlength="256"><span>${esc(suffix)}</span></div></label>`;
    })
    .join("");
  $("deductionUnit").textContent = `(${resultUnit})`;
  $("openingsSection").hidden = !(
    $("preset").value === "mur" || p.kind === "wall"
  );
  $('measurementProfile').value=defaultProfile($('preset').value);
  $("catalogSource").textContent = p.source
    ? `${p.source}${p.article ? " · " + p.article : ""} · désignation modifiable ci-dessous.`
    : "Géométrie courante · dimensions réelles.";
}
function setUnits(key, unit) {
  $("outputUnit").innerHTML = unitsFor(key)
    .map((u) => `<option value="${u}">${u}</option>`)
    .join("");
  $("outputUnit").value = unit || PRESETS[key].unit;
  $("outputUnit").disabled = unitsFor(key).length === 1;
}
function catalogueOptions(selected = "surface") {
  const q = $("catalogSearch")
    .value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const groups = new Map();
  for (const [key, p] of Object.entries(PRESETS)) {
    const text = (p.title + " " + p.lot + " " + (p.article || ""))
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (q && !text.includes(q) && key !== selected) continue;
    const g = p.category || "Géométrie courante";
    if (!groups.has(g)) groups.set(g, []);
    groups
      .get(g)
      .push(
        `<option value="${key}">${esc(p.article ? p.article + " · " : "")}${esc(p.title)}</option>`,
      );
  }
  $("preset").innerHTML = [...groups]
    .map(
      ([g, options]) =>
        `<optgroup label="${esc(g)}">${options.join("")}</optgroup>`,
    )
    .join("");
  $("preset").value = selected;
}
function opening(o = { w: "1,2", h: "1", n: "1" }) {
  const el = document.createElement("div");
  el.className = "opening-row";
  const i = $("openings").children.length + 1;
  el.innerHTML = `<label>Largeur<input data-field="w" aria-label="Ouverture ${i}, largeur" type="text" inputmode="decimal" value="${esc(o.w)}" maxlength="256"></label><label>Hauteur<input data-field="h" aria-label="Ouverture ${i}, hauteur" type="text" inputmode="decimal" value="${esc(o.h)}" maxlength="256"></label><label>Nombre<input data-field="n" aria-label="Ouverture ${i}, nombre" type="text" inputmode="numeric" value="${esc(o.n)}" maxlength="256"></label><button class="quiet" type="button" aria-label="Supprimer cette ouverture">×</button>`;
  el.querySelector("button").addEventListener("click", () => {
    el.remove();
    updateCalculation();
  });
  $("openings").append(el);
}
function resetForm(preset = "surface") {
  editId = null;
  currentMeasurement = null;
  currentPlanLink = null;
  currentBpuId = null;
  previousUnit = "m";
  catalogueOptions(preset);
  $("preset").value = preset;
  setUnits(preset);
  $("basis").value = "libre";
  $("dimensionUnit").value = "m";
  $("count").value = String(PRESETS[preset].countDefault || 1);
  $("deduction").value = "0";
  $("openings").replaceChildren();
  const p = PRESETS[preset];
  renderFields(p.defaults);
  $("label").value = p.title;
  $("lot").value = p.lot;
  for (const key of [
    "rowNumber",
    "code",
    "report",
    "unitPrice",
    "location",
    "building",
    "level",
    "room",
  ])
    $(key).value = "";
  $("calcTitle").textContent = "Calculer un ouvrage";
  $("addRow").textContent = "+ Ajouter à l’avant-métré";
  $("cancelEdit").hidden = true;
  updateCalculation();
}
function updateCalculation() {
  refreshNormativeWarning();
  try {
    latest = calculate(inputState(), project.variables, project);
    const r = latest,
      price = parseUnitPrice($("unitPrice").value),
      amount = lineAmount(r.total, price);
    $("calcError").hidden = true;
    $("addRow").disabled = proApi?.isReadOnly() || false;
    $("resultPanel").innerHTML =
      `<div class="result-top"><span>QUANTITÉ NETTE</span><strong>${fmt(r.total, 3)} <small>${r.unit}</small></strong></div><p class="formula-label">${esc(r.formula)}</p>${r.steps.map((s) => `<p class="calculation-step">${esc(s)}</p>`).join("")}${r.total === 0 ? '<p class="zero-warning">Quantité nette nulle : vérifie tes déductions.</p>' : ""}${amount === null ? "" : `<div class="pricing-preview"><span>Montant HT</span><strong>${money(amount, project.settings.currency)}</strong><small>${fmt(r.total)} ${r.unit} × ${money(price, project.settings.currency)} / ${r.unit}</small></div>`}`;
  } catch (e) {
    latest = null;
    $("calcError").textContent = e.message;
    $("calcError").hidden = false;
    $("addRow").disabled = true;
    $("resultPanel").innerHTML =
      '<p class="result-empty">Complète ou corrige les valeurs pour afficher le calcul.</p>';
  }
}
function renderRows() {
  refreshCountry();
  if ($("rowBpu") && renderedBpu !== project.bpu) {
    renderedBpu = project.bpu;
    const selected = $("rowBpu").value;
    $("rowBpu").innerHTML =
      '<option value="">Choisir dans le bordereau importé…</option>' +
      project.bpu
        .map(
          (b) =>
            `<option value="${esc(b.id)}">${esc(b.code)} · ${esc(b.label)}</option>`,
        )
        .join("");
    $("rowBpu").value = selected;
  }
  const rows = project.rows;
  $("rowCount").textContent =
    `${rows.length} ligne${rows.length > 1 ? "s" : ""}`;
  $("empty").hidden = rows.length > 0;
  $("tableContainer").hidden = rows.length === 0;
  $("lotTotals").hidden = rows.length === 0;
  $("csv").disabled = rows.length === 0;
  $("print").disabled = rows.length === 0;
  const totals = { m: 0, "m²": 0, "m³": 0, kg: 0, u: 0, forfait: 0 };
  rows.forEach(
    (r) =>
      (totals[['mm','cm','ml'].includes(r.result.unit)?'m':r.result.unit] = (totals[['mm','cm','ml'].includes(r.result.unit)?'m':r.result.unit] || 0) + r.result.total * ({mm:.001,cm:.01,ml:1}[r.result.unit]??1)),
  );
  for (const [id, u] of [
    ["totalM", "m"],
    ["totalM2", "m²"],
    ["totalM3", "m³"],
  ])
    $(id).innerHTML = `${fmt(totals[u], 3)} <small>${u}</small>`;
  takeoffView.setItems(rows);
  const pricing = pricingSummary(rows);
  $("pricingFooter").innerHTML = rows.length
    ? `<tr class="grand-total"><th scope="row" colspan="7">${pricing.missing ? "Total HT renseigné" : "Total HT"}</th><td class="numeric">${pricing.priced ? money(pricing.total, project.settings.currency) : "—"}</td><td class="actions-cell"></td></tr>${pricing.missing ? `<tr class="pricing-note"><td colspan="9">${pricing.missing} ligne${pricing.missing > 1 ? "s" : ""} sans PV HT : total incomplet. Les prix restent facultatifs pour les exercices de métré.</td></tr>` : ""}`
    : "";
  if (!$("calculatorWorkspace").hidden) renderReuseOptions();
  $("lotTotals").innerHTML =
    "<h3>Sous-totaux par lot</h3>" +
    totalsByLot(rows)
      .map(
        (g) =>
          `<div class="lot-total"><span>${esc(g.lot)}</span><span>${
            Object.entries(g.totals)
              .filter(([, v]) => v !== 0)
              .map(([u, v]) => `${fmt(v, 3)} ${u}`)
              .join(" · ") || "0"
          }<small>${g.pricing.priced ? `HT : ${money(g.pricing.total, project.settings.currency)}${g.pricing.missing ? " (partiel)" : ""}` : "PV HT non renseigné"}</small></span></div>`,
      )
      .join("");
  proApi?.afterRows();
  proApi?.onRowsChanged();
}
function renderReuseOptions() {
  if (renderedReuse === project.rows) return;
  renderedReuse = project.rows;
  const selected = $("reuseRow").value;
  $("reuseRow").innerHTML =
    '<option value="">Choisir un index / une ligne…</option>' +
    project.rows
      .map(
        (r, i) =>
          `<option value="${esc(r.id)}">${esc(r.code || String(i + 1))} · ${esc(r.label.slice(0, 45))} : ${fmt(r.result.total)} ${r.result.unit}</option>`,
      )
      .join("");
  $("reuseRow").value = selected;
}
async function confirmAction(title, message) {
  $("confirmTitle").textContent = title;
  $("confirmText").textContent = message;
  const dialog = $("confirmDialog");
  dialog.returnValue = "cancel";
  dialog.showModal();
  return new Promise((resolve) =>
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "confirm"),
      { once: true },
    ),
  );
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function fileBase() {
  return (
    project.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .slice(0, 70) || "avant_metre"
  );
}
catalogueOptions();
$("catalogSearch").addEventListener("input", () =>
  catalogueOptions($("preset").value),
);
$("preset").addEventListener("change", () => {
  const key = $("preset").value,
    p = PRESETS[key];
  currentMeasurement = null;
  currentPlanLink = null;
  currentBpuId = null;
  $("dimensionUnit").value = "m";
  previousUnit = "m";
  setUnits(key);
  renderFields(p.defaults);
  $("count").value = String(p.countDefault || 1);
  $("deduction").value = "0";
  $("openings").replaceChildren();
  $("label").value = p.title;
  $("lot").value = p.lot;
  $("unitPrice").value = "";
  $("rowNumber").value = p.article || "";
  updateCalculation();
});
$("outputUnit").addEventListener("change", () => {
  const profile=$('measurementProfile').value;
  const old = Object.fromEntries(
    [...document.querySelectorAll("#dimensions input")].map((el) => [
      el.id.slice(4),
      el.value,
    ]),
  );
  renderFields({ ...PRESETS[$("preset").value].defaults, ...old });
  $('measurementProfile').value=profile;
  $("deduction").value = "0";
  updateCalculation();
});
$("basis").addEventListener("change", updateCalculation);
$("reuseRow").addEventListener("change", () => {
  const r = project.rows.find((r) => r.id === $("reuseRow").value);
  if (!r) return;
  const fields = fieldsFor($("preset").value, $("outputUnit").value);
  const target = fields.find(
    ([k, , kind = "m"]) =>
      (kind === "result" && r.result.unit === $("outputUnit").value) ||
      (kind === "m²" && r.result.unit === "m²") ||
      (kind === "m³" && r.result.unit === "m³") ||
      (k === "L" && r.result.unit === "m"),
  );
  if (!target) {
    toast(
      "Choisis un ouvrage qui accepte cette unité en donnée d’entrée (ex. une surface reprise).",
    );
    return;
  }
  const value =
    r.result.unit === "m"
      ? r.result.total / { m: 1, cm: 0.01, mm: 0.001 }[$("dimensionUnit").value]
      : r.result.total;
  $("dim-" + target[0]).value = String(value).replace(".", ",");
  $("report").value = r.code || r.rowNumber || r.label.slice(0, 80);
  updateCalculation();
});
$("dimensionUnit").addEventListener("change", () => {
  // Preserve the physical size when switching units.
  const factors = { m: 1, cm: 0.01, mm: 0.001 },
    next = $("dimensionUnit").value;
  const ratio = factors[previousUnit] / factors[next];
  const convert = (el) => {
    try {
      el.value = String(
        Number(
          (
            evaluateExpression(el.value, previousUnit, project.variables) *
            ratio
          ).toPrecision(14),
        ),
      ).replace(".", ",");
    } catch {}
  };
  fieldsFor($("preset").value, $("outputUnit").value)
    .filter((f) => (f[2] ?? "m") === "m")
    .forEach(([key]) => convert($("dim-" + key)));
  document
    .querySelectorAll('#openings [data-field="w"], #openings [data-field="h"]')
    .forEach(convert);
  fieldsFor($("preset").value, $("outputUnit").value)
    .filter((f) => (f[2] ?? "m") === "m")
    .forEach(
      ([key]) => ($("dim-" + key).nextElementSibling.textContent = next),
    );
  previousUnit = next;
  updateCalculation();
});
$("calcForm").addEventListener("input", updateCalculation);
$("addOpening").addEventListener("click", () => {
  const factor = { m: 1, cm: 100, mm: 1000 }[$("dimensionUnit").value];
  if ($("openings").children.length >= 100) {
    toast("Maximum 100 types d’ouvertures.");
    return;
  }
  opening({ w: String(1.2 * factor), h: String(factor), n: "1" });
  updateCalculation();
});
$("resetCalc").addEventListener("click", () => {
  resetForm();
  previousUnit = "m";
});
$("cancelEdit").addEventListener("click", () => {
  resetForm();
  previousUnit = "m";
});
$("calcForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (proApi?.isReadOnly()) return;
  updateCalculation();
  if (!latest) return;
  if (!$("label").value.trim()) {
    $("calcError").textContent =
      "Ajoute une désignation pour repérer cette ligne.";
    $("calcError").hidden = false;
    document.querySelector(".assignment").open = true;
    $("label").focus();
    return;
  }
  if (!editId && project.rows.length >= 2000) {
    toast("Maximum 2 000 lignes : démarre un nouveau projet.");
    return;
  }
  const row = {
    ...(project.rows.find((r) => r.id === editId) || {}),
    bpuId: currentBpuId,
    building: $("building").value.trim(),
    level: $("level").value.trim(),
    room: $("room").value.trim(),
    id: editId || crypto.randomUUID(),
    rowNumber: $("rowNumber").value.trim(),
    code: $("code").value.trim(),
    report: $("report").value.trim(),
    unitPrice: parseUnitPrice($("unitPrice").value),
    label: $("label").value.trim(),
    lot: $("lot").value.trim() || "Sans lot",
    location: $("location").value.trim(),
    input: inputState(),
    result: latest,
  };
  try {
    const editing = !!editId;
    if (editing) updateRow(editId, (next) => Object.assign(next, row));
    else commitProject(insertProjectRows(project, [row]));
    if (editing) resetForm();
    else for (const key of ["rowNumber", "code", "report"]) $(key).value = "";
    toast(editing ? "Ligne mise à jour." : "Ligne ajoutée à l’avant-métré.");
  } catch (e) {
    toast(e.message);
  }
});
function editRow(id) {
  const row = project.rows.find((r) => r.id === id);
  if (!row || proApi?.isReadOnly()) return;
  showView("calculator");
  editId = row.id;
  currentMeasurement = row.input.planMeasurement || null;
  currentPlanLink = row.input.planLink || null;
  currentBpuId = row.bpuId || null;
  catalogueOptions(row.input.preset);
  $("preset").value = row.input.preset;
  setUnits(row.input.preset, row.input.outputUnit);
  $("basis").value = row.input.basis || "libre";
  $("dimensionUnit").value = row.input.dimensionUnit;
  previousUnit = row.input.dimensionUnit;
  renderFields(row.input.dimensions);
  $('measurementProfile').value=row.input.measurementProfile || defaultProfile(row.input.preset);
  $("count").value = row.input.count;
  $("deduction").value = row.input.deduction;
  $("openings").replaceChildren();
  (row.input.openings ?? []).forEach(opening);
  for (const key of [
    "rowNumber",
    "code",
    "report",
    "label",
    "lot",
    "location",
    "building",
    "level",
    "room",
  ])
    $(key).value = row[key] ?? "";
  $("unitPrice").value =
    row.unitPrice === null || row.unitPrice === undefined
      ? ""
      : String(row.unitPrice).replace(".", ",");
  $("calcTitle").textContent = "Modifier un ouvrage";
  $("addRow").textContent = "Enregistrer la modification";
  $("cancelEdit").hidden = false;
  document.querySelector(".assignment").open = true;
  updateCalculation();
  document
    .querySelector(".calculator")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}
$("rows").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const row = project.rows.find((r) => r.id === btn.dataset.id);
  if (!row) return;
  if (btn.dataset.action === "plan") {
    showView("plan");
    const ids = row.input.planLink?.ids;
    const trace = Object.values(project.planWorkspace?.pages || {})
      .flatMap((p) => p.traces)
      .find((t) =>
        ids ? ids.includes(t.id) : t.purpose === row.input.planLink?.purpose,
      );
    if (trace) planApi.focusTrace(trace.id);
    return;
  }
  if (proApi?.isReadOnly()) return;
  if (btn.dataset.action === "delete") {
    if (
      !(await confirmAction(
        "Supprimer cette ligne ?",
        `« ${row.label} » sera retiré de l’avant-métré.`,
      ))
    )
      return;
    commitProject({
      ...project,
      rows: project.rows.filter((r) => r.id !== row.id),
      approval: null,
    });
    if (editId === row.id) resetForm();
    toast("Ligne supprimée.");
  } else editRow(row.id);
});
$("projectTitle").addEventListener("input", () => { const next={...project,title:$("projectTitle").value.trim()||"Mon projet"};actionHistory.record(project,next,"title");project=next;persist();notifyProject(); });
$("backup").addEventListener("click", async () => {
 try{
  persist();
  download(
    await encodeProjectArchive(project,async(id,remote)=>{let blob=await localStore.getAsset(id);if(!blob&&remote)blob=await proApi.loadAsset(remote);return blob;}),
    `${fileBase()}_sauvegarde.json`,
    "application/json",
  );
  toast("Sauvegarde complète téléchargée.");
 }catch(e){toast(e.message);}
});
$("csv").addEventListener("click", () => {
  if (!project.rows.length) return;
  persist();
  const records = takeoffRecords(project);
  download(
    "\uFEFF" + records.map((r) => r.map(csvValue).join(";")).join("\r\n"),
    `${fileBase()}_avant_metre.csv`,
    "text/csv;charset=utf-8",
  );
  toast("Avant-métré CSV téléchargé (séparateur point-virgule).");
});
$("print").addEventListener("click", () => {
  persist();
  const title = document.title;
  document.title = `Avant-métré — ${project.title}`;
  window.print();
  document.title = title;
});
$("importButton").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > ARCHIVE_LIMIT)
      throw new Error("Fichier trop volumineux (maximum 60 Mio).");
    const archive=decodeProjectArchive(await file.text());
    const next = upgradeProject(archive.project);
    if (
      project.rows.length &&
      !(await confirmAction(
        "Ouvrir une sauvegarde ?",
        `Le projet courant sera remplacé par « ${next.title} » (${next.rows.length} ligne${next.rows.length > 1 ? "s" : ""}). Télécharge d’abord une sauvegarde si tu souhaites le conserver.`,
      ))
    )
      return;
    await localProjectLibrary.flush();
    for(const asset of archive.assets)await localStore.putAsset(asset.id,asset.blob);
    const id = archive.complete?null:project.cloudId,
      version = archive.complete?0:project.cloudVersion;
    replaceProject({
      ...next,
      cloudId: id,
      cloudVersion: version,
      approval: null,
    });
    persist();
    toast("Projet ouvert. Les calculs ont été revérifiés.");
  } catch (error) {
    toast(
      error instanceof SyntaxError
        ? "Ce fichier JSON est illisible."
        : error.message,
    );
  } finally {
    e.target.value = "";
  }
});
$("newProject").addEventListener("click", () =>
  proApi.createProject().catch((e) => toast(e.message)),
);
$("example").addEventListener("click", () => {
  resetForm("mur");
  previousUnit = "m";
  opening({ w: "1,2", h: "1", n: "1" });
  $("label").value = "Enduit intérieur — mur avec fenêtre";
  $("measurementProfile").value="plaster";
  $("location").value = "RDC · séjour";
  document.querySelector(".assignment").open = true;
  updateCalculation();
  document
    .querySelector(".calculator")
    .scrollIntoView({ behavior: "smooth", block: "start" });
});
try {
  const saved = await localStore.load();
  if (saved) project = upgradeProject(saved);
  else {
    const legacy = DEMO_MODE ? null : localStorage.getItem(KEY);
    if (legacy) {
      project = upgradeProject(await localStore.parse(legacy));
      saveLocal({ replace: true });
      await localStore.flush();
      localStorage.removeItem(KEY);
    }
  }
} catch (error) {
  storageOK = false;
  $("saveStatus").textContent = "Sauvegarde locale indisponible";
  toast(error.message);
}
$("projectTitle").value = project.title;
renderRows();
resetForm();

function showView(view) {
  currentView=view;
  document.body.dataset.view=view;
  const isCalc = view === "calculator",
    isPlan = view === "plan", isUX=['professional','import','norms','manual','needs','prices','tutorial'].includes(view);
  $("calculatorWorkspace").hidden = !isCalc;
  $("planWorkspace").hidden = !isPlan;
  $("proWorkspace").hidden = isCalc || isPlan || isUX;
  $('uxWorkspace').hidden=!isUX;
  document.querySelectorAll(".work-tabs button").forEach((b) => {
    const active =
      b.id === "showCalculator"
        ? isCalc
        : b.id === "showPlan"
          ? isPlan
          : b.dataset.proView === view;
    b.classList.toggle("tab-active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  if (isCalc) {
    renderReuseOptions();
    takeoffView.refresh();
  }
  if (!isCalc && !isPlan && !isUX) proApi?.show(view);
  document.dispatchEvent(new CustomEvent('atelier:view',{detail:{view}}));
}
function commitProject(next,historyKey='') {
  actionHistory.record(project,next,historyKey);
  project = next;
  persist();
  renderRows();
  if (!$("calculatorWorkspace").hidden) updateCalculation();
  notifyProject();
  return project;
}
function updateProject(mutator) {
  if (proApi?.isReadOnly()) throw new Error("Ce projet est en consultation.");
  return commitProject(updateWholeProject(project, mutator));
}
function updateRow(id, mutator) {
  if (proApi?.isReadOnly()) throw new Error("Ce projet est en consultation.");
  return commitProject(patchProjectRow(project, id, mutator),'row:'+id+':'+(document.activeElement?.dataset.minuteField||'form'));
}
function replaceProject(next) {
  actionHistory.clear();
  project = upgradeProject(next);
  $("projectTitle").value = project.title;
  planApi?.loadState(project.planWorkspace);
  saveLocal({ replace: true });
  renderRows();
  resetForm();
  if (!$("proWorkspace").hidden) proApi?.show();
  notifyProject({reset:true});
}
function refreshCountry() {
  for(const button of document.querySelectorAll('[data-country]')) {
    button.setAttribute('aria-pressed',String(button.dataset.country===project.country));
    button.disabled=countryBusy || !!proApi?.isReadOnly();
  }
  $('countryStatus').textContent=project.country==='luxembourg'
    ? 'Luxembourg · CTG selon corps d’état · lots01–02 adaptés · vérification13/11/2026'
    : 'France · géométrie nette pédagogique · règle de décompte à préciser au marché';
}
function crossData() {
  if(!crossDataPromise)crossDataPromise=Promise.all([...['cctp-library.json','cctp-sources.json','cctp-fr-lu.json'].map(name=>fetch('/data/'+name).then(r=>{if(!r.ok)throw new Error('Bibliothèque FR/LU indisponible.');return r.json();})),loadNormativeIndex()]).catch(e=>{crossDataPromise=null;throw e;});
  return crossDataPromise;
}
for(const button of document.querySelectorAll('[data-country]'))button.addEventListener('click',async()=>{
  if(countryBusy || proApi?.isReadOnly() || button.dataset.country===project.country)return;
  countryBusy=true;refreshCountry();
  try {
    const [data,proofs,countries,normative]=await crossData(), country=button.dataset.country;
    const raw=catalogueIndex(data,proofs);
    const oldCatalogue=decorateNormativeCatalogue(countryCatalogue(raw,countries,project.country),normative,project.country);
    const previous=adoptCountryCctp(adoptNormativeCctp(project.cctp,oldCatalogue,project.country),project.country,oldCatalogue);
    const catalogue=decorateNormativeCatalogue(countryCatalogue(raw,countries,country),normative,country);
    const cctp=adoptNormativeCctp(switchCountryCctp(previous,country,catalogue,project.country),catalogue,country);
    // Transaction globale explicite ; une frappe dans une cellule ne recalcule
    // toujours que cette ligne, sans reconstruire le plan ni la bibliothèque.
    commitProject(recalculateProject({...project,country,cctp,approval:null}));
    if(!$('proWorkspace').hidden)proApi?.show();
    toast(`Mode ${COUNTRIES[country]} : quantités recalculées et descriptifs adaptés. Les textes de chaque pays sont conservés.`);
  }catch(e){toast(e.message);}finally{countryBusy=false;refreshCountry();}
});
$("showCalculator").addEventListener("click", () => showView("calculator"));
loadNormativeIndex().then(refreshNormativeWarning).catch(e=>{const box=$('normativeVigilance');if(box)box.textContent=e.message+' Les calculs restent géométriques ; vérifier les références avant émission.';});
$("showPlan").addEventListener("click", () => showView("plan"));
$("rowBpu").addEventListener("change", () => {
  const b = project.bpu.find((b) => b.id === $("rowBpu").value);
  if (!b) return;
  resetForm("reprise");
  setUnits("reprise", b.unit);
  renderFields({ Q: String(b.quantity || 0) });
  $("rowBpu").value = b.id;
  currentBpuId = b.id;
  $("label").value = b.label;
  $("lot").value = b.lot;
  $("rowNumber").value = b.code;
  $("unitPrice").value = b.unitPrice ?? "";
  updateCalculation();
});
if (DEMO_MODE) {
  document.body.dataset.demo = 'true';
  const banner = document.createElement('aside');
  banner.className = 'demo-banner'; banner.dataset.tour='demo-banner';
  banner.innerHTML = '<strong>DÉMONSTRATION · GARAGE 6 × 4 m</strong><span>Données fictives en mémoire. Tes chantiers enregistrés restent intacts. Actualiser réinitialise cet essai.</span><a href="/">Quitter la démo</a>';
  document.querySelector('main').prepend(banner);
  $('saveStatus').textContent='Démo · modifications temporaires';
  document.querySelector('.page-footer')?.replaceChildren(document.createTextNode('Démonstration temporaire · données fictives · aucune synchronisation.'));
  try {
    const response = await fetch('/demo-plan.png');
    if (!response.ok) throw new Error('Plan pédagogique indisponible.');
    await localStore.putAsset('demo-garage-plan',new File([await response.blob()],'Garage-pedagogique.png',{type:'image/png'}));
  } catch(e) { toast(e.message); }
}
planApi = initPlan({
  workspace: $("planWorkspace"),
  state: project.planWorkspace,
  getLots:()=>project.lots,
  getProject:()=>project,
  onInjectTrace:trace=>{
    if(proApi?.isReadOnly())throw new Error('Projet en consultation.');
    if(project.rows.some(r=>r.input.planLink?.ids?.includes(trace.id)&&r.label===trace.label))throw new Error('Ce relevé est déjà injecté avec cette désignation.');
    const row=professionalTraceRow(trace,project.planWorkspace?.fileName||'Plan',crypto.randomUUID());
    const next=insertProjectRows(project,[row]);if(!next.lots.includes(row.lot))next.lots=[...next.lots,row.lot];commitProject(next);toast('Mesure injectée et liée à la minute professionnelle.');
  },
  onChange: (state, change) => {
    try {
      const next=patchProjectPlan(project, state, change);
      if(change?.geometry||change?.all||change?.traceIds?.length) actionHistory.record(project,next);
      project = next;
      persist();
      if (change?.all || change?.traceIds?.length || change?.purposes?.length) {
        renderRows();
        if (!$("calculatorWorkspace").hidden) updateCalculation();
      }
      notifyProject();
    } catch (error) {
      toast(error.message);
      throw error;
    }
  },
  putAsset: (key, blob) => localStore.putAsset(key, blob),
  getAsset: (key) => localStore.getAsset(key),
  onUse: (key, unit, dimensions, proof) => {
    resetForm(key);
    setUnits(key, unit);
    renderFields({ ...PRESETS[key].defaults, ...dimensions });
    $("rowNumber").value = PRESETS[key].article || "";
    currentMeasurement = proof;
    if (proof.traceIds?.length)
      currentPlanLink = { ids: proof.traceIds, field: proof.field };
    $("report").value = proof.label;
    $("basis").value = proof.unit === "m²" ? "HO" : "axes";
    updateCalculation();
    showView("calculator");
    document
      .querySelector(".calculator")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  },
  onAdd: (rows) => {
    if (project.rows.length + rows.length > 2000) {
      toast("Le projet dépasserait 2 000 lignes.");
      return false;
    }
    try {
      commitProject(insertProjectRows(project, rows));
      showView("calculator");
      toast(`${rows.length} articles ajoutés à l’avant-métré.`);
      return true;
    } catch (e) {
      toast(e.message);
      return false;
    }
  },
  saveAsset: (file) => proApi?.saveAsset(file),
  loadAsset: (aid) => proApi?.loadAsset(aid),
  beforeRemove: (id) => {
    const t = Object.values(project.planWorkspace?.pages || {})
      .flatMap((p) => p.traces)
      .find((t) => t.id === id);
    const linked = project.rows.some((r) => {
      const l = r.input.planLink;
      return (
        l &&
        (l.terms || [l]).some((term) =>
          term.ids ? term.ids.includes(id) : term.purpose === t?.purpose,
        )
      );
    });
    if (linked)
      toast("Détache d’abord les lignes liées à ce relevé dans la minute.");
    return !linked;
  },
  toast,
  confirm: confirmAction,
});
proApi = initPro({
  get: () => project,
  clearHistory:()=>{actionHistory.clear();notifyProject();},
  update: updateProject,
  setCctp: (cctp) => {
    if(proApi?.isReadOnly()) throw new Error("Ce projet est en consultation.");
    if(cctp.articles.length>500) throw new Error("CCTP limité à 500 articles.");
    const next={...project,cctp,approval:null};actionHistory.record(project,next,'cctp');project=next;
    persist(); // Aucun recalcul ni reconstruction de la minute pour une clause.
    notifyProject();
  },
  updateRow,
  encode: (project) => localStore.encode(project),
  replace: replaceProject,
  showView,
  editRow,
  useRatio: (value) => {
    resetForm("aciers_semelles");
    $("dim-rho").value = value;
    updateCalculation();
    showView("calculator");
  },
  refreshCalculation: updateCalculation,
  syncFields: (fields) => {
    project={...project,...fields};
    saveLocal();
    notifyProject();
  },
  syncPlan: () => planApi?.syncAsset(),
  setPlanReadOnly: (value) => planApi?.setReadOnly(value),
  confirm: confirmAction,
  toast,
});
renderRows();

// L'îlot React ne possède ni les 500 lignes ni les points du plan. Le pont
// n'expose que des transactions ; un changement de cellule reste local au DOM.
const uxStyles=document.createElement('link');uxStyles.rel='stylesheet';uxStyles.href='/ux/atelier.css';document.head.append(uxStyles);
import('/ux/atelier.js').then(({mountAtelier})=>mountAtelier({
  get:()=>project,readOnly:()=>!!proApi?.isReadOnly(),showView,toast,
  editProfessionalLegacy:editRow,
  localProjects:{list:()=>localProjectLibrary.list(),save:()=>localProjectLibrary.flush(),create:async()=>{if(proApi?.isReadOnly())throw Error('Projet en consultation.');await localProjectLibrary.flush();replaceProject(upgradeProject({version:1,title:'Nouveau chantier local',rows:[]}));},open:async id=>{if(proApi?.isReadOnly())throw Error('Projet en consultation.');const next=await localProjectLibrary.load(id);replaceProject({...next,cloudId:null,cloudVersion:0,approval:null});},export:()=>$('backup').click(),import:()=>$('importButton').click()},
  duplicateProfessionalRow:id=>{if(proApi?.isReadOnly())throw Error('Projet en consultation.');const source=project.rows.find(r=>r.id===id);if(!source)throw Error('Ligne introuvable.');const copy=structuredClone(source);copy.id=crypto.randomUUID();copy.label=(source.label+' · copie').slice(0,200);copy.code='';copy.rowNumber='';delete copy.extensionParentId;delete copy.extensionTemplateId;delete copy.cctpArticle;return commitProject(insertProjectRows(project,[copy]));},
  vision:{get:()=>planApi?.visionState(),capture:()=>planApi?.captureVision(),save:(key,result)=>planApi?.saveVision(key,result)},
  generateExtensionChildren:(id,template)=>{if(proApi?.isReadOnly())throw new Error('Projet en consultation.');const parent=project.rows.find(r=>r.id===id);if(!parent)throw new Error('Ouvrage parent absent.');if(project.rows.some(r=>r.extensionParentId===id&&r.extensionTemplateId===template.id))throw new Error('Cette extension a déjà généré ses sous-ouvrages. Supprimez ses lignes filles avant de la générer à nouveau.');const children=extensionChildRows(parent,template);let next=insertProjectRows(project,children);const ids=new Set(children.map(r=>r.id));const rows=next.rows.filter(r=>!ids.has(r.id));rows.splice(rows.findIndex(r=>r.id===id)+1,0,...next.rows.filter(r=>ids.has(r.id)));next={...next,rows};commitProject(next);return children.length;},
  applyTradeExtension:(id,template)=>updateRow(id,r=>{const t=validateExtension(template);extensionResults(r,t);const list=r.tradeExtensions||[],index=list.findIndex(v=>v.id===t.id);if(index<0&&list.length>=20)throw new Error('Maximum 20 extensions par ouvrage.');r.tradeExtensions=index<0?[...list,t]:list.map((v,i)=>i===index?t:v);}),
  removeTradeExtension:(id,templateId)=>updateRow(id,r=>{r.tradeExtensions=(r.tradeExtensions||[]).filter(t=>t.id!==templateId);}),
  setMeasurementSlope:(id,slope)=>{slopeInfo(slope);return updateRow(id,r=>{if(slope.enabled)r.input.slope={enabled:true,mode:slope.mode==='degrees'?'degrees':'percent',value:String(slope.value)};else delete r.input.slope;});},
  addMeasurementModel:model=>{if(proApi?.isReadOnly())throw new Error('Projet en consultation.');const m=validateMeasurementModel(model),next=insertProjectRows(project,[{id:crypto.randomUUID(),label:m.name,lot:m.lot,workColor:m.color,level:'',room:'',location:'',rowNumber:'',code:'',unitPrice:null,input:m.input}]);if(!next.lots.includes(m.lot))next.lots=[...next.lots,m.lot];return commitProject(next);},
  saveRowCctp:(id,article,expectedFingerprint)=>{if(proApi?.isReadOnly())throw new Error('Ce projet est en consultation.');return commitProject(saveCctpToProject(project,id,article,expectedFingerprint));},
  saveProfessionalRow:(row,{allowMigration=false}={})=>{
    if(proApi?.isReadOnly())throw new Error('Projet en consultation.');
    if(row.input?.preset!=='minute-pro')throw new Error('Type de minute professionnelle requis.');
    const previous=project.rows.find(r=>r.id===row.id);
    if(previous&&previous.input.preset!=='minute-pro'&&!(allowMigration&&row.input.dynamicMinute&&row.previousMinute))throw new Error('Une ancienne minute ne peut pas être convertie implicitement.');
    const next=previous?patchProjectRow(project,row.id,r=>Object.assign(r,row)):insertProjectRows(project,[row]);
    if(!next.lots.includes(row.lot))next.lots=[...next.lots,row.lot];commitProject(next);
  },
  setProfessionalMeta:(id,patch)=>{
    if(proApi?.isReadOnly())throw new Error('Projet en consultation.');
    const allowed={};for(const key of ['level','room','location'])if(key in patch)allowed[key]=String(patch[key]).slice(0,80);
    if('workColor' in patch){if(!/^#[0-9a-f]{6}$/i.test(patch.workColor))throw new Error('Couleur invalide.');allowed.workColor=patch.workColor;}
    const next=patchProjectRow(project,id,r=>Object.assign(r,allowed));const row=next.rows.find(r=>r.id===id),ids=row.input.planLink?.ids||[];
    if(ids.length&&next.planWorkspace){next.planWorkspace=structuredClone(next.planWorkspace);for(const page of Object.values(next.planWorkspace.pages||{}))for(const t of page.traces||[])if(ids.includes(t.id)){t.workColor=workColor(row);t.level=row.level;t.zone=row.room||row.location;}}
    commitProject(next);if(ids.length)planApi?.loadState(next.planWorkspace);
  },
  history:()=>actionHistory.state(),
  isDirector:()=>!!proApi?.isDirector(),
  updatePricingSettings:patch=>{if(proApi?.isReadOnly())throw new Error('Projet en consultation.');const protectedKeys=['sellMode','k','overhead','risk','margin','profitRisk'];if(!proApi?.isDirector()&&Object.keys(patch).some(k=>protectedKeys.includes(k)))throw new Error('Coefficients réservés au dirigeant.');updateProject(next=>{Object.assign(next.settings,patch);});},
  updatePriceRow:(id,patch)=>updateRow(id,row=>{if(patch.costs&&!proApi?.isDirector()&&(row.costs?.kOverride??null)!==(patch.costs.kOverride??null))throw new Error('K spécifique réservé au dirigeant.');Object.assign(row,patch);}),
  approvePricing:()=>proApi.approvePricing(),
  exportPricing:async(snapshot,format)=>{if(proApi?.isReadOnly())throw new Error('Chiffrage réservé au métreur et au dirigeant.');const {exportPricing}=await import('./pricing-exports.js');return exportPricing(snapshot,format);},
  assignAssembly:(id,assemblyId)=>updateRow(id,row=>{row.assemblyId=assemblyId||null;}),
  addAssembly:assembly=>updateProject(next=>{next.assemblies.push(assembly);}),
  exportProcurement:async(snapshot,options,format)=>{const {exportProcurement}=await import('./procurement-exports.js');return exportProcurement(snapshot,options,format);},
  plan:{setTool:mode=>planApi?.setTool(mode),undoDraft:()=>planApi?.undoDraft()||false,redoDraft:()=>planApi?.redoDraft()||false},
  undo:(redo=false)=>{
    if(proApi?.isReadOnly())return;
    const next=redo?actionHistory.redo(project):actionHistory.undo(project);if(!next){toast('Aucune action à '+(redo?'rétablir.':'annuler.'));return;}
    const oldPlan=project.planWorkspace;
    // Les versions cloud sont des métadonnées de synchronisation, pas des
    // actions du métreur : l'annulation conserve le numéro courant.
    project={...next,cloudId:project.cloudId,cloudVersion:project.cloudVersion,draftDirty:project.draftDirty,approval:null};
    $('projectTitle').value=project.title;persist();renderRows();
    if(oldPlan!==project.planWorkspace)planApi?.loadState(project.planWorkspace);
    if(!$('proWorkspace').hidden)proApi?.show(currentView);
    if(!$('calculatorWorkspace').hidden)updateCalculation();
    notifyProject({reset:true});toast(redo?'Action rétablie.':'Action annulée.');
  },
  updateCell:(id,key,value)=>updateRow(id,row=>{if(row.input.planLink?.field===key)throw new Error('Détache la ligne du plan avant de modifier cette dimension.');if(['count','deduction'].includes(key))row.input[key]=value;else row.input.dimensions[key]=value;}),
  rule:row=>project.country==='france'?(calculatorNormativeProfile(row.input.preset,normativeIndex)?.alerte_interface_site||'Règle du marché à préciser ; aucune déduction DTU présumée.'):'Quantité selon le profil Luxembourg choisi dans la fiche ; contrôler les conditions du marché. Une quantité BIM importée n’est pas déduite une seconde fois.',
  loadLibrary:async()=>{const [data,proofs,countries,normative]=await crossData();return {data,catalogue:decorateNormativeCatalogue(countryCatalogue(catalogueIndex(data,proofs),countries,project.country),normative,project.country)};},
  insertFormula:({expression,unit,title,lot,replaceId})=>{
    if(proApi?.isReadOnly())throw new Error('Ce projet est en consultation.');
    if(replaceId)updateRow(replaceId,r=>{r.input.dimensions.Q=expression;});
    else commitProject(insertProjectRows(project,[{id:crypto.randomUUID(),rowNumber:'',code:'',label:title,lot,report:'Assistant géométrique',location:'',unitPrice:null,input:{preset:'reprise',dimensionUnit:'m',outputUnit:unit,basis:'libre',dimensions:{Q:expression},count:'1',deduction:'0',openings:[]}}]));
    toast(replaceId?'Quantité active mise à jour.':'Ligne calculée ajoutée à la minute.');
  },
  addAssistantPost:poste=>{
    if(proApi?.isReadOnly())throw new Error('Ce projet est en consultation.');
    // Revalider au moment de la transaction, même si le bouton était actif.
    const row=preparerLigneAssistant(poste,project.rows);
    const next=insertProjectRows(project,[row]);
    if(!next.lots.includes(row.lot))next.lots=[...next.lots,row.lot];
    commitProject(next);
    toast('Poste validé ajouté à la minute.');
    return row;
  },
  inject:async(rows)=>{
    if(proApi?.isReadOnly())throw new Error('Ce projet est en consultation.');
    const [data,proofs,countries,normative]=await crossData();const catalogue=decorateNormativeCatalogue(countryCatalogue(catalogueIndex(data,proofs),countries,project.country),normative,project.country);
    if(rows.some(r=>project.rows.some(p=>p.importSource?.file===r.importSource?.file&&p.importSource?.measure===r.importSource?.measure&&p.importSource?.groupKey===r.importSource?.groupKey)))throw new Error('Un groupe identique de ce fichier existe déjà dans le projet. Vérifie la minute avant de réimporter.');
    const next=insertProjectRows(project,rows);
    next.cctp=importMinute(project.cctp,rows,catalogue);
    commitProject(next); // Quantités et CCTP validés ensemble ; aucune mutation partielle.
  },
})).catch(e=>toast('Interface complémentaire indisponible : '+e.message));

// On ne bloque jamais une frappe pour écrire. La fermeture/masquage déclenche
// le flush asynchrone et l'indicateur ne passe au vert qu'après commit IDB.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) localStore.flush().catch(() => {});
});
window.addEventListener("pagehide", () => localStore.flush().catch(() => {}));
window.addEventListener("beforeunload", (event) => {
  if (localStore.hasPending()) {
    event.preventDefault();
    event.returnValue = "";
  }
});
let printedTakeoff = false;
window.addEventListener("beforeprint", () => {
  // Le manuel s'imprime seul, sans matérialiser les centaines de lignes du métré.
  if (["manual","tutorial"].includes(currentView)) return;
  takeoffView.print(true);
  printedTakeoff = true;
});
window.addEventListener("afterprint", () => {
  if (printedTakeoff) takeoffView.print(false);
  printedTakeoff = false;
});
