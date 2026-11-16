import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  appendClause,
  articleIssues,
  blocksText,
  catalogueIndex,
  catalogueTree,
  articleTree,
  clauseMeasurement,
  fillMissingMeasurements,
  fromClause,
  importMinute,
  numberedArticles,
  patchArticle,
} from "../public/cctp-model.js";
import { lotColor } from '../public/lot-colors.js';
import { saveBlob, safeName } from "../public/exports.js";
import { countryCatalogue, adoptCountryCctp } from '../public/country-cctp.js';
import { documentLabel, COUNTRIES } from '../public/country-rules.js';
import { decorateNormativeCatalogue, adoptNormativeCctp, appendNormativeParagraph } from '../public/normative-fr.js';

/** Les seules données écrites depuis le DOM sont texte / gras / italique /
 * paragraphes / listes. Aucun HTML collé n'est sauvegardé ou exporté. */
function readBlocks(root) {
  const result = [];
  const runs = (node, marks = {}) => {
    if (node.nodeType === 3) return [{ text: node.textContent, ...marks }];
    if (node.nodeType !== 1) return [];
    if (node.tagName === "BR") return [{ text: "\n", ...marks }];
    const next = {
      ...marks,
      ...(["B", "STRONG"].includes(node.tagName) ? { bold: true } : {}),
      ...(["I", "EM"].includes(node.tagName) ? { italic: true } : {}),
    };
    return [...node.childNodes].flatMap((n) => runs(n, next));
  };
  // Les navigateurs enveloppent parfois une liste dans un DIV. Parcourir
  // les blocs imbriqués évite de fusionner ses éléments en un seul texte.
  const walk = (container, list) => {
    let inline = [];
    const flush = () => {
      if (!inline.length) return;
      result.push({
        ...(list ? { list } : {}),
        runs: inline.flatMap((n) => runs(n)),
      });
      inline = [];
    };
    for (const node of container.childNodes) {
      if (node.nodeType === 1 && ["UL", "OL"].includes(node.tagName)) {
        flush();
        for (const li of node.children)
          walk(li, node.tagName === "UL" ? "bullet" : "ordered");
      } else if (
        node.nodeType === 1 &&
        ["DIV", "P", "LI"].includes(node.tagName)
      ) {
        flush();
        walk(node, list);
      } else inline.push(node);
    }
    flush();
  };
  walk(root);
  return result.length ? result : [{ runs: [{ text: "" }] }];
}
function writeBlocks(root, blocks) {
  const frag = document.createDocumentFragment();
  let list = null,
    listType = "";
  for (const b of blocks) {
    // Réunir les éléments consécutifs dans la même liste conserve le compteur
    // au rechargement et évite un <ol> recommençant à 1 pour chaque paragraphe.
    let para;
    if (b.list) {
      if (!list || listType !== b.list) {
        list = document.createElement(b.list === "bullet" ? "ul" : "ol");
        listType = b.list;
        frag.append(list);
      }
      para = document.createElement("li");
      list.append(para);
    } else {
      list = null;
      listType = "";
      para = document.createElement("div");
      frag.append(para);
    }
    for (const r of b.runs) {
      let el = document.createTextNode(r.text);
      if (r.italic) {
        const i = document.createElement("em");
        i.append(el);
        el = i;
      }
      if (r.bold) {
        const s = document.createElement("strong");
        s.append(el);
        el = s;
      }
      para.append(el);
    }
    if (!para.textContent) para.append(document.createElement("br"));
  }
  root.replaceChildren(frag);
}
const RichField = memo(function RichField({
  label,
  value,
  onChange,
  readOnly,
}) {
  const ref = useRef(null),
    lastValue = useRef(null);
  useEffect(() => {
    if (
      ref.current &&
      document.activeElement !== ref.current &&
      lastValue.current !== value
    ) {
      writeBlocks(ref.current, value);
      lastValue.current = value;
    }
  }, [value]);
  const input = () => {
    const next = readBlocks(ref.current);
    if (blocksText(next).length > 16000) {
      ref.current.textContent = blocksText(next).slice(0, 16000);
    }
    onChange(readBlocks(ref.current));
  };
  const command = (cmd) => {
    ref.current.focus();
    document.execCommand(cmd, false);
    input();
  };
  return (
    <section className="cc-rich-field">
      <div className="cc:flex cc:items-center cc:justify-between cc:gap-2">
        <span className="cc-field-label">{label}</span>
        {!readOnly && (
          <div
            className="cc-rich-tools"
            role="toolbar"
            aria-label={"Mise en forme : " + label}
          >
            {[
              ["bold", "Gras", "G"],
              ["italic", "Italique", "I"],
              ["insertUnorderedList", "Liste à puces", "• Liste"],
              ["insertOrderedList", "Liste numérotée", "1. Liste"],
            ].map(([cmd, name, text]) => (
              <button
                key={cmd}
                type="button"
                aria-label={name + " : " + label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => command(cmd)}
              >
                {text}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        ref={ref}
        className="cc-rich"
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={input}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand(
            "insertText",
            false,
            e.clipboardData.getData("text/plain").slice(0, 16000),
          );
        }}
      />
    </section>
  );
});
const ArticleEditor = memo(function ArticleEditor({
  article,
  number,
  onChange,
  readOnly,
  measurementClause,
}) {
  const set = useCallback(
    (field, value) => onChange(article.id, { [field]: value }),
    [article.id, onChange],
  );
  const desc = useCallback((v) => set("description", v), [set]),
    exec = useCallback((v) => set("execution", v), [set]),
    loc = useCallback((v) => set("location", v), [set]),
    measure = useCallback((v) => set("measurement", v), [set]);
  return (
    <div className="cc-paper" data-cctp-editor={article.id}>
      <p className="cc-overline">ARTICLE {number}</p>
      {(measurementClause?.normative || article.source?.vigilance) && (
        <aside className="cc-vigilance" aria-label="Vigilance Métreur">
          <strong>Vigilance Métreur · France · 13/11/2026</strong>
          <p>{measurementClause?.normative?.alerte_interface_site || article.source.vigilance}</p>
          {measurementClause?.normative && <details>
            <summary>Références, parties et limites de vérification</summary>
            {measurementClause.normative.parties_nf_dtu.map(f=><div key={f.famille}>
              <strong>{f.famille}</strong>
              <ul>{f.parties.map(p=><li key={p.code}><a href={p.url} target="_blank" rel="noopener noreferrer">{p.code}</a> · {p.role} · {p.millesime}</li>)}</ul>
            </div>)}
            <p>{measurementClause.normative.regle_metre_officielle_ccs}</p>
            <p>Notices et domaines vérifiés. Les clauses internes de métré du texte intégral restent à contrôler. Aucun seuil de déduction français ajouté.</p>
            {!readOnly && <button className="cc-btn" disabled={blocksText(article.execution).length+measurementClause.normative.paragraphe_cctp_pret_a_inserer.length+2>16000} onClick={()=>set('execution',appendNormativeParagraph(article.execution,measurementClause.normative))}>Ajouter la trame normative aux prescriptions</button>}
          </details>}
        </aside>
      )}
      <label className="cc-field-label">
        Titre de l’article
        <input
          className="cc-title-input"
          aria-label="Titre de l’article"
          value={article.title}
          maxLength={300}
          disabled={readOnly}
          onChange={(e) => set("title", e.target.value)}
        />
      </label>
      <div className="cc:grid cc:gap-3 cc:md:grid-cols-3 cc:my-4">
        <label>
          Lot n°
          <input
            value={article.lotNumber}
            maxLength={20}
            disabled={readOnly}
            onChange={(e) => set("lotNumber", e.target.value)}
          />
        </label>
        <label>
          Nom du lot
          <input
            value={article.lotName}
            maxLength={100}
            disabled={readOnly}
            onChange={(e) => set("lotName", e.target.value)}
          />
        </label>
        <label>
          Sous-lot
          <input
            value={article.sublot}
            maxLength={150}
            disabled={readOnly}
            onChange={(e) => set("sublot", e.target.value)}
          />
        </label>
      </div>
      <label className="cc-field-label">
        Références proposées · domaine à vérifier au marché
        <textarea
          aria-label="Références citées"
          rows={2}
          value={article.references}
          maxLength={2000}
          disabled={readOnly}
          placeholder="Aucune référence renseignée"
          onChange={(e) => set("references", e.target.value)}
        />
      </label>
      <RichField
        label="Description des ouvrages"
        value={article.description}
        onChange={desc}
        readOnly={readOnly}
      />
      <RichField
        label="Prescriptions de mise en œuvre"
        value={article.execution}
        onChange={exec}
        readOnly={readOnly}
      />
      <RichField
        label="Localisation"
        value={article.location}
        onChange={loc}
        readOnly={readOnly}
      />
      <RichField
        label="Mode de métré"
        value={article.measurement || []}
        onChange={measure}
        readOnly={readOnly}
      />
      {measurementClause && !readOnly && (
        <button
          className="cc-btn"
          onClick={() =>
            set("measurement", clauseMeasurement(measurementClause))
          }
        >
          Reprendre le mode de métré de la fiche
        </button>
      )}
      <p className="cc-note">
        Règle de mesurage et expression symbolique uniquement. Aucune quantité
        du projet n’est reportée ici.
      </p>
      <div className="cc:flex cc:items-end cc:justify-between cc:gap-4 cc:mt-4">
        <label>
          Unité de métré indicative
          <input
            aria-label="Unité de métré indicative"
            value={article.unit}
            maxLength={30}
            disabled={readOnly}
            onChange={(e) => set("unit", e.target.value)}
          />
        </label>
        <label className="cc-check">
          <input
            type="checkbox"
            checked={article.reviewed}
            disabled={readOnly}
            onChange={(e) =>
              onChange(article.id, { reviewed: e.target.checked })
            }
          />
          Article relu
        </label>
      </div>
      {article.source ? (
        <aside className="cc-source">
          <strong>Source : {article.source.code}</strong>
          <p>{article.source.pages}</p>
          {article.source.note && <p>{article.source.note}</p>}
          {article.source.auditDate && <p>Vérification des références : {article.source.auditDate}</p>}
          {article.source.previousReferences && <details><summary>Références avant actualisation</summary><p style={{whiteSpace:'pre-wrap'}}>{article.source.previousReferences}</p></details>}
          {article.source.links?.map(link=><p key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a></p>)}
          {article.source.unitStatus && (
            <p>Unité indicative à confirmer au bordereau du projet.</p>
          )}
          {article.source.kind === "exemple_pedagogique_donnees_fixes" && (
            <p>Valeurs d’un exemple du cours : adapte-les au chantier.</p>
          )}
          {/sans_clause|sans_dimensionnement|cite/.test(
            article.source.kind,
          ) && (
            <p>
              Le cours ne fournit pas de prescription constructive complète pour
              cette fiche.
            </p>
          )}
        </aside>
      ) : (
        <p className="cc-note">
          Article libre : complète ses spécifications techniques et ses
          références.
        </p>
      )}
      {!!article.rowIds.length && (
        <p className="cc-note">
          Lié à {article.rowIds.length} ligne(s) de la minute. Les quantités et
          les prix sont exclus du CCTP.
        </p>
      )}
    </div>
  );
});

/** Composant React isolé, chargé uniquement à l'ouverture de l'onglet.
 * Une frappe remplace un article ; elle ne recalcule aucune ligne de métré. */
export default function EditeurCCTP({ bridge }) {
  const [doc, setDoc] = useState(() => bridge.get().cctp),
    [catalogue, setCatalogue] = useState([]),
    [selected, setSelected] = useState(
      () => bridge.get().cctp.articles[0]?.id || "",
    ),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [lot, setLot] = useState(""),
    [sub, setSub] = useState(""),
    [scope, setScope] = useState("trames"),
    [limit, setLimit] = useState(25),
    [busy, setBusy] = useState(""),
    [includeSources, setIncludeSources] = useState(true),
    [preview, setPreview] = useState(false);
  const undo = useRef([]),
    worker = useRef(null),
    lastTyped = useRef(null),
    docRef = useRef(doc);
  const database = useRef(null);
  const readOnly = bridge.readOnly(),
    project = bridge.get();
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(
      ["/data/cctp-library.json", "/data/cctp-sources.json", "/data/cctp-fr-lu.json", "/data/normative-fr-index.json"].map((url) =>
        fetch(url, { signal: controller.signal }).then((r) => {
          if (!r.ok)
            throw new Error("La bibliothèque CCTP ne peut pas être chargée.");
          return r.json();
        }),
      ),
    )
      .then(([data, proofs, countries, normative]) => {
        database.current = countries;
        const nextCatalogue=decorateNormativeCatalogue(countryCatalogue(catalogueIndex(data, proofs), countries, project.country),normative,project.country);
        setCatalogue(nextCatalogue);
        if(!bridge.readOnly()) {
          const adopted=adoptCountryCctp(adoptNormativeCctp(docRef.current,nextCatalogue,project.country),project.country,nextCatalogue);
          if(adopted!==docRef.current) {
            undo.current=[...undo.current.slice(-19),docRef.current];
            bridge.setCctp(adopted);docRef.current=adopted;setDoc(adopted);
            setNotice('Références actualisées selon le domaine. Les anciennes références restent consultables ; tes prescriptions et modes de métré sont conservés. Relis les articles concernés.');
          }
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => {
      controller.abort();
      worker.current?.terminate();
    };
  }, []);
  const commit = useCallback(
    (fn, { typing = false } = {}) => {
      setError("");
      try {
        const prev = docRef.current,
          next = fn(prev);
        if (next === prev) return;
        bridge.setCctp(next);
        if (!typing || lastTyped.current !== selected) {
          undo.current = [...undo.current.slice(-19), prev];
        }
        lastTyped.current = typing ? selected : null;
        docRef.current = next;
        setDoc(next);
      } catch (e) {
        setError(e.message);
      }
    },
    [bridge, selected],
  );
  const change = useCallback(
    (id, patch) =>
      commit((prev) => patchArticle(prev, id, patch), { typing: true }),
    [commit],
  );
  const numbered = useMemo(() => numberedArticles(doc), [doc]);
  const active = doc.articles.find((a) => a.id === selected) || doc.articles[0];
  const number = numbered.find((a) => a.id === active?.id)?.number;
  const scopedCatalogue = useMemo(
    () =>
      catalogue.filter(
        (o) =>
          scope === "tous" ||
          (scope === "exemples") ===
            (o.source.kind === "exemple_pedagogique_donnees_fixes"),
      ),
    [catalogue, scope],
  );
  const filtered = useMemo(
    () =>
      scopedCatalogue.filter(
        (o) =>
          (!sub || o.sublot === sub) &&
          (!lot || lot === o.lotNumber + "|" + o.lotName) &&
          (o.designation_courte + " " + o.code + " " + o.sublot)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(
              query
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase(),
            ),
      ),
    [scopedCatalogue, lot, sub, scope, query],
  );
  const added = useMemo(() => new Set(doc.articles.map((a) => a.code)), [doc]);
  const pending = useMemo(
    () => numbered.filter((a) => articleIssues(a).length).length,
    [numbered],
  );
  const insert = (o) => {
    const id = crypto.randomUUID();
    commit((prev) => appendClause(prev, o, id));
    setSelected(doc.articles.find((a) => a.code === o.code)?.id || id);
    setPreview(false);
  };
  const importRows = () => {
    commit((prev) => {
      const next = importMinute(prev, project.rows, catalogue);
      setSelected(next.articles[0]?.id || "");
      return next;
    });
    setNotice(
      "Désignations et localisations importées. Complète les articles sans correspondance de code ; les textes déjà rédigés sont conservés.",
    );
  };
  const exportFile = (type) => {
    setError("");
    setBusy(type);
    const w = new Worker("/cctp/export-worker.js");
    worker.current = w;
    w.onmessage = ({ data }) => {
      w.terminate();
      worker.current = null;
      setBusy("");
      if (data.error) {
        setError(data.error);
        return;
      }
      saveBlob(
        data.bytes,
        safeName(project.title) + (project.country==='luxembourg' ? "_Descriptif_LU." : "_CCTP_FR.") + (type === "pdf" ? "pdf" : "docx"),
        type === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      setNotice("CCTP exporté.");
    };
    w.onerror = () => {
      w.terminate();
      worker.current = null;
      setBusy("");
      setError("L’export a été interrompu. Les articles sont conservés.");
    };
    w.postMessage({
      type,
      project: { title: project.title, meta: project.meta, country:project.country, cctp: doc },
      options: { sources: includeSources },
    });
  };
  const groups = useMemo(
    () => [
      ...new Set(
        scopedCatalogue
          .filter((o) => !lot || lot === o.lotNumber + "|" + o.lotName)
          .map((o) => o.sublot),
      ),
    ],
    [scopedCatalogue, lot],
  );
  const libraryTree = useMemo(
    () => catalogueTree(scopedCatalogue),
    [scopedCatalogue],
  );
  const documentTree = useMemo(() => articleTree(numbered), [numbered]);
  const measurementCodes = useMemo(
    () =>
      new Set(
        catalogue.filter((o) => clauseMeasurement(o).length).map((o) => o.code),
      ),
    [catalogue],
  );
  const measurementClause = catalogue.find(
    (o) => o.code === active?.source?.code,
  );
  return (
    <div className="cc-app">
      <div className="cc-toolbar">
        <div>
          <p className="cc-overline">
            {documentLabel(project.country)} · {COUNTRIES[project.country || 'france']}
          </p>
          <h3>{project.title}</h3>
          <p>
            {doc.articles.length
              ? `${doc.articles.length} article(s) · ${pending ? pending + " à compléter ou relire" : "articles relus"}`
              : "Aucun article pour le moment"}
          </p>
        </div>
        <div className="cc:flex cc:flex-wrap cc:gap-2">
          <button
            className="cc-btn"
            disabled={readOnly || !project.rows.length || !catalogue.length}
            data-tour="cctp-import-minute" onClick={importRows}
          >
            Importer la minute
          </button>
          <button
            className="cc-btn"
            disabled={readOnly}
            onClick={() => {
              const id = crypto.randomUUID();
              commit((prev) => ({
                ...prev,
                articles: [
                  ...prev.articles,
                  {
                    ...fromClause(
                      {
                        code: "",
                        lotNumber: "01",
                        lotName: "Lot à définir",
                        sublot: "Articles libres",
                        designation_courte: "Nouvel article",
                        clause_cctp: {},
                      },
                      id,
                    ),
                  },
                ],
              }));
              setSelected(id);
              setPreview(false);
            }}
          >
            + Article libre
          </button>
          <button
            className="cc-btn cc-export"
            disabled={!doc.articles.length || !!busy}
            data-tour="cctp-export-word" onClick={() => exportFile("docx")}
          >
            {busy === "docx" ? "Préparation…" : "↓ Word .docx"}
          </button>
          <button
            className="cc-btn cc-export"
            disabled={!doc.articles.length || !!busy}
            data-tour="cctp-export-pdf" onClick={() => exportFile("pdf")}
          >
            {busy === "pdf" ? "Préparation…" : "↓ PDF"}
          </button>
        </div>
      </div>
      {error && (
        <p className="cc-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="cc-notice" role="status">
          {notice}
        </p>
      )}
      <div className="cc-layout">
        <aside className="cc-library">
          <div className="cc-library-head">
            <h4>Bibliothèque des cours</h4>
            <p>
              {libraryTree.length} lot(s) extrait(s) · {catalogue.length} fiches
            </p>
          </div>
          <div className="cc-library-filters">
            <label>
              Lot
              <select
                aria-label="Lot de bibliothèque"
                value={lot}
                onChange={(e) => {
                  setLot(e.target.value);
                  setSub("");
                  setLimit(25);
                }}
              >
                <option value="">Tous les lots extraits</option>
                {libraryTree.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.number} — {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sous-lot
              <select
                aria-label="Sous-lot de bibliothèque"
                value={sub}
                onChange={(e) => {
                  setSub(e.target.value);
                  setLimit(25);
                }}
              >
                <option value="">Tous les sous-lots</option>
                {groups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <details className="cc-library-tree">
              <summary>Parcourir les lots et sous-lots</summary>
              <nav aria-label="Arborescence de la bibliothèque">
                {libraryTree.map((l) => (
                  <details key={l.id} open style={{'--lot-color':lotColor(l.name).color,'--lot-tint':lotColor(l.name).tint}}>
                    <summary className="cctp-lot-color">
                      {l.number} — {l.name}
                    </summary>
                    {l.groups.map((g) => (
                      <button
                        className={
                          lot === l.id && sub === g.name ? "cc-selected" : ""
                        }
                        key={g.name}
                        aria-pressed={lot === l.id && sub === g.name}
                        onClick={() => {
                          setLot(l.id);
                          setSub(g.name);
                          setQuery("");
                          setLimit(25);
                        }}
                      >
                        {g.name}
                        <span>{g.count}</span>
                      </button>
                    ))}
                  </details>
                ))}
              </nav>
            </details>
            <input
              aria-label="Rechercher une clause"
              placeholder="Désignation ou code…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(25);
              }}
            />
            <select
              aria-label="Type de fiches"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setSub("");
                setLimit(25);
              }}
            >
              <option value="trames">Trames et ouvrages</option>
              <option value="exemples">Exemples à valeurs fixes</option>
              <option value="tous">Toutes les fiches</option>
            </select>
            <p className="cc-note">
              {catalogue.length
                ? `${filtered.length} fiche(s) · ${catalogue.length} au total`
                : "Chargement des clauses…"}
            </p>
          </div>
          <div className="cc-library-list">
            {!!catalogue.length && !filtered.length && (
              <p className="cc-note">
                Aucune fiche ne correspond à ces filtres.
              </p>
            )}
            {filtered.slice(0, limit).map((o) => (
              <div className="cc-clause" key={o.code}>
                <div className="cc:flex cc:items-center cc:justify-between cc:gap-2">
                  <span className="cc-code">{o.code}</span>
                  <small>{o.unite || "Unité à définir"}</small>
                </div>
                <strong>{o.designation_courte}</strong>
                {o.normative && <aside className="cc-vigilance cc-vigilance-compact"><strong>Vigilance Métreur</strong><p>{o.normative.alerte_interface_site}</p></aside>}
                <p>{o.clause_cctp.description_technique}</p>
                <details className="cc-clause-details">
                  <summary>Lire la fiche complète</summary>
                  <strong>Description</strong>
                  <p>
                    {o.clause_cctp.description_technique ||
                      "Non précisée dans cette fiche."}
                  </p>
                  <strong>Mise en œuvre</strong>
                  <p>
                    {o.clause_cctp.mise_en_oeuvre ||
                      "Non précisée dans cette fiche."}
                  </p>
                  <strong>Références proposées · domaine à vérifier</strong>
                  <p>
                    {o.clause_cctp.normes_dtu?.join(" ; ") ||
                      "Aucune référence relevée."}
                  </p>
                  <strong>Mode de métré</strong>
                  <p>
                    {blocksText(clauseMeasurement(o)) ||
                      "Non précisé dans cette fiche."}
                  </p>
                  <strong>Localisation type</strong>
                  <p>
                    {o.clause_cctp.localisation_type ||
                      "À renseigner au projet."}
                  </p>
                </details>
                <small>{o.source.pages}</small>
                {o.source.kind === "exemple_pedagogique_donnees_fixes" && (
                  <span className="cc-badge">Exemple du cours</span>
                )}
                {/sans_clause|sans_dimensionnement|cite/.test(
                  o.source.kind,
                ) && (
                  <span className="cc-badge">
                    Description technique à compléter
                  </span>
                )}
                <div className="cc:flex cc:flex-wrap cc:gap-2 cc:mt-2">
                  <button
                    className="cc-btn"
                    disabled={readOnly || added.has(o.code)}
                    onClick={() => insert(o)}
                  >
                    {added.has(o.code) ? "✓ Ajouté" : "Insérer"}
                  </button>
                  {active && (
                    <button
                      className="cc-btn cc-link-clause"
                      disabled={readOnly}
                      onClick={() => {
                        const src = fromClause(o, active.id);
                        change(active.id, {
                          ...src,
                          title: active.title,
                          rowIds: active.rowIds,
                          location: active.location,
                        });
                        setNotice(
                          "Clause appliquée à l’article sélectionné ; sa désignation et ses localisations sont conservées.",
                        );
                      }}
                    >
                      Appliquer à l’article
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length > limit && (
              <button className="cc-btn" onClick={() => setLimit(limit + 25)}>
                Afficher 25 fiches de plus
              </button>
            )}
          </div>
          <p className="cc-library-foot">
            <button
              className="cc-btn"
              disabled={!database.current}
              onClick={() =>
                saveBlob(
                  JSON.stringify(database.current, null, 2),
                  "Bibliotheque_FR_LU_Lots01_02.json",
                  "application/json",
                )
              }
            >
              ↓ JSON FR/LU · lots 01–02
            </button>
            <p><a className="cc-btn" href="/data/referentiel-normatif-france-lots01-02.json" download="Referentiel_normatif_FR_Lots01_02.json">↓ JSON normatif France</a></p>
            <p><a href="/data/audit-normatif-france.json" download="Audit_normatif_FR.json">↓ Registre d’audit et sources</a></p>
            <br />
            Livres IB2701, édition108-4. Adaptation FR/LU des lots01 et02,
            vérifiée le13/11/2026. Les autres lots restent issus du cours.
            Les unités et les prescriptions sont à préciser au marché ;
            les exemples fixes nécessitent une adaptation au chantier.
          </p>
        </aside>
        <main className="cc-document">
          <div className="cc-document-actions">
            <div className="cc:flex cc:flex-wrap cc:gap-2">
              <button
                className="cc-btn"
                disabled={
                  readOnly ||
                  !doc.articles.some(
                    (a) =>
                      !blocksText(a.measurement).trim() &&
                      measurementCodes.has(a.source?.code),
                  )
                }
                onClick={() => {
                  commit((prev) => fillMissingMeasurements(prev, catalogue));
                  setNotice(
                    "Modes de métré vides complétés depuis les fiches sources. Les textes déjà rédigés sont conservés.",
                  );
                }}
              >
                Compléter les modes vides
              </button>
              <button
                className="cc-btn"
                disabled={!doc.articles.length}
                onClick={() => setPreview(!preview)}
              >
                {preview ? "Revenir à l’édition" : "Aperçu complet"}
              </button>
              <button
                className="cc-btn"
                disabled={readOnly || !undo.current.length}
                onClick={() => {
                  const prev = undo.current.pop();
                  lastTyped.current = null;
                  if (prev) {
                    bridge.setCctp(prev);
                    docRef.current = prev;
                    setDoc(prev);
                  }
                }}
              >
                Annuler la dernière action
              </button>
            </div>
            <label className="cc-check">
              <input
                type="checkbox"
                checked={includeSources}
                onChange={(e) => setIncludeSources(e.target.checked)}
              />
              Sources dans l’export
            </label>
          </div>
          {!doc.articles.length ? (
            <div className="cc-empty">
              <span>01</span>
              <h4>Rédige ton premier CCTP</h4>
              <p>
                Insère une clause à gauche, importe tes désignations depuis la
                minute ou crée un article libre.
              </p>
              <p>Les quantités et les prix restent dans l’avant-métré.</p>
            </div>
          ) : (
            <>
              <details className="cc-toc" open>
                <summary>
                  Sommaire automatique · {doc.articles.length} article(s)
                </summary>
                <nav aria-label="Sommaire CCTP">
                  {documentTree.map((l) => (
                    <details className="cc-toc-lot" key={l.heading} open>
                      <summary className="cctp-lot-color" style={{'--lot-color':lotColor(l.heading).color,'--lot-tint':lotColor(l.heading).tint}}>{l.heading}</summary>
                      {l.groups.map((g) => (
                        <section key={g.heading}>
                          <h5>{g.heading}</h5>
                          {g.articles.map((a) => (
                            <button
                              key={a.id}
                              className={
                                a.id === active?.id ? "cc-selected" : ""
                              }
                              aria-current={
                                a.id === active?.id ? "true" : undefined
                              }
                              onClick={() => {
                                setSelected(a.id);
                                setPreview(false);
                              }}
                            >
                              <span>{a.number}</span>
                              {a.title || "Sans titre"}
                              {articleIssues(a).length > 0 && (
                                <small>À relire</small>
                              )}
                            </button>
                          ))}
                        </section>
                      ))}
                    </details>
                  ))}
                </nav>
              </details>
              {preview ? (
                <div className="cc-paper cc-preview">
                  <h3>{documentLabel(project.country)} — {project.title}</h3>
                  {numbered.map((a) => (
                    <article key={a.id}>
                      <h4>
                        {a.number} {a.title}
                      </h4>
                      {a.references && (
                        <p>
                          <em>Références citées : {a.references}</em>
                        </p>
                      )}
                      {[
                        ["Description", a.description],
                        ["Mise en œuvre", a.execution],
                        ["Localisation", a.location],
                        ["Mode de métré", a.measurement || []],
                      ].map(([label, b]) => (
                        <section key={label}>
                          <strong>{label}</strong>
                          {b.map((block, i) => (
                            <p key={i}>
                              {block.list === "bullet"
                                ? "• "
                                : block.list === "ordered"
                                  ? `${i + 1}. `
                                  : ""}
                              {block.runs.map((r, j) => (
                                <span
                                  key={j}
                                  style={{
                                    fontWeight: r.bold ? "bold" : undefined,
                                    fontStyle: r.italic ? "italic" : undefined,
                                  }}
                                >
                                  {r.text}
                                </span>
                              ))}
                            </p>
                          ))}
                        </section>
                      ))}
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <div className="cc-article-bar">
                    <p>
                      {active?.code || "Article libre"}
                      {active && " · " + articleIssues(active).join(" / ")}
                    </p>
                    <div className="cc:flex cc:gap-2">
                      {["up", "down"].map((dir) => (
                        <button
                          className="cc-btn"
                          key={dir}
                          disabled={readOnly}
                          aria-label={
                            dir === "up"
                              ? "Monter l’article"
                              : "Descendre l’article"
                          }
                          onClick={() =>
                            commit((prev) => {
                              const arr = prev.articles.slice(),
                                i = arr.findIndex((a) => a.id === active.id),
                                j = i + (dir === "up" ? -1 : 1);
                              if (j < 0 || j >= arr.length) return prev;
                              [arr[i], arr[j]] = [arr[j], arr[i]];
                              return { ...prev, articles: arr };
                            })
                          }
                        >
                          {dir === "up" ? "↑" : "↓"}
                        </button>
                      ))}
                      <button
                        className="cc-btn cc-delete"
                        disabled={readOnly}
                        onClick={() => {
                          commit((prev) => ({
                            ...prev,
                            articles: prev.articles.filter(
                              (a) => a.id !== active.id,
                            ),
                          }));
                          setSelected("");
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  {active && (
                    <ArticleEditor
                      key={active.id}
                      article={active}
                      number={number}
                      onChange={change}
                      readOnly={readOnly}
                      measurementClause={measurementClause}
                    />
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
