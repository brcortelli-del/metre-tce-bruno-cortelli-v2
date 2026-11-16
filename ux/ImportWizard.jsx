import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Upload,
  FileSpreadsheet,
  Layers,
  Box,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  LoaderCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { readCadBim } from "../public/import-client.js";
import {
  METRICS,
  guessColumns,
  headerUnit,
  mapTable,
  groupRecords,
  buildImportedRows,
} from "../public/import-core.js";
import { canonicalUnit } from "../public/expression.js";
import { lotColor } from "../public/lot-colors.js";
import { LotBadge } from "./components.jsx";
const fieldLabels = {
  layer: "Calque",
  family: "Famille / catégorie",
  type: "Type / bloc",
  level: "Niveau",
  building: "Bâtiment",
  room: "Pièce",
  label: "Désignation",
  ...METRICS,
};
const measureUnit = (u) =>
  canonicalUnit(
    String(u || "")
      .toLowerCase()
      .replaceAll("²", "2")
      .replaceAll("³", "3"),
  );
function initialMappings(groups, lot) {
  return Object.fromEntries(
    groups.map((g) => {
      const valid = Object.entries(g.measures).filter(
        ([, m]) => !m.errors.length,
      );
      const measure = valid.length === 1 ? valid[0][0] : "";
      return [
        g.id,
        {
          include: true,
          lot,
          workCode: "",
          workUnit: "",
          measure,
          label: g.label || g.type || g.layer || "Ouvrage importé",
        },
      ];
    }),
  );
}
export function ImportWizard({ bridge, catalogue = [] }) {
  const input = useRef(null),
    abort = useRef(null),
    currentFile = useRef(null),
    generation = useRef(0);
  const [fileMeta, setFileMeta] = useState(null),
    [result, setResult] = useState(null),
    [tableId, setTableId] = useState(0),
    [columns, setColumns] = useState({}),
    [declaredUnits, setDeclaredUnits] = useState({
      length: "",
      area: "",
      volume: "",
    }),
    [dxfUnit, setDxfUnit] = useState("");
  const [groups, setGroups] = useState([]),
    [mappings, setMappings] = useState({}),
    [warnings, setWarnings] = useState([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [drag, setDrag] = useState(false),
    [page, setPage] = useState(0),
    [query, setQuery] = useState(""),
    [injected, setInjected] = useState(false);
  const [bulkLot, setBulkLot] = useState(
      bridge.get().lots[0] || "Terrassement",
    ),
    [bulkMeasure, setBulkMeasure] = useState(""),
    [bulkWork, setBulkWork] = useState(""),
    [injecting, setInjecting] = useState(false);
  useEffect(
    () => () => {
      generation.current++;
      abort.current?.abort();
    },
    [],
  );
  const load = async (file, unit = "") => {
    if (!file) return;
    const gen = ++generation.current;
    abort.current?.abort();
    abort.current = new AbortController();
    currentFile.current = file;
    setFileMeta({ name: file.name, size: file.size });
    setBusy("Lecture locale du fichier…");
    setError("");
    setInjected(false);
    setGroups([]);
    setResult(null);
    setQuery("");
    setPage(0);
    try {
      const r = await readCadBim(file, {
        signal: abort.current.signal,
        unit,
        onProgress: (m) => gen === generation.current && setBusy(m),
      });
      if (gen !== generation.current) return;
      setResult(r);
      setWarnings(r.warnings || []);
      if (r.tables) {
        setTableId(0);
        setColumns(guessColumns(r.tables[0].headers));
        setDeclaredUnits({ length: "", area: "", volume: "" });
      } else {
        const gs = groupRecords(r.records);
        if (!gs.length)
          throw new Error("Aucun objet mesurable dans ce fichier.");
        setGroups(gs);
        setMappings(initialMappings(gs, bulkLot));
        setDxfUnit(unit || r.detectedUnit || "");
      }
      bridge.toast(
        "Fichier lu. Vérifie les unités et les correspondances avant injection.",
      );
    } catch (e) {
      if (e.name !== "AbortError" && gen === generation.current)
        setError(e.message);
    } finally {
      if (gen === generation.current) setBusy("");
    }
  };
  const table = result?.tables?.[tableId];
  const mapColumns = () => {
    try {
      const r = mapTable(table, columns, declaredUnits),
        gs = groupRecords(r.records);
      setGroups(gs);
      setMappings(initialMappings(gs, bulkLot));
      setWarnings([...(result.warnings || []), ...r.warnings]);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };
  const filtered = useMemo(
    () =>
      groups.filter((g) =>
        [g.layer, g.family, g.type, g.level, g.label]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [groups, query],
  );
  const visible = filtered.slice(page * 20, page * 20 + 20),
    pages = Math.max(1, Math.ceil(filtered.length / 20));
  const setMapping = useCallback(
    (id, patch) =>
      setMappings((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })),
    [],
  );
  const workByCode = useMemo(
    () => new Map(catalogue.map((w) => [w.code, w])),
    [catalogue],
  );
  const selectWork = useCallback(
    (id, code) => {
      const w = workByCode.get(code),
        g = groups.find((g) => g.id === id),
        u = measureUnit(w?.unite),
        candidates =
          g &&
          Object.entries(g.measures).filter(
            ([, m]) => m.unit === u && !m.errors.length,
          );
      setMapping(id, {
        workCode: code,
        workUnit: u || "",
        ...(w
          ? {
              label: w.designation_courte,
              ...(candidates.length === 1 ? { measure: candidates[0][0] } : {}),
            }
          : {}),
      });
    },
    [groups, workByCode, setMapping],
  );
  const selected = groups.filter((g) => mappings[g.id]?.include);
  const invalid = selected.filter((g) => {
    const m = mappings[g.id],
      q = g.measures[m.measure];
    return (
      !q || q.errors.length || !m.lot || (m.workUnit && m.workUnit !== q.unit)
    );
  });
  const measureOptions = [
    ...new Set(groups.flatMap((g) => Object.keys(g.measures))),
  ];
  const assignBulk = () => {
    const w = workByCode.get(bulkWork),
      unit = measureUnit(w?.unite);
    setMappings((prev) => {
      const next = { ...prev };
      for (const g of filtered)
        if (prev[g.id]?.include) {
          const candidates = Object.entries(g.measures).filter(
            ([, m]) => m.unit === unit && !m.errors.length,
          );
          next[g.id] = {
            ...prev[g.id],
            lot: bulkLot,
            ...(bulkWork
              ? {
                  workCode: bulkWork,
                  workUnit: unit,
                  label: w.designation_courte,
                }
              : {}),
            ...(bulkMeasure && g.measures[bulkMeasure]
              ? { measure: bulkMeasure }
              : bulkWork && candidates.length === 1
                ? { measure: candidates[0][0] }
                : {}),
          };
        }
      return next;
    });
    bridge.toast(
      "Correspondances appliquées aux groupes cochés du filtre courant.",
    );
  };
  const inject = async () => {
    if (injecting) return;
    setInjecting(true);
    setError("");
    try {
      const rows = buildImportedRows(
        groups,
        mappings,
        currentFile.current.name,
      );
      await bridge.inject(rows);
      setInjected(true);
      bridge.toast(rows.length + " lignes injectées et trame CCTP associée.");
    } catch (e) {
      setError(e.message);
    } finally {
      setInjecting(false);
    }
  };
  const lotNames = bridge.get().lots.join("\u0001");
  const worksByLot = useMemo(
    () =>
      new Map(
        lotNames
          .split("\u0001")
          .map((lot) => [
            lot,
            catalogue.filter(
              (w) =>
                (w.lotName === lot ||
                  lotColor(w.lotName).key === lotColor(lot).key) &&
                ["m", "m²", "m³", "u"].includes(measureUnit(w.unite)),
            ),
          ]),
      ),
    [catalogue, lotNames],
  );
  const workOptions = (lot) => worksByLot.get(lot) || [];
  return (
    <div className="ux-import">
      <div className="ux-page-heading">
        <div>
          <span className="ux-overline">PASSERELLE CAO / BIM</span>
          <h1>
            Du dessin à la minute<span className="heading-dot">.</span>
          </h1>
          <p>
            Importe les données, vérifie les correspondances, puis garde la main
            sur chaque quantité.
          </p>
        </div>
        <span className="ux-chip">
          <ShieldCheck size={15} />
          Lecture dans ton navigateur
        </span>
      </div>
      <div className="import-steps">
        {["Fichier source", "Correspondances", "Injection dans la minute"].map(
          (s, i) => (
            <div
              key={s}
              className={
                (i === 0 && !groups.length) ||
                (i === 1 && groups.length && !injected) ||
                (i === 2 && injected)
                  ? "current"
                  : ""
              }
            >
              <span>{i + 1}</span>
              {s}
            </div>
          ),
        )}
      </div>
      <input
        data-tour="cao-file" ref={input}
        type="file"
        accept=".dxf,.csv,.xlsx,.ifc"
        hidden
        onChange={(e) => {
          load(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {!result && !busy && (
        <>
          <button
            className={"import-drop " + (drag ? "dragging" : "")}
            onClick={() => input.current.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (e.dataTransfer.files.length !== 1) {
                setError("Dépose un seul fichier à la fois.");
                return;
              }
              load(e.dataTransfer.files[0]);
            }}
          >
            <span className="upload-symbol">
              <Upload size={30} />
            </span>
            <strong>Dépose ton fichier ici</strong>
            <span>ou clique pour le choisir · 35 Mo maximum</span>
            <span className="format-chips">
              {["DXF", "CSV", "XLSX", "IFC"].map((f) => (
                <b key={f}>{f}</b>
              ))}
            </span>
          </button>
          <div className="import-source-cards">
            <article>
              <span className="source-icon amber">
                <Layers size={24} />
              </span>
              <h3>AutoCAD</h3>
              <p>
                Calques, lignes et polylignes fermées. Les blocs INSERT
                deviennent des comptages.
              </p>
              <small>DXF ou CSV de la commande EXTRACDONNEES</small>
            </article>
            <article>
              <span className="source-icon violet">
                <Box size={24} />
              </span>
              <h3>Revit & IFC</h3>
              <p>
                Familles, types, niveaux et quantités exportées. Choisis une
                mesure pour chaque groupe.
              </p>
              <small>Nomenclature CSV / XLSX ou IFC avec QTO</small>
            </article>
          </div>
          <div className="import-examples">
            <FileSpreadsheet size={18} />
            <span>Essayer avec un fichier témoin :</span>
            <a href="/examples/autocad.dxf" download>
              DXF
            </a>
            <a href="/examples/revit.csv" download>
              CSV
            </a>
            <a href="/examples/revit.xlsx" download>
              XLSX
            </a>
            <a href="/examples/mur-qto.ifc" download>
              IFC
            </a>
          </div>
        </>
      )}
      {busy && (
        <div className="ux-loading">
          <LoaderCircle className="spin" size={28} />
          <h3>{busy}</h3>
          <p>Tu peux annuler la lecture à tout moment.</p>
          <button
            className="ux-button"
            onClick={() => {
              generation.current++;
              abort.current?.abort();
              setBusy("");
            }}
          >
            Annuler l’import
          </button>
        </div>
      )}
      {result && (
        <div className="import-file-summary">
          <div className="file-summary-title">
            <FileSpreadsheet size={22} />
            <div>
              <b>{fileMeta?.name}</b>
              <small>
                {result.format?.toUpperCase()}
                {result.schema ? " · " + result.schema : ""} ·{" "}
                {(fileMeta?.size / 1024).toLocaleString("fr-FR", {
                  maximumFractionDigits: 0,
                })}{" "}
                Ko
              </small>
            </div>
          </div>
          <button className="ux-button" onClick={() => input.current.click()}>
            <Upload size={15} />
            Changer de fichier
          </button>
        </div>
      )}
      {result?.format === "dxf" && (
        <div className="ux-notice">
          <InfoIcon />
          <div>
            <b>Unité du dessin</b>
            <p>
              Détectée : {result.detectedUnit || "non renseignée"}. Le facteur
              s’applique aux longueurs et au carré pour les surfaces.
            </p>
          </div>
          <select
            aria-label="Unité DXF"
            value={dxfUnit}
            onChange={(e) => setDxfUnit(e.target.value)}
          >
            <option value="">À préciser</option>
            {["mm", "cm", "m", "in", "ft"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <button
            className="ux-button"
            onClick={() => load(currentFile.current, dxfUnit)}
          >
            Recalculer le DXF
          </button>
        </div>
      )}
      {table && !groups.length && (
        <section className="ux-card column-mapping">
          <div className="ux-section-heading">
            <div>
              <h2>Reconnaître les colonnes</h2>
              <p>
                Vérifie la correspondance des champs et les unités d’export.
              </p>
            </div>
            <select
              aria-label="Feuille du classeur"
              value={tableId}
              onChange={(e) => {
                const i = Number(e.target.value);
                setTableId(i);
                setColumns(guessColumns(result.tables[i].headers));
              }}
            >
              {result.tables.map((t, i) => (
                <option key={i} value={i}>
                  {t.name} · {t.rows.length} lignes
                </option>
              ))}
            </select>
          </div>
          <div className="column-grid">
            {Object.entries(fieldLabels).map(([k, label]) => (
              <label key={k}>
                {label}
                <select
                  value={columns[k] ?? -1}
                  onChange={(e) =>
                    setColumns((p) => ({ ...p, [k]: Number(e.target.value) }))
                  }
                >
                  <option value={-1}>Non présent</option>
                  {table.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {i + 1} · {h}
                    </option>
                  ))}
                </select>
                {["length", "area", "volume"].includes(k) &&
                  columns[k] >= 0 && (
                    <select
                      aria-label={"Unité de " + label}
                      value={
                        headerUnit(table.headers[columns[k]]) ||
                        declaredUnits[k] ||
                        ""
                      }
                      disabled={!!headerUnit(table.headers[columns[k]])}
                      onChange={(e) =>
                        setDeclaredUnits((p) => ({ ...p, [k]: e.target.value }))
                      }
                    >
                      <option value="">Unité à préciser</option>
                      {(k === "length"
                        ? ["mm", "cm", "m", "ft"]
                        : k === "area"
                          ? ["mm2", "cm2", "m2", "ft2"]
                          : ["mm3", "cm3", "m3", "ft3"]
                      ).map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  )}
              </label>
            ))}
          </div>
          <div className="ux-preview-table">
            <table>
              <thead>
                <tr>
                  {table.headers.slice(0, 10).map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    {r.slice(0, 10).map((c, j) => (
                      <td key={j}>{String(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ux-actions">
            <button className="ux-button primary" onClick={mapColumns}>
              Vérifier et regrouper
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
      {warnings.length > 0 && (
        <details className="import-warnings">
          <summary>
            <AlertTriangle size={16} />
            Points à vérifier ({warnings.length})
          </summary>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
      {groups.length > 0 && !injected && (
        <section className="ux-card mapping-panel">
          <div className="ux-section-heading">
            <div>
              <h2>Correspondances & aperçu</h2>
              <p>
                {result.records?.length || table?.rows.length} objets ·{" "}
                {groups.length} groupes · aucun ajout au projet à ce stade
              </p>
            </div>
            <label className="ux-search">
              <Search size={16} />
              <input
                value={query}
                placeholder="Calque, type, niveau…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
          </div>
          <div className="mapping-bulk">
            <span>Affectation groupée</span>
            <select
              aria-label="Lot groupé"
              value={bulkLot}
              onChange={(e) => setBulkLot(e.target.value)}
            >
              {bridge.get().lots.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <select
              aria-label="Ouvrage groupé"
              value={bulkWork}
              onChange={(e) => setBulkWork(e.target.value)}
            >
              <option value="">Ouvrage libre</option>
              {workOptions(bulkLot).map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} · {w.designation_courte}
                </option>
              ))}
            </select>
            <select
              aria-label="Mesure groupée"
              value={bulkMeasure}
              onChange={(e) => setBulkMeasure(e.target.value)}
            >
              <option value="">Conserver les mesures choisies</option>
              {measureOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button className="ux-button" onClick={assignBulk}>
              Appliquer aux groupes cochés
            </button>
          </div>
          <div className="mapping-selection">
            <label>
              <input
                type="checkbox"
                checked={
                  !!filtered.length &&
                  filtered.every((g) => mappings[g.id]?.include)
                }
                onChange={(e) => {
                  const checked = e.target.checked;
                  setMappings((p) => {
                    const n = { ...p };
                    filtered.forEach(
                      (g) => (n[g.id] = { ...p[g.id], include: checked }),
                    );
                    return n;
                  });
                }}
              />
              Tout sélectionner dans ce filtre
            </label>
            <span>
              {selected.length} cochés · {invalid.length} à compléter
            </span>
          </div>
          <div className="mapping-table-wrap">
            <table className="mapping-table">
              <thead>
                <tr>
                  <th>Inclure</th>
                  <th>Source / Niveau</th>
                  <th>Lot</th>
                  <th>Ouvrage / désignation CCTP</th>
                  <th>Mesure retenue</th>
                  <th>Quantité</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((g) => (
                  <MappingRow
                    key={g.id}
                    g={g}
                    m={mappings[g.id]}
                    lots={bridge.get().lots}
                    works={worksByLot.get(mappings[g.id].lot) || []}
                    onPatch={setMapping}
                    onWork={selectWork}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mapping-pagination">
            <span>
              {filtered.length} groupes · page {Math.min(page + 1, pages)} /{" "}
              {pages}
            </span>
            <button
              className="ux-icon-button"
              aria-label="Page précédente"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="ux-icon-button"
              aria-label="Page suivante"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="import-inject">
            <div>
              <b>{selected.length} ligne(s) prêtes à être vérifiées</b>
              <p>
                Les lignes et leur trame CCTP seront ajoutées en une seule
                opération. Les quantités et les prix restent exclus du CCTP.
              </p>
              {invalid.length > 0 && (
                <small>
                  {invalid.length} groupe(s) coché(s) demandent une mesure
                  valide et une unité compatible.
                </small>
              )}
            </div>
            <button
              className="ux-button primary"
              disabled={
                !selected.length ||
                invalid.length > 0 ||
                bridge.readOnly() ||
                injecting
              }
              onClick={inject}
            >
              {injecting ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <CheckCircle2 size={17} />
              )}
              Valider et injecter dans l’Avant-Métré
            </button>
          </div>
          {table && (
            <button
              className="ux-button"
              onClick={() => {
                setGroups([]);
                setMappings({});
              }}
            >
              Revenir aux colonnes
            </button>
          )}
        </section>
      )}
      {injected && (
        <div className="import-success">
          <CheckCircle2 size={40} />
          <h2>Les données ont rejoint le projet.</h2>
          <p>
            Vérifie les lignes dans la minute et complète les prescriptions des
            articles CCTP non associés à la bibliothèque.
          </p>
          <div className="ux-actions">
            <button
              className="ux-button primary"
              onClick={() => bridge.showView("minute")}
            >
              Ouvrir la feuille de minute
              <ArrowRight size={16} />
            </button>
            <button
              className="ux-button"
              onClick={() => bridge.showView("cctp")}
            >
              Vérifier le CCTP
            </button>
            <button
              className="ux-button"
              onClick={() => {
                setResult(null);
                setGroups([]);
                setWarnings([]);
                setInjected(false);
              }}
            >
              Importer un autre fichier
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="ux-error import-error" role="alert">
          <AlertTriangle size={17} />
          {error}
        </p>
      )}
    </div>
  );
}
function InfoIcon() {
  return <AlertTriangle size={18} />;
}

const MappingRow = React.memo(function MappingRow({
  g,
  m,
  lots,
  works,
  onPatch,
  onWork,
}) {
  const measure = g.measures[m.measure],
    valid =
      measure &&
      !measure.errors.length &&
      (!m.workUnit || m.workUnit === measure.unit);
  return (
    <tr key={g.id} className={!m.include ? "muted-row" : ""}>
      <td>
        <input
          type="checkbox"
          aria-label={"Inclure " + g.label}
          checked={m.include}
          onChange={(e) => onPatch(g.id, { include: e.target.checked })}
        />
      </td>
      <td>
        <b>{g.layer || g.family || "Nomenclature"}</b>
        <small>{g.type || g.label}</small>
        <span>
          {g.level || "Niveau non renseigné"} · {g.records.length} objet(s)
        </span>
      </td>
      <td>
        <select
          aria-label={"Lot " + g.label}
          value={m.lot}
          onChange={(e) =>
            onPatch(g.id, { lot: e.target.value, workCode: "", workUnit: "" })
          }
        >
          {lots.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <LotBadge lot={m.lot} palette={lotColor(m.lot)} />
      </td>
      <td>
        <select
          aria-label={"Ouvrage " + g.label}
          value={m.workCode}
          onChange={(e) => onWork(g.id, e.target.value)}
        >
          <option value="">Désignation libre · CCTP à compléter</option>
          {works.map((w) => (
            <option key={w.code} value={w.code}>
              {w.code} · {w.designation_courte}
            </option>
          ))}
        </select>
        <input
          aria-label={"Désignation " + g.label}
          value={m.label}
          onChange={(e) => onPatch(g.id, { label: e.target.value })}
          maxLength={200}
        />
      </td>
      <td>
        <select
          aria-label={"Mesure " + g.label}
          value={m.measure}
          onChange={(e) => onPatch(g.id, { measure: e.target.value })}
        >
          <option value="">Choisir une mesure</option>
          {Object.entries(g.measures).map(([name, q]) => (
            <option key={name} value={name} disabled={q.errors.length > 0}>
              {name} · {q.unit || "unité ?"}
              {q.errors.length ? " · invalide" : ""}
            </option>
          ))}
        </select>
        {measure?.errors.length > 0 && (
          <small className="ux-error">{measure.errors[0]}</small>
        )}
        {m.workUnit && measure && m.workUnit !== measure.unit && (
          <small className="ux-error">
            Ouvrage en {m.workUnit}, mesure en {measure.unit}.
          </small>
        )}
      </td>
      <td className="numeric">
        {valid ? (
          <>
            <strong>
              {measure.value.toLocaleString("fr-FR", {
                maximumFractionDigits: 4,
              })}
            </strong>
            <small>
              {measure.unit} <Check size={12} />
            </small>
          </>
        ) : (
          <span className="to-complete">À préciser</span>
        )}
      </td>
    </tr>
  );
});
