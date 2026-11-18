import React, { useState } from "react";
import { Save, Search, Plus, Trash2 } from "lucide-react";
import { Modal } from "./components.jsx";
import {
  DYNAMIC_UNITS,
  FORMULAS,
  adaptDynamicUnit,
  makeDynamicRow,
} from "../public/dynamic-minute.js";
import { evaluateExpression, convertUnit } from "../public/expression.js";
import { calculate, fmt } from "../public/core.js";
import {
  OUVRAGES_BTP,
  LOTS_OUVRAGES,
  rechercherOuvrages,
} from "../src/data/ouvragesBTP.js";
const KEY = "atelier-metre:ouvrages-personnels:v1";
function readCustom() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list)
      ? list
          .filter(
            (o) =>
              typeof o.designation === "string" &&
              typeof o.lot === "string" &&
              DYNAMIC_UNITS.includes(o.unite),
          )
          .slice(0, 500)
      : [];
  } catch {
    return [];
  }
}
export default function DynamicMinuteEditor({ row, project, onSave, onClose }) {
  const [draft, setDraft] = useState(() => ({
    ...{
      label: "",
      lot: "Gros Œuvre",
      code: "",
      level: "RDC",
      zone: "",
      workColor: "#2563eb",
      unitPrice: "",
      outputUnit: "m²",
      dimensionUnit: "m",
      N: "1",
      deduction: "0",
      shape: "rectangle",
      L: "1",
      w: "1",
      H: "1",
      R: "1",
      B: "1",
      rho: "",
      loss: "0",
      axis: "w",
      expression: "L * w",
      openings: [],
    },
    ...(row
      ? {
          label: row.label,
          lot: row.lot,
          code: row.code,
          catalogueCode: row.catalogueCode,
          level: row.level,
          zone: row.room || row.location,
          unitPrice: row.unitPrice ?? "",
          workColor: row.workColor,
          outputUnit: row.input.outputUnit,
          dimensionUnit: row.input.dimensionUnit,
          N: row.input.count,
          deduction: row.input.deduction,
          openings: structuredClone(row.input.openings || []),
          ...row.input.dynamicMinute,
          ...(!row.input.dynamicMinute
            ? {
                shape: "libre",
                N: "1",
                deduction: "0",
                openings: [],
                expression: String(row.result.total) + " " + row.result.unit,
              }
            : {}),
        }
      : {}),
  }));
  const [query, setQuery] = useState(""),
    [lot, setLot] = useState(""),
    [custom, setCustom] = useState(readCustom),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const migrating = !!row && !row.input.dynamicMinute;
  const set = (k, v) =>
    setDraft((d) => ({
      ...d,
      [k]: v,
      ...(k === "label" ? { catalogueCode: "" } : {}),
    }));
  let result,
    problem = "";
  try {
    result = calculate(
      makeDynamicRow({ ...draft, label: draft.label || "Aperçu" }, "preview")
        .input,
      project.variables,
      project,
    );
  } catch (e) {
    problem = e.message;
  }
  const select = (o) => {
    setDraft((d) => ({
      ...adaptDynamicUnit(d, o.unite),
      label: o.designation,
      lot: o.lot,
      catalogueCode: o.code || "",
      code: o.code || d.code,
      shape: o.formule || "libre",
    }));
    setNotice(
      "Désignation ajoutée à la ligne ; adaptez ses caractéristiques et dimensions.",
    );
  };
  const changeUnit = (unit) => {
    try {
      setDraft((d) => adaptDynamicUnit(d, unit));
      setNotice(
        "Même grandeur : quantité, déduction et prix unitaire convertis. Changement de grandeur : formule adaptée, prix à ressaisir, déductions et ouvertures remises à zéro. ft = forfait, ens = ensemble.",
      );
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };
  const field = (key, label) => (
    <label key={key}>
      {label}
      <input
        value={draft[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );
  const fields = {
    longueur: ["L"],
    perimetre: ["L", "w"],
    rectangle: ["L", draft.axis === "H" ? "H" : "w"],
    triangle: ["L", "H"],
    trapeze: ["L", "B", "H"],
    cercle: ["R"],
    volume: ["L", "w", "H"],
    cylindre: ["R", "H"],
    sphere: ["R"],
    poids: ["L", "w", "H", "rho"],
    unites: [],
    libre: ["L", "w", "H", "R", "B", "rho"],
  };
  const labels = {
    L: "Longueur / base L",
    w: "Largeur / épaisseur l",
    H: "Hauteur H",
    R: "Rayon R",
    B: "Deuxième base B",
    rho: "Masse volumique ρ (kg/m³)",
  };
  return (
    <Modal
      wide
      title={
        row
          ? "Modifier le calcul de cette ligne"
          : "Nouvel ouvrage · bibliothèque et calcul"
      }
      subtitle="Une seule ligne : géométrie, unité, déductions et pertes. Aucun sous-ouvrage imposé."
      onClose={onClose}
    >
      <form
        className="pro-minute-editor"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave({
              ...makeDynamicRow(draft, row?.id || crypto.randomUUID()),
              ...(migrating
                ? { previousMinute: structuredClone(row.input) }
                : {}),
            });
            onClose();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        {migrating && (
          <p className="ux-notice">
            Conversion volontaire de la ligne : sa quantité actuelle est reprise
            dans une formule libre typée. Renseignez une géométrie pour refaire
            le calcul. La minute précédente reste archivée dans la ligne ; les
            liens de recalcul au plan deviennent une photographie. Enregistrer
            confirme cette conversion, Ctrl+Z permet de l’annuler.
          </p>
        )}
        <details className="ux-card" open={!row}>
          <summary>
            <Search size={16} /> Bibliothèque BTP · {OUVRAGES_BTP.length}{" "}
            désignations + {custom.length} personnelles
          </summary>
          <div className="pro-editor-grid">
            <label>
              Rechercher
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Semelle, cloison, regard…"
              />
            </label>
            <label>
              Corps d’état
              <select value={lot} onChange={(e) => setLot(e.target.value)}>
                <option value="">Tous les corps d’état</option>
                {LOTS_OUVRAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="btp-library-results">
            {rechercherOuvrages(query, lot, custom)
              .slice(0, 60)
              .map((o) => (
                <button
                  type="button"
                  className="ux-button"
                  key={o.id}
                  onClick={() => select(o)}
                >
                  <Plus size={14} />
                  <span>
                    {o.designation}
                    <small>
                      {o.lot} · {o.unite}
                    </small>
                  </span>
                </button>
              ))}
          </div>
          <small>
            60 résultats maximum : précisez votre recherche. Les désignations
            restent modifiables.
          </small>
        </details>
        <div className="pro-editor-grid">
          {field("code", "Code")}
          {field("label", "Désignation libre")}
          {field("lot", "Lot TCE")}
          {field("level", "Niveau")}
          {field("zone", "Localisation / zone")}
          <label>
            Couleur
            <input
              type="color"
              value={draft.workColor}
              onChange={(e) => set("workColor", e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="ux-button"
          onClick={() => {
            try {
              if (!draft.label.trim())
                throw Error("Saisissez une désignation.");
              if (custom.length >= 500)
                throw Error("Maximum 500 ouvrages personnels.");
              const next = [
                ...custom,
                {
                  id: crypto.randomUUID(),
                  designation: draft.label.trim().slice(0, 200),
                  lot: draft.lot.slice(0, 80),
                  unite: draft.outputUnit,
                  formule: draft.shape,
                },
              ];
              localStorage.setItem(KEY, JSON.stringify(next));
              setCustom(next);
              setNotice("Ouvrage personnel enregistré dans ce navigateur.");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Mémoriser cette désignation dans ma bibliothèque
        </button>
        <div className="pro-dimensions">
          <label>
            Unité du résultat
            <select
              value={draft.outputUnit}
              onChange={(e) => changeUnit(e.target.value)}
            >
              {DYNAMIC_UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <label>
            Formule
            <select
              value={draft.shape}
              onChange={(e) => {
                const shape = e.target.value,
                  unit = FORMULAS.find((f) => f[0] === shape)[2];
                setDraft((d) => ({
                  ...adaptDynamicUnit(
                    d,
                    shape === "libre" ? d.outputUnit : unit,
                  ),
                  shape,
                }));
              }}
            >
              {FORMULAS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Unité des dimensions
            <select
              value={draft.dimensionUnit}
              onChange={(e) => {
                const next = e.target.value;
                try {
                  const d = draft;
                  const converted = (() => {
                    const n = { ...d, dimensionUnit: next };
                    for (const k of ["L", "w", "H", "R", "B"])
                      n[k] = String(
                        convertUnit(
                          evaluateExpression(
                            String(d[k]),
                            d.dimensionUnit,
                            project.variables,
                          ),
                          d.dimensionUnit,
                          next,
                        ),
                      );
                    n.openings = d.openings.map((o) => ({
                      ...o,
                      w: String(
                        convertUnit(
                          evaluateExpression(
                            String(o.w),
                            d.dimensionUnit,
                            project.variables,
                          ),
                          d.dimensionUnit,
                          next,
                        ),
                      ),
                      h: String(
                        convertUnit(
                          evaluateExpression(
                            String(o.h),
                            d.dimensionUnit,
                            project.variables,
                          ),
                          d.dimensionUnit,
                          next,
                        ),
                      ),
                    }));
                    return n;
                  })();
                  setDraft(converted);
                  setError("");
                } catch (err) {
                  setError("Conversion impossible : " + err.message);
                }
              }}
            >
              <option>m</option>
              <option>cm</option>
              <option>mm</option>
            </select>
          </label>
          {field("N", "Nombre N")}
          {(fields[draft.shape] || []).map((k) =>
            field(
              k,
              labels[k] + (k === "rho" ? "" : " (" + draft.dimensionUnit + ")"),
            ),
          )}
          {draft.shape === "rectangle" && (
            <label>
              Orientation
              <select
                value={draft.axis}
                onChange={(e) => set("axis", e.target.value)}
              >
                <option value="w">Sol : L × l</option>
                <option value="H">Mur : L × H</option>
              </select>
            </label>
          )}
          {field("deduction", "Déduction globale (" + draft.outputUnit + ")")}
          {field("loss", "Pertes sur quantité nette (%)")}
          {field("unitPrice", "Prix unitaire HT")}
        </div>
        {draft.shape === "libre" && (
          <label>
            Formule par élément (N est appliqué ensuite)
            <input
              value={draft.expression}
              onChange={(e) => set("expression", e.target.value)}
              maxLength={500}
            />
            <small>
              Variables : L, w, H, R, B en mètres ; rho en kg/m³ ; PI ;
              variables du projet. Opérateurs + − * / ^ et parenthèses. Exemple
              : PI * R ^ 2.
            </small>
          </label>
        )}
        {["m²", "m³"].includes(draft.outputUnit) && (
          <details>
            <summary>
              Déduire des vides / ouvertures ({draft.openings.length})
            </summary>
            {draft.openings.map((o, i) => (
              <div className="pro-opening" key={i}>
                {[
                  ["w", "Largeur"],
                  ["h", "Hauteur"],
                  ["n", "Nombre"],
                ].map(([k, l]) => (
                  <label key={k}>
                    {l}
                    <input
                      value={o[k]}
                      onChange={(e) =>
                        set(
                          "openings",
                          draft.openings.map((v, j) =>
                            i === j ? { ...v, [k]: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="ux-button"
                  onClick={() =>
                    set(
                      "openings",
                      draft.openings.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 size={14} />
                  Retirer
                </button>
              </div>
            ))}
            <button
              type="button"
              className="ux-button"
              disabled={draft.openings.length >= 100}
              onClick={() =>
                set("openings", [...draft.openings, { w: "1", h: "1", n: "1" }])
              }
            >
              Ajouter une ouverture
            </button>
            <p>
              Déduction unique sur l’ensemble de N éléments. En volume, surface
              du vide × épaisseur l.
            </p>
          </details>
        )}
        {notice && <p role="status">{notice}</p>}
        <div className="pro-live-result" aria-live="polite">
          {result ? (
            <>
              <strong>
                {fmt(result.total, 6)} {result.unit}
              </strong>
              {result.steps.map((s, i) => (
                <small key={i}>{s}</small>
              ))}
            </>
          ) : (
            <p role="alert">{problem}</p>
          )}
        </div>
        {error && (
          <p role="alert" className="ux-error">
            {error}
          </p>
        )}
        <button
          className="ux-button primary"
          disabled={!result || !draft.label.trim()}
        >
          <Save />
          Enregistrer dans la ligne
        </button>
      </form>
    </Modal>
  );
}
