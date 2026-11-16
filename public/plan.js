import {validateVisionResult} from './vision-model.js';
import { DEMO_MODE } from './demo-mode.js';
import { createPlanRenderer, orthogonalPoint } from "./plan-renderer.js";
import { lotColor } from './lot-colors.js';
import { workColor } from './professional-core.js';
import {premiumProperties} from './premium-metre.js';
import { PRESETS, fieldsFor, unitsFor, number, fmt } from "./core.js";
import { importCad } from "./cad.js";
import { measureGeometry, calibration, buildPlanBatch } from "./plan-core.js";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const PURPOSES = {
  emprise: "Emprise terrassement (m²)",
  fondations: "Fondations (m)",
  soubassements: "Soubassements (m)",
  dallage: "Dallage (m²)",
  maconnerie: "Maçonneries en élévation (m)",
  drainage: "Drainage extérieur (m)",
  comptage: "Comptage d’équipements (u)",
  autre: "Autre relevé",
};
function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("atelier-metre-plans", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        new Error("Conservation du plan indisponible dans ce navigateur."),
      );
  });
}
async function asset(key, file) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("files", file ? "readwrite" : "readonly"),
      store = tx.objectStore("files");
    const r = file ? store.put(file, key) : store.get(key);
    r.onsuccess = () => {
      const result = r.result;
      tx.oncomplete = () => {
        d.close();
        resolve(result);
      };
    };
    r.onerror = () => {
      d.close();
      reject(r.error);
    };
  });
}
const paramDefs = [
  ["decapage", "Décapage — épaisseur (m)", "0,20"],
  [
    "plateforme",
    "Excavation plate-forme — profondeur après décapage (m)",
    "0,20",
  ],
  ["largeurRigole", "Rigoles — largeur (m)", "0,50"],
  ["profondeurRigole", "Rigoles — profondeur complémentaire (m)", "0,72"],
  ["rigoleCorrection", "Recouvrements à déduire des rigoles (m²)", "0"],
  ["largeurSemelle", "Semelles — largeur (m)", "0,50"],
  ["hauteurSemelle", "Semelles — hauteur (m)", "0,30"],
  ["semelleCorrection", "Recouvrements à déduire des semelles (m²)", "0"],
  ["proprete", "Béton de propreté — épaisseur (m)", "0,05"],
  ["acier", "Aciers semelles — taux estimatif (kg/m³)", "25"],
  ["epaisseurMur", "Soubassements — épaisseur (m)", "0,20"],
  ["hauteurMur", "Soubassements — hauteur (m)", "0,37"],
  ["murCorrection", "Recouvrements à déduire des murs (m²)", "0"],
  ["forme", "Couche de forme — épaisseur (m)", "0,25"],
  ["dalle", "Dallage — épaisseur (m)", "0,14"],
  ["hauteurMac", "Maçonneries en élévation — hauteur (m)", "2,55"],
  ["deductionMac", "Maçonneries — ouvertures et autres déductions (m²)", "0"],
  ["reemploi", "Terres réemployées en place (m³)", "0"],
  ["foisonnement", "Foisonnement — transport uniquement", "1,35"],
];
export function initPlan({
  workspace,
  state,
  getLots=()=>[],
  getProject=()=>({rows:[]}),
  onInjectTrace,
  onChange,
  onUse,
  onAdd,
  toast,
  confirm,
  saveAsset,
  loadAsset,
  beforeRemove,
  putAsset,
  getAsset,
}) {
  const $ = (id) => workspace.querySelector("#" + id);
  let data = null,
    image = null,
    pdf = null,
    file = null,
    mode = "calibrate",
    pending = [],
    draftRedo = [],
    prepared = [],
    sequence = 0,
    cadImage = null,
    readOnly = false,
    uploading = false,
    accepted = null;
  let importGeneration = 0;
  let geometryVersion = 0,
    paintedVersion = -1,
    paintedPage = null,
    busy = false,
    cursor = null,
    drag = null,
    pointerFrame = 0,
    lastPointer = null,
    renderTask = null,
    cadAbort = null;
  const pageCache = new Map();
  workspace.innerHTML = `<div class="plan-intro"><div><p class="eyebrow">DU PLAN À L’AVANT-MÉTRÉ</p><h2>Relever, vérifier, quantifier.</h2><p>Importe ton plan, étalonne une cote connue, puis trace les longueurs et les emprises. Les hauteurs et profondeurs viennent des coupes.</p></div><button data-tour="plan-import" id="planUpload" class="primary">↑ Importer PDF / DWG / DXF / image</button><input id="planFile" type="file" accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.webp" hidden></div>
  <p id="cadNotice" class="cad-notice" hidden></p><p class="plan-privacy">Le plan est traité dans ce navigateur et rejoint le projet privé lorsque l’enregistrement en ligne est actif. Les relevés et paramètres sont aussi inclus dans la sauvegarde JSON.</p>
  <div id="planError" class="error" role="alert" hidden></div>
  <div class="plan-layout"><section class="panel plan-viewer"><div class="plan-toolbar"><strong id="planName">Aucun plan importé</strong><label>Page<select id="planPage" disabled><option>1</option></select></label><label>Nom de la page<input id="planPageName" maxlength="100" placeholder="RDC, R+1, Toiture…"></label><button id="savePlanPageName" class="secondary">Nommer la page</button><label>Zoom<select id="planZoom"><option value="1">Ajuster</option><option value="1.5">150 %</option><option value="2">200 %</option><option value="3">300 %</option></select></label></div>
  <div id="planVisionControls"></div><div class="plan-tools" role="group" aria-label="Outil de relevé"><button data-tour="plan-calibrate" id="toolCalibrate" class="secondary active-tool">1 · Étalonner</button><button data-tour="plan-line" id="toolLength" class="secondary">2 · Linéaire</button><button data-tour="plan-area" id="toolArea" class="secondary">2 · Surface</button><button data-tour="plan-count" id="toolCount" class="secondary">2 · Comptage</button><button id="toolSelect" class="secondary">Sélection / sommets</button><button id="undoPoint" class="quiet">Annuler un point</button></div>
  <p id="planInstruction" class="plan-instruction" role="status">Importe un PDF, une photo ou une image du plan coté.</p>
  <div class="canvas-scroll"><div id="planStack" class="plan-stack"><canvas id="planBackground" width="1200" height="750" aria-hidden="true"></canvas><canvas id="planVectors" width="1200" height="750" aria-hidden="true"></canvas><canvas data-tour="plan-canvas" id="planCanvas" width="1200" height="750" role="img" tabindex="0" aria-label="Plan et tracés : Echap annule, Maj verrouille les segments à 90 degrés"></canvas><div id="planVisionOverlay"></div></div><div id="planEmpty" class="plan-empty"><b>Ton plan coté, au centre du travail.</b><span>PDF multipage, DWG, DXF, PNG, JPEG ou WebP · 35 Mo maximum</span><button id="planDemo" class="secondary">Essayer sur un plan d’exemple</button></div></div>
  <p class="hint" style="padding:0 17px">Raccourcis : <b>Échap</b> annule le tracé, <b>Maj</b> verrouille le segment à 90°. « Sélection / sommets » permet de déplacer un point. Les mesures au tracé sont estimatives : contrôle l’échelle sur une seconde cote et privilégie les cotes écrites. Angles, jonctions, ouvertures et vides sont à vérifier.</p><div class="plan-calibration"><label>Cote réelle entre les deux points (m)<input data-tour="plan-reference" id="referenceLength" inputmode="decimal" value="10"></label><button data-tour="plan-validate-scale" id="validateScale" class="secondary">Valider l’échelle</button><span id="scaleStatus">Échelle à définir</span></div>
  </section><aside class="plan-side"><div id="planVisionResults"></div><section class="panel plan-card"><h3>Enregistrer le relevé</h3><label>Repère / désignation<input data-tour="plan-trace-label" id="traceLabel" maxlength="80" placeholder="Ex. SF1 · semelles périphériques"></label><label>Affectation<select id="tracePurpose">${Object.entries(
    PURPOSES,
  )
    .map(([k, v]) => `<option value="${k}">${v}</option>`)
    .join(
      "",
    )}</select></label><label>Lot TCE<select id="traceLot"><option value="">Selon l’affectation</option>${getLots().map(l=>`<option value="${esc(l)}">${esc(l)}</option>`).join("")}</select></label><div class="double"><label>Niveau<input id="traceLevel" value="RDC" maxlength="80"></label><label>Zone / pièce<input id="traceZone" maxlength="80" placeholder="Ex. Séjour"></label></div><label>Couleur ouvrage<input id="traceWorkColor" type="color" value="#2563eb"></label><p class="hint">Fondations et soubassements : longueurs développées. Terrassement et dallage : contours fermés.</p><button data-tour="plan-save-trace" id="finishTrace" class="primary">Terminer et enregistrer le tracé</button><details class="manual-trace"><summary>Saisir une cote ou une surface lue sur le plan</summary><div class="double"><label>Valeur retenue<input id="manualValue" inputmode="decimal" placeholder="Ex. 7,31"></label><label>Unité<select id="manualUnit"><option value="m">m</option><option value="m²">m²</option><option value="u">u</option></select></label></div><button id="saveManual" class="secondary">Enregistrer la cote lue</button></details></section>
  <section class="panel plan-card premium-plan-properties"><h3>Propriétés de la mesure sélectionnée</h3><div id="planMeasureProperties"><p>Sélectionnez un relevé.</p></div></section><section class="panel plan-card"><h3>Calculer depuis un relevé</h3><label>Relevé<select id="traceSelect"><option value="">Aucun relevé</option></select></label><label>Ouvrage<select id="traceArticle"></select></label><button data-tour="plan-use-trace" id="useTrace" class="secondary">Utiliser dans le calculateur</button><button id="injectTrace" class="primary">Injecter la mesure dans la minute</button><p class="hint">Le relevé remplit une longueur ou une surface. Vérifie ensuite les autres dimensions et les déductions.</p></section></aside></div>
  <section class="panel traces-panel"><div class="panel-heading"><span class="step-badge">03</span><div><h2>Relevés du plan</h2><p>Une valeur mesurée peut être remplacée par la cote exacte du plan.</p></div></div><div class="plan-table-wrap"><table><thead><tr><th>Page</th><th>Repère</th><th>Affectation</th><th>Mesure au tracé</th><th>Cote / quantité retenue</th><th>Unité</th><th>Action</th></tr></thead><tbody id="traceRows"></tbody></table></div></section>
  <section class="panel batch-panel"><div class="panel-heading"><span class="step-badge">04</span><div><h2>Préparer un ensemble d’ouvrages</h2><p>Terrassement → fondations → soubassements → dallage</p></div></div><div class="batch-body"><p>Les articles proposés dépendent des relevés affectés : emprise, fondations, soubassements, dallage, maçonneries et drainage extérieur. Relève chaque catégorie utile ; la surface de dallage se mesure séparément de l’emprise de terrassement.</p><details><summary>Épaisseurs, niveaux et corrections des intersections</summary><p class="hint">Valeurs de départ issues de tes exercices : à adapter au plan, aux coupes et à la notice. Les aciers sont une estimation par ratio. Les corrections d’angles et de jonctions sont à renseigner explicitement.</p><div class="batch-params">${paramDefs.map(([key, label, value]) => `<label>${label}<input id="param-${key}" value="${value}" inputmode="decimal"></label>`).join("")}</div></details><button id="prepareBatch" class="primary">Préparer les articles à vérifier</button><div id="batchPreview"></div><button id="addBatch" class="primary" hidden>Ajouter les articles cochés à l’avant-métré</button></div></section>`;
  const renderer = createPlanRenderer({
    background: $("planBackground"),
    vectors: $("planVectors"),
    interaction: $("planCanvas"),
  });
  function visionState(){return {key:(data?.assetId||'')+'|'+(data?.page||1),ready:!!image&&!busy&&!!file,page:data?.page||1,fileName:data?.fileName||'',pageName:data?.pages?.[data?.page]?.name||'Page '+(data?.page||1),width:image?.width||0,height:image?.height||0,analysis:data?.pages?.[data?.page]?.vision||null};}
  function notifyVision(kind='page'){document.dispatchEvent(new CustomEvent('atelier:plan-vision',{detail:{kind}}));}
  function captureVision(){if(!image||busy||!file)throw Error('Attendez le chargement du plan.');const state=visionState(),canvas=document.createElement('canvas'),scale=Math.min(1,2400/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);const imageBase64=canvas.toDataURL('image/jpeg',.92);if(imageBase64.length>(document.documentElement.dataset.hostingMode==='vercel'?3.8*1024*1024:11*1024*1024))throw Error('Page trop volumineuse pour la lecture Vision. Utilisez un extrait plus léger.');return {...state,imageBase64};}
  function saveVision(key,result){if(readOnly)throw Error('Projet en consultation.');if(visionState().key!==key||busy||!image)throw Error('La page a changé : relancez la lecture Vision.');const parsed=validateVisionResult(result);pageData().vision={result:parsed,generatedAt:new Date().toISOString(),source:{width:image.width,height:image.height,page:data.page,fileName:data.fileName}};save();notifyVision();}
  async function storedAsset(key, blob) {
    if (blob) {
      if (putAsset) return putAsset(key, blob);
      return asset(key, blob);
    }
    const cached = getAsset ? await getAsset(key) : null;
    if (cached || DEMO_MODE) return cached;
    const old = await asset(key);
    if (old && putAsset) {
      try {
        await putAsset(key, old);
      } catch (reason) {
        toast(
          "Le plan reste lisible, mais sa migration locale a échoué : " +
            reason.message,
        );
      }
    }
    return old;
  }
  const empty = () => ({
    assetId: "",
    fileName: "",
    size: 0,
    page: 1,
    pages: {},
    params: {},
  });
  function error(e) {
    $("planError").textContent = e.message || String(e);
    $("planError").hidden = false;
  }
  function clearError() {
    $("planError").hidden = true;
  }
  function pageData() {
    if (!data) data = empty();
    return (
      data.pages[data.page] ??
      (data.pages[data.page] = {
        scale: 0,
        reference: 0,
        calibration: [],
        traces: [],
      })
    );
  }
  function allTraces() {
    return Object.entries(data?.pages || {}).flatMap(([page, p]) =>
      (p.traces || []).map((t) => ({
        ...t,
        page: Number(page),
        fileName: data.fileName,
        reference: p.reference || 1,
        pageName: p.name || "Page " + page,
        documentId: data.assetId,
      })),
    );
  }
  function save(change = {}) {
    if (readOnly) throw new Error("Ce rôle permet la consultation uniquement.");
    // Le modèle interne reste éditable. Le snapshot publié partage les points
    // immuables et les pages non touchées, sans copie profonde du plan entier.
    const pages = {};
    for (const [key, page] of Object.entries(data.pages)) {
      const old = accepted?.pages?.[key],
        byId = new Map((old?.traces || []).map((t) => [t.id, t]));
      const traces = page.traces.map((trace) => {
        const previous = byId.get(trace.id);
        return previous &&
          Object.keys(trace).every((k) => trace[k] === previous[k])
          ? previous
          : { ...trace };
      });
      const same =
        old &&
        traces.length === old.traces.length &&
        traces.every((t, i) => t === old.traces[i]) &&
        Object.keys(page)
          .filter((k) => k !== "traces")
          .every((k) => page[k] === old[k]);
      pages[key] = same ? old : { ...page, traces };
    }
    const snapshot = {
      ...data,
      pages,
      params: Object.fromEntries(
        paramDefs.map(([key]) => [key, $("param-" + key).value]),
      ),
    };
    try {
      onChange(snapshot, change);
      accepted = snapshot;
      if (change.geometry) geometryVersion++;
    } catch (error) {
      data = accepted ? structuredClone(accepted) : empty();
      geometryVersion++;
      renderTraces();
      draw();
      throw error;
    }
    prepared = [];
    $("batchPreview").replaceChildren();
    $("addBatch").hidden = true;
  }
  function refreshInstruction() {
    const p = pageData();
    $("scaleStatus").textContent = p.scale
      ? `Échelle définie · cote ${fmt(p.reference)} m`
      : "Échelle à définir";
    $("planInstruction").textContent = busy
      ? "Chargement du plan…"
      : !image
        ? "Importe ton plan coté ou utilise l’exemple."
        : busy
          ? "Chargement du plan…"
          : mode === "select"
            ? "Clique un tracé pour le sélectionner ; fais glisser un sommet pour le déplacer. Échap annule."
            : mode === "calibrate"
              ? `${pending.length}/2 points : clique les extrémités d’une cote connue, saisis sa valeur puis valide l’échelle.`
              : !p.scale && mode !== "count"
                ? "Définis d’abord l’échelle ou saisis une cote exacte dans le panneau de droite."
                : `${mode === "area" ? "Contour fermé" : mode === "count" ? "Comptage par clic" : "Linéaire développé"} : ${pending.length} points. Clique les sommets puis termine le tracé.`;
  }
  function draw() {
    const page = pageData();
    renderer.setBackground(image, image?.width || 1200, image?.height || 750);
    if (paintedVersion !== geometryVersion || paintedPage !== data.page) {
      renderer.setTraces(page.traces.slice(), page.calibration);
      paintedVersion = geometryVersion;
      paintedPage = data.page;
    }
    renderer.setInteraction({
      selected: $("traceSelect").value,
      draft: pending.slice(),
      cursor,
      drag,
      kind: mode,
      draftColor:$("traceWorkColor").value||lotColor($("traceLot").value||$("tracePurpose").value).color,
    });
    refreshInstruction();
  }
  function setMode(next) {
    clearError();
    mode = next;
    notifyVision('tool');
    pending = [];draftRedo=[];
    cursor = null;
    drag = null;
    if (next === "count") $("tracePurpose").value = "comptage";
    if (
      next === "length" &&
      ["emprise", "dallage", "comptage"].includes($("tracePurpose").value)
    )
      $("tracePurpose").value = "fondations";
    if (
      next === "area" &&
      [
        "fondations",
        "soubassements",
        "maconnerie",
        "drainage",
        "comptage",
      ].includes($("tracePurpose").value)
    )
      $("tracePurpose").value = "emprise";
    for (const [id, m] of [
      ["toolCalibrate", "calibrate"],
      ["toolLength", "length"],
      ["toolArea", "area"],
      ["toolCount", "count"],
      ["toolSelect", "select"],
    ])
      $(id).classList.toggle("active-tool", m === next);
    draw();
  }
  function compatible(t, p, key) {
    if (!t) return false;
    if (p.kind === "quantity") return unitsFor(key).includes(t.unit);
    if (t.unit === "u") return false;
    const u = p.unit;
    return fieldsFor(key, u).some(([k, , kind = "m"]) =>
      t.unit === "m"
        ? k === "L" && kind === "m"
        : kind === "m²" || (kind === "result" && unitsFor(key).includes("m²")),
    );
  }
  function updateArticles() {
    const t = allTraces().find((t) => t.id === $("traceSelect").value),
      last = $("traceArticle").value;
    $("traceArticle").innerHTML = Object.entries(PRESETS)
      .filter(([key, p]) => compatible(t, p, key))
      .map(([key, p]) => `<option value="${key}">${esc(p.title)}</option>`)
      .join("");
    if ([...$("traceArticle").options].some((o) => o.value === last))
      $("traceArticle").value = last;
    else if (t?.unit === "u") $("traceArticle").value = "comptage";
    else if (t?.unit === "m²")
      $("traceArticle").value =
        t.purpose === "dallage" ? "dallage" : "decapage_surface";
    $("useTrace").disabled = !t;
    $("injectTrace").disabled = !t || readOnly;
  }
  function pageLabels(){
    if(!data)return;
    for(const option of $("planPage").options){const n=Number(option.value);if(n)option.textContent=`${n} / ${$("planPage").options.length} · ${data.pages[n]?.name||'Page '+n}`;}
    $("planPageName").value=pageData().name||'Page '+data.page;
  }
  function measureProperties(){
    const trace=allTraces().find(t=>t.id===$("traceSelect").value),host=$("planMeasureProperties");if(!trace){host.innerHTML='<p>Sélectionnez un relevé pour voir sa géométrie.</p>';return;}
    const current=Number(String(trace.retained??trace.value).replace(',','.')),source=`${trace.fileName} · p.${trace.page} · ${trace.pageName}`;
    host.innerHTML=`<p><b>${esc(trace.label)}</b></p><dl><dt>Page du plan</dt><dd>${esc(source)}</dd><dt>Mesure brute</dt><dd>${fmt(trace.value,6)} ${esc(trace.unit)}</dd><dt>Mesure retenue</dt><dd>${fmt(current,6)} ${esc(trace.unit)}</dd>${trace.length?`<dt>Longueur / périmètre</dt><dd>${fmt(trace.length,6)} m</dd>`:''}</dl>`;
    const linked=(getProject().rows||[]).filter(r=>r.input.planLink?.ids?.includes(trace.id));
    if(!linked.length)host.innerHTML+='<p>Déductions : 0 · pente : aucune au relevé. Les corrections et pentes sont portées par la minute liée.</p>';
    for(const row of linked){const p=premiumProperties(row,getProject());host.innerHTML+=`<article><b>${esc(row.label)}</b><dl><dt>Brut projeté</dt><dd>${fmt(p.gross,6)} ${esc(p.unit)}</dd><dt>Déductions</dt><dd>${fmt(p.deductions,6)} ${esc(p.unit)}</dd><dt>Net retenu</dt><dd>${fmt(p.net,6)} ${esc(p.unit)}</dd><dt>Pente appliquée</dt><dd>${p.slope.enabled?fmt(p.slope.percent)+' % · × '+fmt(p.slope.coefficient):'Aucune conversion'}</dd></dl><button class="secondary" data-premium-row="${esc(row.id)}" data-premium-mode="properties">Propriétés / Pente de la minute</button></article>`;}
  }
  document.addEventListener('atelier:meta',measureProperties);
  $("savePlanPageName").addEventListener('click',()=>{try{if(readOnly)throw new Error('Projet en consultation.');if(!file)throw new Error('Importez un plan.');const name=$("planPageName").value.trim();if(!name)throw new Error('Nommez la page.');pageData().name=name.slice(0,100);save();pageLabels();renderTraces();clearError();}catch(e){error(e);}});
  const traceNodes = new Map(),
    traceOptions = new Map();
  function renderTraces() {
    const traces = allTraces(),
      present = new Set(traces.map((t) => t.id)),
      selected = $("traceSelect").value;
    for (const [id, entry] of traceNodes)
      if (!present.has(id)) {
        entry.node.remove();
        traceNodes.delete(id);
        traceOptions.get(id)?.remove();
        traceOptions.delete(id);
      }
    const emptyRow = $("traceRows").querySelector("[data-empty-trace]");
    if (traces.length) emptyRow?.remove();
    if (!traces.length && !emptyRow) {
      $("traceRows").innerHTML =
        '<tr data-empty-trace><td colspan="7">Aucun relevé enregistré. Trace un ouvrage ou saisis une cote lue au plan.</td></tr>';
    }
    for (const trace of traces) {
      const signature = [
        trace.page,
        trace.pageName,
        trace.label,
        trace.purpose,
        trace.value,
        trace.retained,
        trace.unit,
        trace.manual,
      ].join("|");
      let entry = traceNodes.get(trace.id);
      if (!entry) {
        const node = document.createElement("tr");
        node.innerHTML =
          '<td></td><td></td><td></td><td></td><td><input inputmode="decimal"></td><td></td><td></td>';
        $("traceRows").append(node);
        entry = { node, signature: null };
        traceNodes.set(trace.id, entry);
        const option = document.createElement("option");
        option.value = trace.id;
        $("traceSelect").append(option);
        traceOptions.set(trace.id, option);
      }
      if (entry.signature === signature) continue;
      entry.signature = signature;
      const cells = entry.node.cells;
      cells[0].textContent = trace.page+" · "+trace.pageName;
      cells[1].textContent = trace.label;
      cells[2].textContent = PURPOSES[trace.purpose];
      cells[3].textContent = trace.manual
        ? "Cote saisie"
        : fmt(trace.value, 3) + " " + trace.unit;
      cells[5].textContent = trace.unit;
      const input = cells[4].firstElementChild;
      input.dataset.retained = trace.id;
      input.setAttribute("aria-label", "Valeur retenue " + trace.label);
      input.readOnly = readOnly;
      if (input !== document.activeElement)
        input.value =
          trace.retained ??
          fmt(trace.value, 6).replaceAll(" ", "").replaceAll(" ", "");
      cells[6].innerHTML =
        (!trace.manual
          ? `<button class="quiet" data-auto="${esc(trace.id)}">Mesure auto</button>`
          : "") +
        `<button class="quiet" data-remove="${esc(trace.id)}">Supprimer</button>`;
      for (const button of cells[6].querySelectorAll("button"))
        button.disabled = readOnly;
      traceOptions.get(trace.id).textContent =
        `p.${trace.page} ${trace.pageName} · ${trace.label} · ${fmt(Number(String(trace.retained ?? trace.value).replace(",", ".")))} ${trace.unit}`;
    }
    if (present.has(selected)) $("traceSelect").value = selected;
    else if (traces.length) $("traceSelect").value = traces[0].id;
    updateArticles();
    measureProperties();
  }
  async function renderPage() {
    if (!file) return;
    const token = ++sequence;
    renderTask?.cancel();
    renderTask = null;
    busy = true;
    notifyVision();
    workspace.setAttribute("aria-busy", "true");
    refreshInstruction();
    clearError();
    try {
      let img = pageCache.get(data.page);
      if (!img) {
        if (cadImage) img = cadImage;
        else if (pdf) {
          const pdfPage = await pdf.getPage(data.page);
          if (token !== sequence) return;
          const base = pdfPage.getViewport({ scale: 1 }),
            viewport = pdfPage.getViewport({
              scale: Math.min(2, 2400 / Math.max(base.width, base.height)),
            }),
            canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          renderTask = pdfPage.render({
            canvasContext: canvas.getContext("2d"),
            viewport,
          });
          // PDF.js sait découper ses opérateurs : rendre la main entre les lots.
          const task = renderTask;
          task.onContinue = (resume) =>
            requestAnimationFrame(() => {
              if (token === sequence) resume();
              else task.cancel();
            });
          await renderTask.promise;
          img = canvas;
        } else {
          const bmp = await createImageBitmap(file),
            scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height)),
            canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(bmp.width * scale));
          canvas.height = Math.max(1, Math.round(bmp.height * scale));
          canvas
            .getContext("2d")
            .drawImage(bmp, 0, 0, canvas.width, canvas.height);
          bmp.close();
          img = canvas;
        }
        if (token !== sequence) {
          img?.close?.();
          return;
        }
        pageCache.set(data.page, img);
      } else {
        pageCache.delete(data.page);
        pageCache.set(data.page, img);
      }
      // Deux pages raster au plus : borne mémoire indépendante du nombre de pages.
      while (pageCache.size > 2) {
        const key = pageCache.keys().next().value,
          old = pageCache.get(key);
        pageCache.delete(key);
        if (old !== img && old !== cadImage) {
          old.close?.();
          if (pdf)
            pdf
              .getPage(Number(key))
              .then((page) => page.cleanup())
              .catch(() => {});
          if (old instanceof HTMLCanvasElement) {
            old.width = old.height = 1;
          }
        }
      }
      if (token !== sequence) return;
      image = img;
      const page = pageData();
      if (
        page.width &&
        (page.width !== img.width || page.height !== img.height)
      ) {
        delete page.vision;
        page.scale = 0;
        page.calibration = [];
        page.traces = [];
        toast("Format du plan modifié : réétalonne cette page.");
      }
      page.width = img.width;
      page.height = img.height;
      pending = [];draftRedo=[];
      cursor = null;
      geometryVersion++;
      $("planEmpty").hidden = true;
      $("planName").textContent = data.fileName;
      $("referenceLength").value = String(page.reference || 10).replace(
        ".",
        ",",
      );
      renderTraces();
      draw();
    } catch (error) {
      if (error.name !== "RenderingCancelledException" && token === sequence)
        errorMessage(error);
    } finally {
      if (token === sequence) {
        renderTask = null;
        busy = false;
        notifyVision();
        workspace.setAttribute("aria-busy", "false");
        refreshInstruction();
      }
    }
  }
  function errorMessage(reason) {
    error(new Error("Lecture du plan impossible : " + reason.message));
  }
  async function openFile(blob, restore = false) {
    const importToken = ++importGeneration;
    const previous = {
      data: accepted,
      file,
      pdf,
      image,
      cadImage,
      cache: new Map(pageCache),
    };
    cadAbort?.abort();
    cadAbort = new AbortController();
    renderTask?.cancel();
    sequence++;
    $("planUpload").disabled = true;
    $("planDemo").disabled = true;
    clearError();
    try {
      if (blob.size > 35 * 1024 * 1024)
        throw new Error("Le plan dépasse 35 Mo. Exporte une version allégée.");
      if (
        !/^(application\/pdf|image\/(png|jpeg|webp))$/.test(blob.type) &&
        !/\.(pdf|dwg|dxf)$/i.test(blob.name || data?.fileName || "")
      )
        throw new Error("Utilise un PDF, DWG, DXF, PNG, JPEG ou WebP.");
      if (
        !restore &&
        !(data?.fileName === blob.name && data?.size === blob.size) &&
        allTraces().some((t) => beforeRemove && !beforeRemove(t.id))
      )
        throw new Error(
          "Détache les lignes liées à ce plan avant de le remplacer.",
        );
      if (
        !restore &&
        data?.assetId &&
        !(data.fileName === blob.name && data.size === blob.size) &&
        allTraces().length &&
        confirm &&
        !(await confirm(
          "Remplacer le plan ?",
          "Les relevés du plan courant seront remplacés. Télécharge d’abord une sauvegarde du projet pour les conserver.",
        ))
      )
        return;
      if (!restore) {
        if (!data || data.fileName !== blob.name || data.size !== blob.size)
          data = empty();
        data.fileName = blob.name || "Plan";
        data.size = blob.size;
        data.assetId = crypto.randomUUID();
        delete data.serverAssetId;
        try {
          await storedAsset(data.assetId, blob);
        } catch (e) {
          toast(e.message + " Conserve le fichier original.");
        }
      }
      if (importToken !== importGeneration) return;
      pageCache.clear();
      file = blob;
      pdf = null;
      image = null;
      cadImage = null;
      $("cadNotice").hidden = true;
      if (
        blob.type === "application/pdf" ||
        data.fileName.toLowerCase().endsWith(".pdf")
      ) {
        const lib = await import("./vendor/pdfjs/pdf.min.mjs");
        lib.GlobalWorkerOptions.workerSrc = new URL(
          "./vendor/pdfjs/pdf.worker.min.mjs",
          import.meta.url,
        ).href;
        const nextPdf = await lib.getDocument({
          data: new Uint8Array(await blob.arrayBuffer()),
          isEvalSupported: false,
          cMapUrl: new URL("./vendor/pdfjs/cmaps/", import.meta.url).href,
          cMapPacked: true,
          standardFontDataUrl: new URL(
            "./vendor/pdfjs/standard_fonts/",
            import.meta.url,
          ).href,
        }).promise;
        if (importToken !== importGeneration) {
          nextPdf.destroy().catch(() => {});
          return;
        }
        pdf = nextPdf;
        if (pdf.numPages > 100)
          throw new Error("Maximum 100 pages. Importe un extrait du dossier.");
      }
      if (/\.(dwg|dxf)$/i.test(data.fileName)) {
        const cad = await importCad(
          new File([blob], data.fileName, { type: blob.type }),
          {
            signal: cadAbort.signal,
            onProgress: (text) => {
              $("planInstruction").textContent = text;
            },
          },
        );
        if (importToken !== importGeneration) {
          cad.canvas.close?.();
          return;
        }
        cadImage = cad.canvas;
        data.cadNotice = `Projection CAD 2D · ${cad.entities} entité(s) lue(s). ${cad.unknown ? cad.unknown + " objet(s) non reconnu(s). " : ""}${cad.curves ? "Courbes discrétisées à l’affichage. " : ""}Contrôle le rendu et étalonne une cote connue ; objets 3D, xréfs et objets spécialisés à vérifier.`;
        $("cadNotice").textContent = data.cadNotice;
        $("cadNotice").hidden = false;
        if (cad.unknown)
          toast(
            `${cad.unknown} objet(s) CAD non reconnu(s) : vérifie le rendu 2D.`,
          );
      }
      const pages = pdf?.numPages || 1;
      data.page = Math.min(data.page || 1, pages);
      $("planPage").innerHTML = Array.from(
        { length: pages },
        (_, i) => `<option value="${i + 1}">${i + 1} / ${pages}</option>`,
      ).join("");
      $("planPage").value = String(data.page);
      $("planPage").disabled = pages === 1;
      pageLabels();
      await renderPage();
      if (!restore) save({ geometry: true });
      if (previous.pdf && previous.pdf !== pdf)
        previous.pdf.destroy().catch(() => {});
      if (previous.cadImage && previous.cadImage !== cadImage)
        previous.cadImage.close?.();
      syncAsset().catch((e) => toast(e.message));
    } catch (e) {
      if (importToken !== importGeneration) return;
      data = previous.data ? structuredClone(previous.data) : empty();
      pageCache.clear();
      for (const [key, value] of previous.cache) pageCache.set(key, value);
      geometryVersion++;
      file = previous.file;
      pdf = previous.pdf;
      image = previous.image;
      cadImage = previous.cadImage;
      draw();
      renderTraces();
      error(
        e.name === "PasswordException"
          ? new Error(
              "Ce PDF est protégé. Importe une copie lisible sans mot de passe.",
            )
          : e,
      );
    } finally {
      if (importToken === importGeneration) {
        $("planUpload").disabled = readOnly;
        $("planDemo").disabled = readOnly;
      }
    }
  }
  function retainTrace(t) {
    const purpose = $("tracePurpose").value;
    if (
      purpose !== "autre" &&
      ((purpose === "comptage" && t.unit !== "u") ||
        (purpose !== "comptage" &&
          (["emprise", "dallage"].includes(purpose) !== (t.unit === "m²") ||
            t.unit === "u")))
    )
      throw new Error(
        "Cette affectation attend " +
          (["emprise", "dallage"].includes(purpose)
            ? "une surface en m²."
            : "un linéaire en m."),
      );
    t.label = $("traceLabel").value.trim() || `R${allTraces().length + 1}`;
    t.purpose = purpose;
    t.lot = $("traceLot").value || PURPOSES[purpose];
    t.workColor = workColor({workColor:$("traceWorkColor").value,lot:t.lot});
    t.level = $("traceLevel").value.trim().slice(0,80);
    t.zone = $("traceZone").value.trim().slice(0,80);
    t.id = crypto.randomUUID();
    if (allTraces().length >= 1000)
      throw new Error("Maximum 1 000 relevés par projet.");
    pageData().traces.push(t);
    pending = [];draftRedo=[];
    save({ traceIds: [t.id], purposes: [t.purpose], geometry: true });
    renderTraces();
    $("traceSelect").value=t.id;updateArticles();measureProperties();
    draw();
    toast("Relevé enregistré.");
  }
  $("planUpload").addEventListener("click", () => $("planFile").click());
  $("planFile").addEventListener("change", async (e) => {
    if (e.target.files[0]) await openFile(e.target.files[0]);
    e.target.value = "";
  });
  $("planPage").addEventListener("change", async () => {
    data.page = Number($("planPage").value);
    pageLabels();
    await renderPage();
    if (!readOnly) save();
  });
  $("planZoom").addEventListener("change", () => {
    $("planStack").style.width = Number($("planZoom").value) * 100 + "%";
  });
  $("toolCalibrate").addEventListener("click", () => setMode("calibrate"));
  $("toolLength").addEventListener("click", () => setMode("length"));
  $("toolArea").addEventListener("click", () => setMode("area"));
  $("toolCount").addEventListener("click", () => setMode("count"));
  $("toolSelect").addEventListener("click", () => setMode("select"));
  let pointTolerance = 10;
  function pointFor(event) {
    const canvas = $("planCanvas"),
      rect = canvas.getBoundingClientRect();
    pointTolerance = Math.max(8, (canvas.width / rect.width) * 9);
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }
  let suppressClick = false;
  $("planCanvas").addEventListener("click", (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (!image || readOnly || busy) return;
    clearError();
    const point = pointFor(event);
    if (mode === "select") {
      const hit = renderer.hit(point, pointTolerance);
      if (hit) {
        $("traceSelect").value = hit.id;measureProperties();
        updateArticles();
        draw();
      }
      return;
    }
    if (mode !== "calibrate" && mode !== "count" && !pageData().scale) {
      error(new Error("Définis d’abord l’échelle à partir d’une cote connue."));
      return;
    }
    if (pending.length >= 500) {
      error(new Error("Maximum 500 points par tracé."));
      return;
    }
    if (mode === "calibrate" && pending.length === 2) pending = [];draftRedo=[];
    draftRedo=[];
    pending.push(
      orthogonalPoint(
        pending.at(-1),
        point,
        event.shiftKey && mode !== "calibrate" && mode !== "count",
      ),
    );
    cursor = null;
    draw();
  });
  $("planCanvas").addEventListener(
    "pointermove",
    (event) => {
      if (!image || busy) return;
      lastPointer = { point: pointFor(event), shift: event.shiftKey };
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        const { point, shift } = lastPointer;
        if (drag) {
          const origin =
            drag.points[
              (drag.vertex + drag.points.length - 1) % drag.points.length
            ];
          const constrained = orthogonalPoint(origin, point, shift);
          drag = {
            ...drag,
            points: drag.points.map((p, i) =>
              i === drag.vertex ? constrained : p,
            ),
          };
          renderer.setInteraction({ drag, hover: null });
        } else if (mode === "select") {
          const hit = renderer.hit(point, pointTolerance);
          renderer.setInteraction({ hover: hit, cursor: null });
          $("planCanvas").style.cursor =
            hit?.vertex !== undefined ? "grab" : hit ? "pointer" : "crosshair";
        } else {
          cursor =
            pending.length && mode !== "count"
              ? orthogonalPoint(
                  pending.at(-1),
                  point,
                  shift && mode !== "calibrate",
                )
              : null;
          renderer.setInteraction({ cursor });
        }
      });
    },
    { passive: true },
  );
  $("planCanvas").addEventListener("pointerleave", () => {
    if (!drag) {
      cursor = null;
      renderer.setInteraction({ cursor: null, hover: null });
    }
  });
  $("planCanvas").addEventListener("pointerdown", (event) => {
    if (mode !== "select" || readOnly || busy) return;
    const hit = renderer.hit(pointFor(event), pointTolerance);
    if (hit?.vertex === undefined) return;
    const trace = pageData().traces.find((t) => t.id === hit.id);
    if (!trace || trace.manual) return;
    drag = { ...hit, points: trace.points.slice() };
    $("traceSelect").value = hit.id;measureProperties();
    $("planCanvas").setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  $("planCanvas").addEventListener("pointerup", (event) => {
    if (!drag) return;
    const edit = {
      ...drag,
      points: drag.points.map((point, i) =>
        i === drag.vertex
          ? orthogonalPoint(
              drag.points[
                (drag.vertex + drag.points.length - 1) % drag.points.length
              ],
              pointFor(event),
              event.shiftKey,
            )
          : point,
      ),
    };
    drag = null;
    suppressClick = true;
    try {
      const trace = pageData().traces.find((t) => t.id === edit.id),
        result = measureGeometry(edit.points, trace.kind, pageData().scale);
      trace.points = edit.points;
      Object.assign(trace, result);
      save({ traceIds: [trace.id], purposes: [trace.purpose], geometry: true });
      renderTraces();
      draw();
      toast(
        trace.retained !== undefined
          ? "Sommet déplacé. La cote exacte retenue reste prioritaire."
          : "Sommet déplacé ; métré lié recalculé.",
      );
    } catch (reason) {
      error(reason);
      renderer.setInteraction({ drag: null });
    } finally {
      if ($("planCanvas").hasPointerCapture(event.pointerId))
        $("planCanvas").releasePointerCapture(event.pointerId);
    }
  });
  $("planCanvas").addEventListener("pointercancel", () => {
    drag = null;
    renderer.setInteraction({ drag: null });
  });
  document.addEventListener("keydown", (event) => {
    if (
      workspace.hidden ||
      event.key !== "Escape" ||
      document.querySelector("dialog[open]")
    )
      return;
    event.preventDefault();
    setMode("select");
    pending = [];draftRedo=[];
    cursor = null;
    drag = null;
    renderer.setInteraction({
      draft: [],
      cursor: null,
      drag: null,
      hover: null,
    });
    refreshInstruction();
    clearError();
  });
  $("undoPoint").addEventListener("click", () => {
    undoDraft();
  });
  $("validateScale").addEventListener("click", () => {
    try {
      if (pending.length !== 2 || mode !== "calibrate")
        throw new Error("Choisis l’outil Étalonner puis clique deux points.");
      const p = pageData();
      p.scale = calibration(...pending, $("referenceLength").value);
      p.reference = number($("referenceLength").value);
      p.calibration = [...pending];
      for (const t of p.traces)
        if (!t.manual)
          Object.assign(t, measureGeometry(t.points, t.kind, p.scale));
      pending = [];draftRedo=[];
      setMode("length");
      save({
        traceIds: p.traces.map((t) => t.id),
        purposes: [...new Set(p.traces.map((t) => t.purpose))],
        geometry: true,
      });
      renderTraces();
      draw();
      clearError();
    } catch (e) {
      error(e);
    }
  });
  $("finishTrace").addEventListener("click", () => {
    try {
      if (mode === "calibrate") throw new Error("Choisis Linéaire ou Surface.");
      const kind =
        mode === "area" ? "area" : mode === "count" ? "count" : "length";
      retainTrace({
        kind,
        points: [...pending],
        ...measureGeometry(pending, kind, pageData().scale),
      });
      clearError();
    } catch (e) {
      error(e);
    }
  });
  $("saveManual").addEventListener("click", () => {
    try {
      if (!file) throw new Error("Importe le plan avant de saisir ses cotes.");
      const value = number($("manualValue").value, "Valeur lue");
      retainTrace({
        manual: true,
        value,
        retained: String(value),
        unit: $("manualUnit").value,
        kind:
          $("manualUnit").value === "m²"
            ? "area"
            : $("manualUnit").value === "u"
              ? "count"
              : "length",
        points: [],
      });
      clearError();
    } catch (e) {
      error(e);
    }
  });
  $("traceRows").addEventListener("input", (e) => {
    const id = e.target.dataset.retained;
    if (!id) return;
    try {
      number(e.target.value, "Valeur retenue");
      for (const p of Object.values(data.pages)) {
        const t = p.traces.find((t) => t.id === id);
        if (t) t.retained = e.target.value;
      }
      const t = allTraces().find((t) => t.id === id);
      save({ traceIds: [id], purposes: [t.purpose] });
      clearError();
    } catch (reason) {
      e.target.setAttribute("aria-invalid", "true");
    }
  });
  $("traceRows").addEventListener("change", (e) => {
    const id = e.target.dataset.retained;
    if (!id) return;
    try {
      number(e.target.value, "Valeur retenue");
      for (const p of Object.values(data.pages)) {
        const t = p.traces.find((t) => t.id === id);
        if (t) t.retained = e.target.value;
      }
      const t = allTraces().find((t) => t.id === id);
      save({ traceIds: [id], purposes: [t.purpose] });
      e.target.removeAttribute("aria-invalid");
      clearError();
    } catch (err) {
      error(err);
      e.target.value = String(
        allTraces().find((t) => t.id === id)?.retained ??
          allTraces().find((t) => t.id === id)?.value ??
          "",
      );
    }
  });
  $("traceRows").addEventListener("click", async (e) => {
    const auto = e.target.closest("[data-auto]")?.dataset.auto;
    if (auto) {
      for (const page of Object.values(data.pages)) {
        const trace = page.traces.find((t) => t.id === auto);
        if (trace) {
          delete trace.retained;
          save({ traceIds: [auto], purposes: [trace.purpose] });
          renderTraces();
          return;
        }
      }
    }
    const id = e.target.closest("[data-remove]")?.dataset.remove;
    if (!id) return;
    if (beforeRemove && !beforeRemove(id)) {
      error(
        new Error(
          "Ce relevé est lié à une ligne. Détache d’abord les lignes concernées dans la minute.",
        ),
      );
      return;
    }
    if (
      confirm &&
      !(await confirm(
        "Supprimer ce relevé ?",
        "Les lignes déjà ajoutées à l’avant-métré seront conservées.",
      ))
    )
      return;
    const removed = allTraces().find((t) => t.id === id);
    for (const p of Object.values(data.pages))
      p.traces = p.traces.filter((t) => t.id !== id);
    save({
      traceIds: [id],
      purposes: removed ? [removed.purpose] : [],
      geometry: true,
    });
    renderTraces();
    draw();
  });
  $("tracePurpose").addEventListener("change", () => {
    $("manualUnit").value = ["emprise", "dallage"].includes(
      $("tracePurpose").value,
    )
      ? "m²"
      : $("tracePurpose").value === "comptage"
        ? "u"
        : "m";
    draw();
  });
  $("traceLot").addEventListener("change",draw);
  $("traceWorkColor").addEventListener("input",draw);
  $("injectTrace").addEventListener("click",()=>{try{
    const trace=allTraces().find(t=>t.id===$("traceSelect").value);
    if(!trace)throw new Error('Choisis un relevé.');
    if(readOnly)throw new Error('Projet en consultation.');
    onInjectTrace?.(trace);
  }catch(e){error(e);}});
  $("traceSelect").addEventListener("change", () => {
    updateArticles();
    measureProperties();
    draw();
  });
  $("useTrace").addEventListener("click", () => {
    try {
      const t = allTraces().find((t) => t.id === $("traceSelect").value),
        key = $("traceArticle").value;
      if (!t || !key) throw new Error("Choisis un relevé et un ouvrage.");
      const p = PRESETS[key],
        unit = p.kind === "quantity" ? t.unit : p.unit;
      const target = fieldsFor(key, unit).find(([k, , kind = "m"]) =>
        t.unit === "m" ? k === "L" : kind === "m²" || kind === "result",
      );
      if (!target)
        throw new Error("Ce relevé ne correspond pas à cet ouvrage.");
      const value = number(t.retained ?? t.value);
      onUse(
        key,
        unit,
        { [target[0]]: String(value) },
        {
          fileName: data.fileName,
          page: t.page,
          label: t.label,
          value,
          unit: t.unit,
          reference: t.reference,
          traceIds: [t.id],
          field: target[0],
          manual: t.manual || t.unit === "u" || t.retained !== undefined,
        },
      );
    } catch (e) {
      error(e);
    }
  });
  for (const [key] of paramDefs)
    $("param-" + key).addEventListener("input", save);
  $("prepareBatch").addEventListener("click", () => {
    try {
      clearError();
      const params = Object.fromEntries(
        paramDefs.map(([key]) => [key, $("param-" + key).value]),
      );
      prepared = buildPlanBatch(allTraces(), params);
      $("batchPreview").innerHTML =
        `<p class="batch-review">${prepared.length} articles proposés. Vérifie les hypothèses et décoche les ouvrages non demandés.</p><div class="plan-table-wrap"><table><thead><tr><th>Garder</th><th>Désignation / calcul</th><th>Quantité</th><th>Unité</th></tr></thead><tbody>${prepared.map((r, i) => `<tr><td><input type="checkbox" data-batch="${i}" checked aria-label="Garder ${esc(r.label)}"></td><td><b>${esc(r.label)}</b><details><summary>Voir les calculs et hypothèses</summary>${r.result.steps.map((s) => `<p>${esc(s)}</p>`).join("")}</details></td><td>${fmt(r.result.total, 3)}</td><td>${r.result.unit}</td></tr>`).join("")}</tbody></table></div>`;
      $("addBatch").hidden = false;
    } catch (e) {
      prepared = [];
      $("addBatch").hidden = true;
      $("batchPreview").replaceChildren();
      error(e);
    }
  });
  $("addBatch").addEventListener("click", () => {
    const selected = [...workspace.querySelectorAll("[data-batch]:checked")]
      .map((el) => prepared[Number(el.dataset.batch)])
      .filter(Boolean);
    if (!selected.length) {
      error(new Error("Coche au moins un article."));
      return;
    }
    if (onAdd(selected)) {
      prepared = [];
      $("addBatch").hidden = true;
      $("batchPreview").replaceChildren();
    }
  });
  $("planDemo").addEventListener("click", async () => {
    try {
      const response = await fetch("./plan-exemple.svg");
      if (!response.ok) throw new Error("Exemple indisponible.");
      const svg = await response.text(),
        url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })),
        img = new Image();
      await new Promise((r, j) => {
        img.onload = r;
        img.onerror = j;
        img.src = url;
      });
      const c = document.createElement("canvas");
      c.width = 1200;
      c.height = 850;
      c.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      await openFile(
        new File([blob], "Plan-exemple-pedagogique.png", { type: "image/png" }),
      );
    } catch (e) {
      error(e);
    }
  });
  async function loadState(next) {
    // Quitter un projet doit aussi libérer les workers PDF et les bitmaps ;
    // vider simplement la Map ne détruit pas le document de PDF.js.
    pdf?.destroy().catch(() => {});
    cadImage?.close?.();
    for (const image of pageCache.values())
      if (image instanceof HTMLCanvasElement) image.width = image.height = 1;
    importGeneration++;
    renderTask?.cancel();
    cadAbort?.abort();
    pageCache.clear();
    geometryVersion++;
    const loadToken = ++sequence;
    data =
      next &&
      typeof next === "object" &&
      typeof next.fileName === "string" &&
      next.pages &&
      typeof next.pages === "object"
        ? structuredClone(next)
        : empty();
    try {
      if (Object.keys(data.pages).length > 100)
        throw new Error("Maximum 100 pages de relevés.");
      for (const p of Object.values(data.pages)) {
        if (
          !Number.isFinite(p.scale) ||
          p.scale < 0 ||
          !Array.isArray(p.calibration)
        )
          throw new Error("Échelle sauvegardée invalide.");
        if (!Array.isArray(p.traces) || p.traces.length > 1000)
          throw new Error("Relevés sauvegardés invalides.");
        for (const t of p.traces) {
          if (
            !Number.isFinite(t.value) ||
            t.value <= 0 ||
            !["m", "m²", "u"].includes(t.unit) ||
            !PURPOSES[t.purpose]
          )
            throw new Error("Relevé sauvegardé invalide.");
          if (
            !Array.isArray(t.points) ||
            t.points.length > 500 ||
            !t.points.every(
              (p) =>
                Number.isFinite(p.x) &&
                Number.isFinite(p.y) &&
                Math.abs(p.x) < 1e6 &&
                Math.abs(p.y) < 1e6,
            )
          )
            throw new Error("Points sauvegardés invalides.");
          if (t.retained !== undefined) number(t.retained);
        }
      }
    } catch (e) {
      data = empty();
      error(e);
    }
    accepted = next || null;
    image = null;
    file = null;
    notifyVision();
    pdf = null;
    cadImage = null;
    $("cadNotice").textContent = data.cadNotice || "";
    $("cadNotice").hidden = !data.cadNotice;
    pending = [];draftRedo=[];
    prepared = [];
    for (const [key, , def] of paramDefs)
      $("param-" + key).value = data.params?.[key] ?? def;
    $("planName").textContent = data.fileName || "Aucun plan importé";
    $("planEmpty").hidden = false;
    $("batchPreview").replaceChildren();
    $("addBatch").hidden = true;
    renderTraces();
    draw();
    if (data.assetId) {
      try {
        const blob = await storedAsset(data.assetId);
        if (loadToken !== sequence) return;
        if (blob) await openFile(blob, true);
        else if (data.serverAssetId && loadAsset) {
          const remote = await loadAsset(data.serverAssetId);
          if (loadToken !== sequence) return;
          const source = new File([remote], data.fileName, {
            type: remote.type,
          });
          await storedAsset(data.assetId, source);
          await openFile(source, true);
        } else
          error(
            new Error(
              "Réimporte « " +
                data.fileName +
                " » pour retrouver le fond de plan. Les relevés sont conservés.",
            ),
          );
      } catch (e) {
        error(e);
      }
    }
  }
  async function syncAsset() {
    if (uploading || readOnly || !file || !saveAsset || data.serverAssetId)
      return;
    uploading = true;
    try {
      const current = data.assetId,
        aid = await saveAsset(file);
      if (aid && data.assetId === current) {
        data.serverAssetId = aid;
        save();
      }
    } finally {
      uploading = false;
    }
  }
  let permissionsApplied = false;
  function setReadOnly(value) {
    if (permissionsApplied && readOnly === value) return;
    permissionsApplied = true;
    readOnly = value;
    for (const id of [
      "planUpload",
      "toolCalibrate",
      "toolLength",
      "toolArea",
      "toolCount",
      "toolSelect",
      "validateScale",
      "referenceLength",
      "finishTrace",
      "saveManual",
      "prepareBatch",
      "addBatch",
      "planDemo",
      "useTrace",
      "injectTrace",
      "savePlanPageName",
      "planPageName",
    ])
      $(id).disabled = value;
    workspace
      .querySelectorAll("#traceRows input")
      .forEach((el) => (el.readOnly = value));
    workspace
      .querySelectorAll("#traceRows button,.batch-params input")
      .forEach((el) => (el.disabled = value));
  }
  async function focusTrace(traceId, page) {
    const found = Object.entries(data.pages).find(([n, p]) =>
      p.traces.some((t) => t.id === traceId),
    );
    data.page = found ? Number(found[0]) : Number(page || data.page);
    $("planPage").value = String(data.page);
    await renderPage();
    if (traceId) $("traceSelect").value = traceId;
    pageLabels();measureProperties();
    draw();
  }
  function undoDraft(){if(readOnly||!pending.length)return false;draftRedo.push(pending.pop());cursor=null;draw();return true;}
  function redoDraft(){if(readOnly||!draftRedo.length)return false;pending.push(draftRedo.pop());cursor=null;draw();return true;}
  loadState(state);
  return { loadState, syncAsset, setReadOnly, focusTrace,visionState,captureVision,saveVision,
    setTool(next){if(!readOnly&&['length','area','count','select'].includes(next)){setMode(next);$('planCanvas').focus({preventScroll:true});}},
    undoDraft,redoDraft,
  };
}
