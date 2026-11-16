import { createMinuteView } from "./minute-view.js";
import { initCloud } from "./cloud.js";
import {
  studyPrice,
  needsBySupplier,
  financialSummary,
  revisionLabel,
  snapshotProject,
  upgradeProject,
} from "./business.js";
import {
  fieldsFor,
  fmt,
  money,
  calculate,
  parseUnitPrice,
  csvValue,
} from "./core.js";
import { DEFAULT_LOTS, ROLES } from "./project-schema.js";
import {
  exportWorkbook,
  exportMinutePdf,
  readSchedule,
  saveBlob,
  safeName,
  exportScheduleTemplate,
  exportNeedsWorkbook,
  exportOrdersPdf,
} from "./exports.js";
import { convertUnit, evaluateExpression } from "./expression.js";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const units = ["m", "m²", "m³", "kg", "t", "u", "forfait"];
const currency = (n, p) => money(n, p.settings.currency);
const input = (id, label, value = "", extra = "") =>
  `<label>${esc(label)}<input id="${id}" value="${esc(value ?? "")}" ${extra}></label>`;
const select = (id, label, values, value) =>
  `<label>${esc(label)}<select id="${id}">${values.map((v) => `<option value="${esc(typeof v === "string" ? v : v[0])}" ${value === (typeof v === "string" ? v : v[0]) ? "selected" : ""}>${esc(typeof v === "string" ? v : v[1])}</option>`).join("")}</select></label>`;
const num = (v) => {
  if (String(v ?? "").trim() === "") return 0;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < 0)
    throw new Error("Saisis un nombre positif ou nul.");
  return n;
};
const views = {
  project: "Fiche projet",
  variables: "Variables",
  minute: "Minute",
  cctp: "Éditeur CCTP",
  assemblies: "Ouvrages composés",
  prices: "Étude de prix",
  needs: "Besoins matériaux",
  exports: "Exports / trames",
  history: "Révisions / accès",
};
export function initPro(bridge) {
  const workspace = document.getElementById("proWorkspace");
  let cctpView = null, renderGeneration = 0;
  let minuteView = null,
    minuteRefresh = null,
    lastPermissions = null,
    lastProjectList = null;
  let current = "project",
    assemblyId = bridge.get().assemblies[0]?.id,
    rowId = bridge.get().rows[0]?.id,
    cloud,
    lastRole = "owner";
  const $ = (id) => workspace.querySelector("#" + id),
    p = () => bridge.get();
  const update = (fn) => {
    bridge.update(fn);
  };
  const error = (e) => {
    const box = $("proError");
    if (box) {
      box.hidden = false;
      box.textContent = e.message || String(e);
    } else bridge.toast(e.message || String(e));
  };
  const action = (fn) => async (e) => {
    try {
      await fn(e);
    } catch (err) {
      error(err);
    }
  };
  function canWrite() {
    return (
      !cloud || !cloud.state().online || cloud.state().role !== "conducteur"
    );
  }
  function isDirector() {
    return (
      !cloud ||
      !cloud.state().online ||
      ["owner", "dirigeant"].includes(cloud.state().role)
    );
  }
  for (const [key, title] of Object.entries(views)) {
    const button = document.createElement("button");
    button.textContent = title;
    button.dataset.proView = key;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => bridge.showView(key));
    document.querySelector(".work-tabs").append(button);
  }
  const projectBar = document.querySelector(".project-bar");
  const cloudBar = document.createElement("div");
  cloudBar.className = "cloud-bar";
  cloudBar.innerHTML =
    '<label>Projets enregistrés<select id="cloudProjects"><option value="">Projet courant</option></select></label><span id="cloudStatus" role="status">Connexion…</span><button id="cloudRetry" class="quiet">Synchroniser</button><button id="cloudReload" class="quiet" hidden>Recharger la version en ligne</button>';
  projectBar.after(cloudBar);
  document.getElementById("cloudProjects").addEventListener(
    "change",
    action(async (e) => {
      if (e.target.value) await cloud.load(e.target.value);
    }),
  );
  document
    .getElementById("cloudRetry")
    .addEventListener("click", () => cloud.connect());
  document.getElementById("cloudReload").addEventListener(
    "click",
    action(() => cloud.load(p().cloudId)),
  );
  function lockUI(force = false) {
    const s = cloud?.state();
    document.body.dataset.role = s?.online ? s.role : "owner";
    const permissionKey = [s?.online, s?.role, s?.canCreate].join(":");
    if (!force && lastPermissions === permissionKey) return;
    lastPermissions = permissionKey;
    const ro = s?.online && s.role === "conducteur";
    document
      .querySelectorAll("#calcForm input,#calcForm select,#calcForm button")
      .forEach(
        (el) => (el.disabled = ro || el.dataset.originalDisabled === "true"),
      );

    document
      .querySelectorAll("#rows .row-actions")
      .forEach((el) => (el.hidden = ro));
    document.getElementById("newProject").disabled = s?.online && !s.canCreate;
    document.getElementById("importButton").disabled = ro;
    document.querySelectorAll("[data-country]").forEach(b=>{b.disabled=ro;});
    document.getElementById("projectTitle").disabled = ro;
    workspace
      .querySelectorAll("[data-write]")
      .forEach((el) => (el.disabled = ro));
    workspace
      .querySelectorAll("[data-director]")
      .forEach((el) => (el.disabled = !isDirector()));
    if (ro)
      workspace
        .querySelectorAll("#proContent input,#proContent select")
        .forEach((el) => (el.disabled = true));
    const mode = workspace.querySelector("#setting-mode");
    if (mode) mode.disabled = !isDirector();
    document
      .querySelectorAll("[data-pro-view=prices]")
      .forEach((el) => (el.hidden = ro));
    workspace
      .querySelectorAll("#proExcel,#proPdf")
      .forEach((el) => (el.hidden = ro || current === "cctp"));
    bridge.setPlanReadOnly?.(ro);
  }
  function onStatus(s) {
    const st = document.getElementById("cloudStatus");
    st.textContent = s.status + (s.error ? " · " + s.error : "");
    st.classList.toggle("cloud-warning", !!s.error || s.conflict);
    document.getElementById("cloudReload").hidden = !s.conflict;
    const list = document.getElementById("cloudProjects"),
      selected = p().cloudId || "";
    if (lastProjectList !== s.projects) {
      lastProjectList = s.projects;
      list.innerHTML =
        '<option value="">Projet courant</option>' +
        s.projects
          .map(
            (x) =>
              `<option value="${esc(x.id)}">${esc(x.title)} · ${esc(ROLES[x.role])}</option>`,
          )
          .join("");
    }
    list.value = selected;
    lockUI();
    if (lastRole !== s.role) {
      bridge.clearHistory?.();
      lastRole = s.role;
      if (!workspace.hidden) render(current);
    }
  }
  function render(view = current) {
    const generation=++renderGeneration;
    cctpView?.destroy();cctpView=null;
    minuteView?.destroy();
    minuteView = null;
    minuteRefresh = null;
    current = view;
    const project = p();
    workspace.innerHTML = `<div class="pro-heading"><div><p class="eyebrow">ATELIER TCE · ${esc(ROLES[cloud?.state().role || "owner"])}</p><h2>${views[view]}</h2></div><div class="pro-shortcuts"><button id="proExcel" class="secondary">↓ DPGF / BPU Excel</button><button id="proPdf" class="secondary">↓ Minute PDF</button></div></div><div id="proError" class="error" role="alert" hidden></div><div id="proContent"></div>`;
    $("proExcel").addEventListener(
      "click",
      action(() => exportWorkbook(p())),
    );
    $("proPdf").addEventListener(
      "click",
      action(() => exportMinutePdf(p())),
    );
    const content = $("proContent");
    if(view === "cctp") {
      $("proExcel").hidden=true;$("proPdf").hidden=true;
      content.innerHTML='<p role="status">Ouverture de l’éditeur CCTP…</p>';
      if(!document.getElementById('cctpStyles')) {
        const style=document.createElement('link');style.id='cctpStyles';style.rel='stylesheet';style.href='/cctp/editor.css';document.head.append(style);
      }
      import('/cctp/editor.js').then(({mountCctp})=>{
        if(generation!==renderGeneration||current!=="cctp")return;
        content.replaceChildren();
        cctpView=mountCctp(content,{get:bridge.get,setCctp:bridge.setCctp,readOnly:()=>!canWrite()});
      }).catch(error);
    }

    if (view === "project") {
      content.innerHTML = `<section class="panel pro-card"><h3>Fiche du chantier</h3><div class="pro-grid">${input("meta-address", "Adresse du chantier", project.meta.address)}${input("meta-client", "Client", project.meta.client)}${input("meta-architect", "Maître d’œuvre", project.meta.architect)}${input("meta-date", "Date d’étude", project.meta.studyDate, 'type="date"')}${input("setting-vat", "TVA par défaut (%)", project.settings.vat, 'inputmode="decimal"')}${select("setting-currency", "Devise", ["EUR", "CHF", "USD", "GBP"], project.settings.currency)}${select(
        "setting-mode",
        "Méthode de vente",
        [
          ["coefficient", "Coefficient K saisi"],
          ["margin", "FG + aléas + bénéfice sur PV"],
          ["markup", "Majorations successives FG × Bénéfice & Aléas"],
        ],
        project.settings.sellMode,
      )}${input("setting-k", "Coefficient K", project.settings.k, 'inputmode="decimal" data-director')}${input("setting-fg", "Frais généraux (% du DS)", project.settings.overhead, 'inputmode="decimal" data-director')}${input("setting-profit-risk", "Bénéfice & Aléas (% après FG)", project.settings.profitRisk, 'inputmode="decimal" data-director')}${input("setting-risk", "Aléas (% du DS)", project.settings.risk, 'inputmode="decimal" data-director')}${input("setting-margin", "Bénéfice (% du prix de vente)", project.settings.margin, 'inputmode="decimal" data-director')}${input("setting-hour", "Coût horaire de main-d’œuvre", project.settings.hourlyRate, 'inputmode="decimal"')}</div><p class="hint">Les taux sont des paramètres de saisie à adapter au dossier. En méthode FG / aléas / bénéfice : K = (1 + FG + aléas) / (1 − bénéfice sur PV).</p><button id="saveProjectInfo" class="primary" data-write>Enregistrer la fiche et les paramètres</button></section><div class="pro-columns"><section class="panel pro-card"><h3>Nomenclature des lots</h3><p>Un lot par ligne. Les lots déjà présents dans la minute restent conservés.</p><textarea id="lotList" rows="12">${esc(project.lots.join("\n"))}</textarea><button id="saveLots" class="secondary" data-write>Enregistrer les lots</button></section><section class="panel pro-card"><h3>Découpage spatial</h3><div class="pro-grid">${input("newBuilding", "Bâtiment")}${input("newLevel", "Niveau", "RDC")}${input("newRoom", "Pièce / zone")}</div><button id="addSpace" class="secondary" data-write>Ajouter la localisation</button><div class="pro-table"><table><thead><tr><th>Bâtiment</th><th>Niveau</th><th>Pièce</th></tr></thead><tbody>${project.spaces.map((s) => `<tr><td>${esc(s.building)}</td><td>${esc(s.level)}</td><td>${esc(s.room)}</td></tr>`).join("") || '<tr><td colspan="3">Aucune localisation définie.</td></tr>'}</tbody></table></div></section></div>`;
      $("saveProjectInfo").addEventListener(
        "click",
        action(() => {
          update((next) => {
            next.meta = {
              address: $("meta-address").value,
              client: $("meta-client").value,
              architect: $("meta-architect").value,
              studyDate: $("meta-date").value,
            };
            Object.assign(next.settings, {
              vat: num($("setting-vat").value),
              currency: $("setting-currency").value,
              sellMode: $("setting-mode").value,
              k: num($("setting-k").value),
              overhead: num($("setting-fg").value),
              profitRisk: num($("setting-profit-risk").value),
              risk: num($("setting-risk").value),
              margin: num($("setting-margin").value),
              hourlyRate: num($("setting-hour").value),
            });
          });
          render();
          bridge.toast("Fiche projet enregistrée.");
        }),
      );
      $("saveLots").addEventListener(
        "click",
        action(() => {
          const lots = [
            ...new Set(
              $("lotList")
                .value.split("\n")
                .map((x) => x.trim())
                .filter(Boolean),
            ),
          ];
          update((next) => (next.lots = lots));
          render();
        }),
      );
      $("addSpace").addEventListener(
        "click",
        action(() => {
          const s = {
            building: $("newBuilding").value.trim(),
            level: $("newLevel").value.trim(),
            room: $("newRoom").value.trim(),
          };
          if (!s.building && !s.level && !s.room)
            throw new Error("Renseigne au moins une localisation.");
          update((next) => {
            if (
              !next.spaces.some((x) => JSON.stringify(x) === JSON.stringify(s))
            )
              next.spaces.push(s);
          });
          render();
        }),
      );
    }
    if (view === "variables") {
      content.innerHTML = `<section class="panel pro-card"><h3>Variables liées aux dimensions</h3><p>Saisis un nom dans une dimension, par exemple <b>H_plafond</b> ou <b>Ep_dalle * 2</b>. Les calculs déjà liés sont recalculés après enregistrement.</p><div class="pro-table"><table><thead><tr><th>Nom</th><th>Valeur ou formule</th><th>Unité</th><th></th></tr></thead><tbody id="variableRows"></tbody></table></div><div class="pro-actions"><button id="addVariable" class="secondary" data-write>+ Ajouter une variable</button><button id="saveVariables" class="primary" data-write>Enregistrer et recalculer</button></div></section><section class="panel pro-card"><h3>Conversion d’unités</h3><div class="pro-grid">${input("convertValue", "Valeur", "1", 'inputmode="decimal"')}${select("convertFrom", "Depuis", ["m", "ml", "cm", "mm", "m²", "m³", "kg", "t"], "kg")}${select("convertTo", "Vers", ["m", "ml", "cm", "mm", "m²", "m³", "kg", "t"], "t")}</div><button id="doConvert" class="secondary">Convertir</button><output id="conversionResult"></output></section>`;
      const add = (v) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><input data-var-name value="${esc(v.name)}" aria-label="Nom de variable"></td><td><input data-var-value value="${esc(v.value)}" aria-label="Valeur ou formule de variable"></td><td><select data-var-unit>${["m", "cm", "mm", "m²", "m³", "kg", "t", "u", "coef", "h"].map((u) => `<option ${u === v.unit ? "selected" : ""}>${u}</option>`).join("")}</select></td><td><button class="quiet" data-write>Retirer</button></td>`;
        tr.querySelector("button").onclick = () => tr.remove();
        $("variableRows").append(tr);
      };
      project.variables.forEach(add);
      $("addVariable").onclick = () => {
        add({ name: "", value: "", unit: "m" });
        lockUI();
      };
      $("saveVariables").addEventListener(
        "click",
        action(() => {
          const vars = [...$("variableRows").children].map((tr) => ({
            name: tr.querySelector("[data-var-name]").value.trim(),
            value: tr.querySelector("[data-var-value]").value.trim(),
            unit: tr.querySelector("[data-var-unit]").value,
          }));
          update((next) => (next.variables = vars));
          render();
          bridge.toast("Variables enregistrées et calculs recalculés.");
        }),
      );
      $("doConvert").addEventListener(
        "click",
        action(() => {
          $("conversionResult").textContent =
            fmt(
              convertUnit(
                num($("convertValue").value),
                $("convertFrom").value,
                $("convertTo").value,
              ),
            ) +
            " " +
            $("convertTo").value;
        }),
      );
    }
    if (view === "minute") {
      content.innerHTML = `<section class="panel pro-card"><h3>Minute d’avant-métré</h3><p>Saisie directe, recalcul de la ligne uniquement. Entrée / Tab : cellule suivante (N → L → l → H) · flèches : navigation. Les formules acceptent les variables du projet.</p><div class="pro-grid">${select("minuteLot", "Lot", ["Tous les lots", ...new Set(project.rows.map((r) => r.lot))], "Tous les lots")}${select("minuteBuilding", "Bâtiment", ["Tous les bâtiments", ...new Set(project.rows.map((r) => r.building).filter(Boolean))], "Tous les bâtiments")}${select("minuteLevel", "Niveau", ["Tous les niveaux", ...new Set(project.rows.map((r) => r.level).filter(Boolean))], "Tous les niveaux")}${input("minuteSearch", "Rechercher une pièce ou un ouvrage", "", 'type="search"')}</div><div id="formulaAssistantSlot"></div><p id="minuteCount" class="hint" role="status"></p><div id="minuteViewport" class="pro-table virtual-viewport"><table class="minute-table"><thead><tr><th>N°</th><th>Index</th><th>Désignation / localisation</th><th>Parties semblables</th><th>Longueur</th><th>Largeur</th><th>Hauteur / ép.</th><th>Déduction (voir formule)</th><th>Qté partielle</th><th>Qté totale</th><th>Unité</th><th></th></tr></thead><tbody id="minuteRows"></tbody></table></div></section>`;
      minuteView = createMinuteView({
        container: $("minuteViewport"),
        body: $("minuteRows"),
        getProject: p,
        updateRow: bridge.updateRow,
        canWrite,
        onError: error,
      });
      minuteRefresh = () => {
        if (!minuteView) return;
        const lot = $("minuteLot").value,
          building = $("minuteBuilding").value,
          level = $("minuteLevel").value,
          query = $("minuteSearch").value.toLocaleLowerCase("fr");
        const filtered = p().rows.filter(
          (r) =>
            (lot === "Tous les lots" || r.lot === lot) &&
            (building === "Tous les bâtiments" || r.building === building) &&
            (level === "Tous les niveaux" || r.level === level) &&
            [r.label, r.room, r.location]
              .join(" ")
              .toLocaleLowerCase("fr")
              .includes(query),
        );
        minuteView.setItems(filtered);
        const label =
          p().rows.length + " lignes · " + filtered.length + " après filtres";
        if ($("minuteCount").textContent !== label)
          $("minuteCount").textContent = label;
      };
      minuteRefresh();
      document.dispatchEvent(new CustomEvent("atelier:minute-ready"));
      for (const id of ["minuteLot", "minuteBuilding", "minuteLevel"])
        $(id).onchange = minuteRefresh;
      $("minuteSearch").oninput = minuteRefresh;
      $("minuteRows").addEventListener(
        "click",
        action((event) => {
          const edit = event.target.closest("[data-edit-row]")?.dataset.editRow,
            detach =
              event.target.closest("[data-detach-row]")?.dataset.detachRow;
          if (edit) bridge.editRow(edit);
          if (detach) {
            bridge.updateRow(detach, (row) => {
              delete row.input.planLink;
            });
            minuteRefresh();
          }
        }),
      );
    }
    if (view === "assemblies") {
      const a =
        project.assemblies.find((a) => a.id === assemblyId) ||
        project.assemblies[0];
      assemblyId = a?.id;
      content.innerHTML = `<section class="panel pro-card"><div class="pro-actions">${select(
        "assemblyPicker",
        "Bibliothèque",
        project.assemblies.map((a) => [a.id, a.name]),
        assemblyId,
      )}<button id="newAssembly" class="secondary" data-write>Créer un bloc</button></div>${a ? `<div class="pro-grid">${input("assemblyName", "Nom de l’ouvrage composé", a.name)}${select("assemblyUnit", "Pour une unité de", units, a.unit)}${input("assemblyHours", "Temps unitaire (h / unité)", a.hours, 'inputmode="decimal"')}${input("assemblyEquipment", "Matériel (coût / unité)", a.equipment, 'inputmode="decimal"')}</div><p class="hint">Ratios et pertes sont des hypothèses modifiables. Les prix d’achat sont à renseigner dans la devise du projet.</p><div class="pro-table"><table><thead><tr><th>Matériau</th><th>Unité</th><th>Ratio / unité d’ouvrage</th><th>Perte (%)</th><th>Prix d’achat / unité</th><th>Fournisseur</th><th>Qté par conditionnement</th><th>Colisage (libellé)</th><th></th></tr></thead><tbody id="componentRows"></tbody></table></div><div class="pro-actions"><button id="addComponent" class="secondary" data-write>+ Matériau</button><button id="saveAssembly" class="primary" data-write>Enregistrer le bloc</button></div>` : ""}</section><section class="panel pro-card"><h3>Ratios métier — estimations de quantités</h3><p>Les ratios d’acier sont à confirmer avec l’étude de ferraillage. Ils servent à un quantitatif estimatif.</p><div class="pro-table"><table><thead><tr><th>Référence</th><th>kg / m³</th><th>Calcul</th></tr></thead><tbody id="ratioRows">${project.ratios.map((r, i) => `<tr><td>${esc(r.name)}</td><td><input data-ratio="${i}" value="${esc(r.value ?? "")}" inputmode="decimal"></td><td><button class="quiet" data-use-ratio="${i}" data-write>Calculer des aciers</button></td></tr>`).join("")}</tbody></table></div><button id="saveRatios" class="secondary" data-write>Conserver les ratios</button></section>`;
      $("assemblyPicker").onchange = (e) => {
        assemblyId = e.target.value;
        render();
      };
      $("newAssembly").addEventListener(
        "click",
        action(() => {
          const aid = crypto.randomUUID();
          update((next) =>
            next.assemblies.push({
              id: aid,
              name: "Nouvel ouvrage composé",
              unit: "m²",
              hours: 0,
              equipment: 0,
              components: [],
            }),
          );
          assemblyId = aid;
          render();
        }),
      );
      if (a) {
        const add = (c) => {
          const tr = document.createElement("tr");
          tr.dataset.componentId = c.id;
          tr.innerHTML = `<td><input data-c="name" value="${esc(c.name)}"></td><td><select data-c="unit">${units.map((u) => `<option ${u === c.unit ? "selected" : ""}>${u}</option>`).join("")}</select></td>${[
            ["ratio", c.ratio],
            ["waste", c.waste],
            ["unitCost", c.unitCost],
          ]
            .map(
              ([key, v]) =>
                `<td><input data-c="${key}" value="${esc(v ?? "")}" inputmode="decimal"></td>`,
            )
            .join(
              "",
            )}<td><input data-c="supplier" value="${esc(c.supplier)}"></td><td><input data-c="packSize" value="${esc(c.packSize ?? 1)}" inputmode="decimal"></td><td><input data-c="packLabel" value="${esc(c.packLabel || 'colis')}" maxlength="80"></td><td><button class="quiet" data-write>Retirer</button></td>`;
          tr.querySelector("button").onclick = () => tr.remove();
          tr.querySelectorAll("input,select").forEach((el) =>
            el.setAttribute(
              "aria-label",
              (el.dataset.c || "") + " · " + c.name,
            ),
          );
          $("componentRows").append(tr);
        };
        a.components.forEach(add);
        $("addComponent").onclick = () => {
          add({
            id: crypto.randomUUID(),
            name: "",
            unit: "u",
            ratio: 1,
            waste: 0,
            unitCost: null,
            supplier: "À définir",
            packSize: 1,
          });
          lockUI();
        };
        $("saveAssembly").addEventListener(
          "click",
          action(() => {
            const components = [...$("componentRows").children].map((tr) => {
              const get = (key) => tr.querySelector(`[data-c="${key}"]`).value;
              return {
                id: tr.dataset.componentId,
                name: get("name").trim(),
                unit: get("unit"),
                ratio: num(get("ratio")),
                waste: num(get("waste")),
                unitCost:
                  get("unitCost").trim() === "" ? null : num(get("unitCost")),
                supplier: get("supplier").trim() || "À définir",
                packSize: num(get("packSize")),
                packLabel: get("packLabel").trim() || "colis",
              };
            });
            if (components.some((c) => !c.name))
              throw new Error("Chaque matériau doit avoir un nom.");
            update((next) => {
              Object.assign(
                next.assemblies.find((x) => x.id === assemblyId),
                {
                  name: $("assemblyName").value.trim(),
                  unit: $("assemblyUnit").value,
                  hours: num($("assemblyHours").value),
                  equipment: num($("assemblyEquipment").value),
                  components,
                },
              );
            });
            render();
            bridge.toast(
              "Bloc enregistré ; besoins et études de prix mis à jour.",
            );
          }),
        );
      }
      workspace.querySelectorAll("[data-use-ratio]").forEach(
        (button) =>
          (button.onclick = () => {
            const value = workspace.querySelector(
              `[data-ratio="${button.dataset.useRatio}"]`,
            ).value;
            try {
              if (!value.trim()) throw new Error("Renseigne d’abord le ratio.");
              bridge.useRatio(num(value));
            } catch (e) {
              error(e);
            }
          }),
      );
      $("saveRatios").addEventListener(
        "click",
        action(() => {
          update((next) => {
            for (const el of workspace.querySelectorAll("[data-ratio]"))
              next.ratios[Number(el.dataset.ratio)].value =
                el.value.trim() === "" ? null : num(el.value);
          });
          bridge.toast("Ratios conservés.");
        }),
      );
    }
    if (view === "prices") {
      const fin = financialSummary(project),
        r = project.rows.find((r) => r.id === rowId) || project.rows[0];
      rowId = r?.id;
      content.innerHTML = `<div class="finance-cards"><div><span>Total HT renseigné</span><strong>${currency(fin.ht, project)}</strong></div><div><span>TVA · ${project.settings.vat} %</span><strong>${currency(fin.tax, project)}</strong></div><div><span>Total TTC renseigné</span><strong>${currency(fin.ttc, project)}</strong></div></div><p class="hint">${fin.missing ? fin.missing + " ligne(s) sans prix : total incomplet." : "Tous les prix sont renseignés."} ${project.approval ? "Chiffrage validé le " + new Date(project.approval.date).toLocaleString("fr-FR") : "Chiffrage en préparation."}</p><section class="panel pro-card">${
        r
          ? `${select(
              "priceRow",
              "Ligne à chiffrer",
              project.rows.map((r) => [
                r.id,
                (r.code || r.rowNumber || "") + " · " + r.label,
              ]),
              rowId,
            )}<div class="pro-grid">${select(
              "priceMode",
              "Valorisation",
              [
                ["manual", "PV HT saisi"],
                ["study", "Étude de prix : DS × K"],
              ],
              r.pricingMode || "manual",
            )}${select(
              "priceAssembly",
              "Ouvrage composé",
              [
                ["", "Aucun bloc · matériaux saisis directement"],
                ...project.assemblies
                  .filter((a) => {
                    try {
                      convertUnit(1, r.result.unit, a.unit);
                      return true;
                    } catch {
                      return false;
                    }
                  })
                  .map((a) => [a.id, a.name]),
              ],
              r.assemblyId || "",
            )}${input("priceMaterials", "Matériaux : coût par unité d’ouvrage", r.costs?.materials ?? 0, 'inputmode="decimal"')}${input("priceHours", "Temps unitaire (h / unité)", r.costs?.hours ?? studyPrice(r, project).hours, 'inputmode="decimal"')}${input("priceHourly", "Coût horaire", r.costs?.hourlyRate ?? project.settings.hourlyRate, 'inputmode="decimal"')}${input("priceEquipment", "Matériel : coût par unité d’ouvrage", r.costs?.equipment ?? studyPrice(r, project).equipment, 'inputmode="decimal"')}${input("priceK", "K dérogatoire (facultatif)", r.costs?.kOverride ?? "", 'inputmode="decimal" data-director')}${input("priceManual", "PV HT saisi", r.unitPrice ?? "", 'inputmode="decimal"')}</div><div id="pricePreview" class="study-preview"></div><button id="savePrice" class="primary" data-write>Enregistrer l’étude de cette ligne</button>`
          : "<p>Ajoute un ouvrage à la minute pour commencer le chiffrage.</p>"
      }</section><section class="panel pro-card"><h3>Validation du dirigeant</h3><p>Chaque modification d’un projet remet le chiffrage en préparation. La validation est enregistrée dans l’historique en ligne.</p><button id="approveProject" class="primary" data-director>Valider le chiffrage</button></section>`;
      if (r) {
        $("priceRow").onchange = (e) => {
          rowId = e.target.value;
          render();
        };
        const draft = () => ({
          ...r,
          assemblyId: $("priceAssembly").value || null,
          pricingMode: $("priceMode").value,
          costs: {
            materials: num($("priceMaterials").value),
            hours: num($("priceHours").value),
            hourlyRate: num($("priceHourly").value),
            equipment: num($("priceEquipment").value),
            kOverride:
              $("priceK").value.trim() === "" ? null : num($("priceK").value),
          },
          unitPrice:
            $("priceManual").value.trim() === ""
              ? null
              : parseUnitPrice($("priceManual").value),
        });
        const preview = () => {
          try {
            const d = draft(),
              s = studyPrice(d, p());
            $("priceMaterials").disabled = !!d.assemblyId || !canWrite();
            $("pricePreview").innerHTML =
              `<p>DS unitaire = matériaux + temps × coût horaire + matériel</p><strong>${currency(s.materials, p())} + ${fmt(s.hours)} h × ${currency(s.hourly, p())} + ${currency(s.equipment, p())} = ${currency(s.ds, p())}</strong><p>PV HT = DS × K = ${currency(s.ds, p())} × ${fmt(s.k, 4)} = <b>${currency(s.pv, p())}</b></p>${s.missing ? `<p class="deduction-value">${s.missing} prix matériau(x) à compléter avant calcul du PV.</p>` : ""}`;
          } catch (e) {
            $("pricePreview").textContent = e.message;
          }
        };
        workspace
          .querySelectorAll("#proContent input,#proContent select")
          .forEach((el) => el.addEventListener("input", preview));
        $("priceAssembly").onchange = () => {
          const a = p().assemblies.find(
            (a) => a.id === $("priceAssembly").value,
          );
          if (a) {
            const factor = convertUnit(1, r.result.unit, a.unit);
            $("priceHours").value = a.hours * factor;
            $("priceEquipment").value = a.equipment * factor;
          }
          preview();
        };
        preview();
        $("savePrice").addEventListener(
          "click",
          action(() => {
            const d = draft();
            bridge.updateRow(rowId, (row) => Object.assign(row, d));
            render();
            bridge.toast("Étude de prix enregistrée.");
          }),
        );
      }
      $("approveProject").addEventListener(
        "click",
        action(async () => {
          await cloud.approve();
          render();
          bridge.toast("Chiffrage validé.");
        }),
      );
    }
    if (view === "needs") {
      const needs = needsBySupplier(project);
      content.innerHTML = `<section class="panel pro-card"><h3>Besoins regroupés par fournisseur</h3><p>Les matériaux viennent des blocs affectés aux lignes. Les pertes s’appliquent avant le calcul des conditionnements ; les déductions sont soustraites.</p><div class="pro-table"><table><thead><tr><th>Fournisseur</th><th>Matériau</th><th>Unité</th><th>Besoin net</th><th>Avec pertes</th><th>Qté / conditionnement</th><th>Conditionnements</th></tr></thead><tbody>${needs.map((n) => `<tr><td>${esc(n.supplier)}</td><td>${esc(n.name)}</td><td>${n.unit}</td><td>${fmt(n.net, 3)}</td><td>${fmt(n.quantity, 3)}</td><td>${fmt(n.packSize)}</td><td><b>${n.packages}</b></td></tr>`).join("") || '<tr><td colspan="7">Affecte un ouvrage composé à une ligne dans Étude de prix pour obtenir ses besoins.</td></tr>'}</tbody></table></div><button id="needsCsv" class="secondary">↓ Liste fournisseurs CSV</button><button id="needsExcel" class="secondary">↓ Besoins Excel</button><button id="ordersPdf" class="secondary">↓ Préparations de commande PDF</button></section>`;
      $("needsExcel").addEventListener(
        "click",
        action(() => exportNeedsWorkbook(p())),
      );
      $("ordersPdf").addEventListener(
        "click",
        action(() => exportOrdersPdf(p())),
      );
      $("needsCsv").onclick = () => {
        const rows = [
          [
            "Fournisseur",
            "Matériau",
            "Unité",
            "Besoin net",
            "Avec pertes",
            "Qté par conditionnement",
            "Nb conditionnements",
          ],
          ...needs.map((n) => [
            n.supplier,
            n.name,
            n.unit,
            n.net,
            n.quantity,
            n.packSize,
            n.packages,
          ]),
        ];
        saveBlob(
          "\uFEFF" + rows.map((r) => r.map(csvValue).join(";")).join("\r\n"),
          safeName(p().title) + "_Besoins_fournisseurs.csv",
          "text/csv;charset=utf-8",
        );
      };
    }
    if (view === "exports") {
      content.innerHTML = `<div class="pro-columns"><section class="panel pro-card"><h3>Livrables du chantier</h3><p>Le classeur contient la fiche projet, les variables, les détails de calcul, la minute, l’étude de prix, la DPGF, le BPU et les besoins fournisseurs.</p><button id="exportXlsx" class="primary">↓ DPGF / BPU avec formules (.xlsx)</button><button id="exportPdf" class="secondary">↓ Minute justificative (.pdf)</button><p class="hint">Modifie les données et prix dans les feuilles de détail : les bordereaux utilisent des formules liées. Le PDF est en A4 paysage.</p></section><section class="panel pro-card"><h3>Importer une trame DPGF / BPU</h3><p>Formats .xlsx et CSV à séparateur point-virgule. Colonnes reconnues : Code, Désignation, Unité, Quantité, PV HT, Lot.</p>${select("scheduleMode", "Type de trame", ["BPU", "DPGF"], "BPU")}<label class="check-line"><input id="scheduleQuantities" type="checkbox"> Ajouter également les quantités comme lignes de minute</label><button id="scheduleTemplate" class="secondary">↓ Trame type Excel</button><input id="scheduleFile" type="file" accept=".xlsx,.csv" data-write><div id="scheduleResult" role="status"></div><p class="hint">Le BPU importé est disponible dans le calculateur pour reprendre une désignation, son lot, son unité et son prix.</p></section></div><section class="panel pro-card"><h3>Bordereau de référence</h3><div class="pro-table"><table><thead><tr><th>Code</th><th>Désignation</th><th>Unité</th><th>PV HT</th><th>Lot</th></tr></thead><tbody>${project.bpu.map((b) => `<tr><td>${esc(b.code)}</td><td>${esc(b.label)}</td><td>${b.unit}</td><td>${b.unitPrice === null ? "—" : currency(b.unitPrice, project)}</td><td>${esc(b.lot)}</td></tr>`).join("") || '<tr><td colspan="5">Aucun bordereau importé.</td></tr>'}</tbody></table></div></section>`;
      $("exportXlsx").addEventListener(
        "click",
        action(() => exportWorkbook(p())),
      );
      $("exportPdf").addEventListener(
        "click",
        action(() => exportMinutePdf(p())),
      );
      $("scheduleTemplate").addEventListener(
        "click",
        action(exportScheduleTemplate),
      );
      $("scheduleFile").addEventListener(
        "change",
        action(async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const rows = await readSchedule(file, $("scheduleMode").value),
            addQuantities = $("scheduleQuantities").checked;
          if (addQuantities && p().rows.length + rows.length > 2000)
            throw new Error("Le projet dépasserait 2 000 lignes.");
          update((next) => {
            next.bpu.push(...rows);
            for (const b of rows) {
              if (!next.lots.includes(b.lot)) next.lots.push(b.lot);
              if (addQuantities) {
                const input = {
                  preset: "reprise",
                  outputUnit: b.unit,
                  dimensionUnit: "m",
                  dimensions: { Q: String(b.quantity) },
                  count: "1",
                  deduction: "0",
                  openings: [],
                };
                next.rows.push({
                  id: crypto.randomUUID(),
                  rowNumber: b.code,
                  code: "",
                  report: "",
                  label: b.label,
                  lot: b.lot,
                  location: "",
                  unitPrice: b.unitPrice,
                  bpuId: b.id,
                  input,
                  result: calculate(input, next.variables, next),
                });
              }
            }
          });
          render();
          bridge.toast(rows.length + " articles de bordereau importés.");
        }),
      );
    }
    if (view === "history") {
      const s = cloud?.state();
      content.innerHTML = `<div class="pro-columns"><section class="panel pro-card"><h3>Indices et révisions</h3><p>${s?.online ? "Les révisions sont conservées en ligne." : "Les révisions locales sont incluses dans la sauvegarde JSON ; maximum 10 par navigateur."}</p>${input("revisionLabel", "Libellé de révision", "")}<button id="saveRevision" class="primary" data-write>Enregistrer une révision</button><div id="revisionList" class="history-list">Chargement…</div></section><section class="panel pro-card"><h3>Droits d’accès au projet</h3><p>Métreur : saisie et quantités. Conducteur : consultation et besoins, sans prix. Dirigeant : coefficients et validation du chiffrage.</p><p class="hint">Ces rôles concernent les personnes déjà autorisées dans le partage du Site dans ChatGPT. Aucun accès au Site ni e-mail d’invitation n’est créé automatiquement.</p>${
        s?.online && s.role === "owner"
          ? `${input("memberEmail", "Adresse e-mail de la personne", "", 'type="email"')}${select(
              "memberRole",
              "Rôle",
              [
                ["metreur", "Métreur"],
                ["conducteur", "Conducteur de travaux"],
                ["dirigeant", "Dirigeant"],
              ],
              "metreur",
            )}<button id="saveMember" class="secondary">Enregistrer le rôle du projet</button><div id="memberList"></div>`
          : '<p class="hint">Gestion des membres réservée au propriétaire connecté.</p>'
      }</section></div>`;
      const showRevisions = async () => {
        const list = await cloud.revisions();
        if (!$("revisionList")) return;
        $("revisionList").innerHTML =
          list
            .map(
              (r) =>
                `<div><span><b>${esc(r.label)}</b><small>${new Date(r.createdAt || r.created_at).toLocaleString("fr-FR")}</small></span><button class="secondary" data-restore="${esc(r.id)}" ${canWrite() ? "" : "disabled"}>Restaurer</button></div>`,
            )
            .join("") || "Aucune révision enregistrée.";
      };
      showRevisions().catch(error);
      $("saveRevision").addEventListener(
        "click",
        action(async () => {
          await cloud.saveRevision($("revisionLabel").value.trim());
          await showRevisions();
          bridge.toast("Révision conservée.");
        }),
      );
      $("revisionList").addEventListener(
        "click",
        action(async (e) => {
          const rid = e.target.closest("[data-restore]")?.dataset.restore;
          if (rid) {
            await cloud.restoreRevision(rid);
            render();
          }
        }),
      );
      if ($("saveMember")) {
        const showMembers = async () => {
          const list = await cloud.members();
          if (!$("memberList")) return;
          $("memberList").innerHTML =
            list
              .map(
                (m) =>
                  `<div class="member-line"><span>${esc(m.email)} · ${esc(ROLES[m.role])}</span><button class="quiet" data-remove-member="${esc(m.id)}">Retirer</button></div>`,
              )
              .join("") ||
            '<p class="hint">Seul le propriétaire a accès au projet pour le moment.</p>';
        };
        showMembers().catch(error);
        $("saveMember").addEventListener(
          "click",
          action(async () => {
            await cloud.saveMember(
              $("memberEmail").value.trim(),
              $("memberRole").value,
            );
            await showMembers();
            bridge.toast("Rôle enregistré pour ce projet.");
          }),
        );
        $("memberList").addEventListener(
          "click",
          action(async (e) => {
            const mid = e.target.closest("[data-remove-member]")?.dataset
              .removeMember;
            if (
              mid &&
              (await bridge.confirm(
                "Retirer ce membre du projet ?",
                "Son rôle pourra être rétabli en saisissant à nouveau son adresse e-mail.",
              ))
            ) {
              await cloud.removeMember(mid);
              await showMembers();
            }
          }),
        );
      }
    }
    lockUI(true);
  }
  cloud = initCloud({
    get: bridge.get,
    encode: bridge.encode,
    replace: bridge.replace,
    empty: () =>
      upgradeProject({ version: 1, title: "Nouveau chantier", rows: [] }),
    syncFields: bridge.syncFields,
    syncPlan: () => bridge.syncPlan?.(),
    confirm: bridge.confirm,
    onStatus,
    localRevision: (label) => {
      update((next) => {
        const revision = snapshotProject(next, label);
        next.revisions = [...(next.revisions || []).slice(-9), revision];
      });
    },
    restoreLocal: (rid) => {
      const rev = p().revisions.find((r) => r.id === rid);
      if (!rev) throw new Error("Révision introuvable.");
      const safety = snapshotProject(p(), "Avant restauration"),
        history = [...p().revisions.slice(-8), safety];
      bridge.replace({ ...rev.data, revisions: history });
    },
  });
  return {
    show: render,
    onPersist: () => cloud.changed(),
    afterRows: lockUI,
    onRowsChanged: () => minuteRefresh?.(),
    createProject: async () => {
      if (
        p().rows.length &&
        !(await bridge.confirm(
          "Créer un nouveau chantier ?",
          "Le projet courant est conservé en ligne s’il est synchronisé. Télécharge une sauvegarde pour conserver un brouillon local.",
        ))
      )
        return;
      await cloud.create();
      render(current);
    },
    isReadOnly: () =>
      cloud.state().online && cloud.state().role === "conducteur",
    isDirector,
    approvePricing:async()=>{if(!isDirector())throw new Error('Validation réservée au dirigeant.');await cloud.approve();bridge.toast('Chiffrage validé.');},
    saveAsset: (file) => cloud.saveAsset(file),
    loadAsset: (aid) => cloud.loadAsset(aid),
    state: () => cloud.state(),
  };
}
