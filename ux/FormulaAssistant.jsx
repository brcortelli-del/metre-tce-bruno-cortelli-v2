import React, { useEffect, useState } from "react";
import {
  FunctionSquare,
  Check,
  ChevronDown,
  BookOpen,
  Plus,
  Info,
} from "lucide-react";
import {
  GEOMETRIES,
  geometryExpression,
  formulaSuggestions,
} from "../public/formula-assistant.js";
import { evaluateExpression } from "../public/expression.js";
import { Modal } from "./components.jsx";

export function GeometryDialog({
  bridge,
  onClose,
  initial = "trapeze",
  active,
}) {
  const [shapeId, setShapeId] = useState(initial),
    [values, setValues] = useState({}),
    [error, setError] = useState("");
  const shape = GEOMETRIES.find((s) => s.id === shapeId) || GEOMETRIES[0];
  const project = bridge.get(),
    row = project.rows.find((r) => r.id === active?.id);
  const [lot, setLot] = useState(row?.lot || project.lots[0] || "Terrassement");
  let expression = "",
    result = null;
  try {
    expression = geometryExpression(shape, values, project.variables);
    result = evaluateExpression(expression, shape.unit, project.variables);
  } catch {}
  const canReplace =
    row?.input.preset === "reprise" &&
    row.result.unit === shape.unit &&
    !row.input.planLink;
  const insert = (replace = false) => {
    try {
      const e = geometryExpression(shape, values, bridge.get().variables);
      bridge.insertFormula({
        expression: e,
        unit: shape.unit,
        title: shape.title,
        lot,
        replaceId: replace ? row.id : null,
      });
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Modal
      title="Assistant géométrique"
      subtitle="Des cotes explicites, un calcul vérifiable"
      onClose={onClose}
      wide
    >
      <div className="geometry-layout">
        <div className="geometry-menu">
          {GEOMETRIES.map((g) => (
            <button
              key={g.id}
              className={shapeId === g.id ? "selected" : ""}
              onClick={() => {
                setShapeId(g.id);
                setValues({});
                setError("");
              }}
            >
              {g.title}
              <span>{g.unit}</span>
            </button>
          ))}
        </div>
        <div className="geometry-detail">
          <div className="geometry-sketch">
            <svg
              viewBox="0 0 200 140"
              role="img"
              aria-label={"Schéma : " + shape.title}
            >
              <path
                d={shape.path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <text x="98" y="135" textAnchor="middle" fontSize="11">
                {shape.expression}
              </text>
            </svg>
            <div>
              <span className="ux-overline">FORMULE GÉOMÉTRIQUE</span>
              <h3>{shape.title}</h3>
              <code>{shape.expression}</code>
            </div>
          </div>
          {shape.note && (
            <p className="ux-notice">
              <Info size={16} />
              {shape.note}
            </p>
          )}
          <div className="ux-form-grid">
            {shape.fields.map(([k, label, u]) => (
              <label key={k}>
                {label} <small>({u})</small>
                <input
                  value={values[k] || ""}
                  placeholder={u === "u" ? "Ex. 2" : "Cote en m ou variable"}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [k]: e.target.value }))
                  }
                />
              </label>
            ))}
            <label>
              Lot de la ligne
              <select value={lot} onChange={(e) => setLot(e.target.value)}>
                {project.lots.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
          </div>
          {result !== null && (
            <div className="formula-result">
              <span>Résultat sans arrondi intermédiaire</span>
              <strong>
                {result.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}{" "}
                {shape.unit}
              </strong>
              <code>{expression}</code>
            </div>
          )}
          {error && (
            <p className="ux-error" role="alert">
              {error}
            </p>
          )}
          <div className="ux-actions">
            {canReplace && (
              <button
                className="ux-button"
                disabled={bridge.readOnly()}
                onClick={() => insert(true)}
              >
                Remplacer la quantité active
              </button>
            )}
            <button
              className="ux-button primary"
              disabled={bridge.readOnly()}
              onClick={() => insert()}
            >
              <Plus size={16} />
              Créer une ligne calculée
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function FormulaAssistant({ bridge, library }) {
  const [active, setActive] = useState(null),
    [draft, setDraft] = useState(""),
    [open, setOpen] = useState(false),
    [cursor, setCursor] = useState(-1),
    [dialog, setDialog] = useState(null),
    [help, setHelp] = useState(null),
    [error, setError] = useState(""),
    [, setRevision] = useState(0);
  useEffect(() => {
    const focus = (e) => {
      const el = e.target.closest?.("[data-minute-id]");
      if (!el) return;
      setActive({
        id: el.dataset.minuteId,
        key: el.dataset.minuteField || "Q",
      });
      setDraft(el.value);
      setError("");
      setOpen(false);
    };
    const update = (e) => {
      setRevision((n) => n + 1);
      if (e.detail?.reset) setActive(null);
    };
    const input = (e) => {
      if (e.target.matches?.("[data-minute-field]")) setDraft(e.target.value);
    };
    document.addEventListener("input", input);
    document.addEventListener("focusin", focus);
    document.addEventListener("atelier:project", update);
    return () => {
      document.removeEventListener("input", input);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("atelier:project", update);
    };
  }, []);
  const project = bridge.get(),
    row = project.rows.find((r) => r.id === active?.id);
  const candidates = formulaSuggestions(draft, project.variables, library);
  const chooseSuggestion = (s) => {
    if (s.type === "geometry") {
      setDialog(s.geometry);
      setOpen(false);
      return;
    }
    if (s.type === "definition" || s.type === "course") {
      setHelp(s);
      setOpen(false);
      return;
    }
    setDraft((d) => {
      const prefix = d.startsWith("=") ? d : "=" + d;
      return /[A-Za-z_][A-Za-z0-9_]*$/.test(prefix)
        ? prefix.replace(/[A-Za-z_][A-Za-z0-9_]*$/, s.insert)
        : prefix + s.insert;
    });
    setOpen(false);
  };
  const apply = () => {
    if (!active) return;
    try {
      bridge.updateCell(active.id, active.key, draft);
      setError("");
      setOpen(false);
      bridge.toast("Formule appliquée à la ligne active.");
    } catch (e) {
      setError(e.message);
    }
  };
  const keydown = (e) => {
    if (open && candidates.length && ["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      setCursor(
        (i) =>
          (i + (e.key === "ArrowDown" ? 1 : -1) + candidates.length) %
          candidates.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && cursor >= 0 && candidates[cursor])
        chooseSuggestion(candidates[cursor]);
      else apply();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };
  return (
    <div className="formula-assistant">
      <div className="formula-toolbar">
        <div className="cell-reference" title={row?.label}>
          {row
            ? (row.code || row.rowNumber || "Ligne") +
              " · " +
              ({ count: "N", w: "l", h: "H", deduction: "Déduction" }[
                active.key
              ] || active.key)
            : "Choisir une cellule"}
        </div>
        <FunctionSquare size={20} className="fx-icon" />
        <div className="formula-input-wrap">
          <input
            role="combobox"
            aria-label="Barre de formule"
            disabled={
              !row ||
              bridge.readOnly() ||
              row.input.planLink?.field === active.key
            }
            value={draft}
            placeholder="= HSP * 2 · variables et formules"
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => {
              setDraft(e.target.value);
              setCursor(-1);
              setOpen(true);
              setError("");
            }}
            onKeyDown={keydown}
            autoComplete="off"
            aria-expanded={open}
            aria-controls="formulaSuggestions"
            aria-autocomplete="list"
          />
          {open && candidates.length > 0 && (
            <div
              id="formulaSuggestions"
              role="listbox"
              className="formula-suggestions"
            >
              {candidates.map((s, i) => (
                <button
                  key={s.key}
                  role="option"
                  aria-selected={i === cursor}
                  className={i === cursor ? "selected" : ""}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => chooseSuggestion(s)}
                >
                  <span>
                    {s.label}
                    <small>{s.detail}</small>
                  </span>
                  {s.type === "variable" ? (
                    <span className="suggestion-type">Variable</span>
                  ) : (
                    <BookOpen size={15} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="ux-icon-button"
          aria-label="Appliquer la formule"
          disabled={!row || bridge.readOnly()}
          onClick={apply}
        >
          <Check size={18} />
        </button>
        <button className="ux-button" onClick={() => setDialog("trapeze")}>
          <FunctionSquare size={16} />
          fx Formules
          <ChevronDown size={13} />
        </button>
      </div>
      {error && (
        <p className="ux-error" role="alert">
          {error}
        </p>
      )}
      {row ? (
        <div className="formula-context">
          <span className="context-dot" />
          <span>
            <b>{row.label}</b> · {bridge.rule(row)}
          </span>
          <span className="context-result">
            {row.result.total.toLocaleString("fr-FR", {
              maximumFractionDigits: 3,
            })}{" "}
            {row.result.unit}
          </span>
        </div>
      ) : (
        <div className="formula-context">
          <Info size={15} />
          <span>
            Clique une cellule N, L, l, H ou quantité pour éditer sa formule.
            Entrée et Tab passent à la cellule suivante.
          </span>
        </div>
      )}
      {help && (
        <div className="formula-help">
          <BookOpen size={17} />
          <div>
            <b>{help.label}</b>
            <p>{help.detail}</p>
            {help.type === "definition" && (
              <small>
                Une abréviation n’a pas de valeur automatique. Définis sa valeur
                et son unité dans Variables.
              </small>
            )}
            {help.type === "course" && (
              <>
                <code>{help.formula.expression_js}</code>
                <small>
                  Formule du cours affichée comme référence ; adapte ses
                  variables dans le parseur sécurisé de la minute.
                </small>
              </>
            )}
          </div>
          <button className="ux-button" onClick={() => setHelp(null)}>
            Fermer
          </button>
        </div>
      )}
      {dialog && (
        <GeometryDialog
          bridge={bridge}
          active={active}
          initial={dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
