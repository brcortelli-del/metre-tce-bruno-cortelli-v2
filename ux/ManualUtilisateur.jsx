import { DEMO_MODE, preferenceStore } from '../public/demo-mode.js';
import React, { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Banknote, BookOpen, ChevronRight, Download, Eye, EyeOff, GraduationCap, Keyboard, Lightbulb, List, LoaderCircle, Maximize2, Printer, Search, TriangleAlert, X, Compass, Ruler, FileText } from "lucide-react";
import { Modal } from "./components.jsx";
import { searchManual, visibleManualSections, manualPrintChapters } from "./manual-model.js";

const ICONS = { "prise-en-main": Compass, "pas-a-pas": Ruler, "cctp-export": FileText, "chiffrage-appro": Banknote, exercice: GraduationCap };
const CHAPTER_IDS = ['prise-en-main', 'pas-a-pas', 'cctp-export', 'chiffrage-appro', 'exercice'];
let cachedGuide;
async function loadGuide() {
  // Les 52 pages et les PDF ne sont jamais chargés au démarrage du calculateur.
  if (cachedGuide) return cachedGuide;
  const response = await fetch("/manual/content.json?v=15");
  if (!response.ok) throw new Error("Le guide n’a pas pu être chargé. Réessaie dans un instant.");
  const result = await response.json();
  if (!Array.isArray(result.chapters) || result.chapters.length !== CHAPTER_IDS.length || CHAPTER_IDS.some((id,i)=>result.chapters[i]?.id !== id)) throw new Error("Le guide reçu est incomplet.");
  cachedGuide = result;
  return result;
}
function Inline({ text }) {
  return String(text || "").split(/(\*\*.*?\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part.replaceAll(String.fromCharCode(96), "")
  );
}
const ContentBlock = memo(function ContentBlock({ block, zoom, onNavigate }) {
  if (block.type === "heading") return <h3><Inline text={block.text} /></h3>;
  if (block.type === "paragraph") return <p><Inline text={block.text} /></p>;
  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return <Tag start={block.ordered ? block.start : undefined}>{block.items.map((text, i) =>
      <li key={i}><Inline text={text} /></li>)}</Tag>;
  }
  if (block.type === "table") {
    return <div className={"manual-table-wrap " + (block.rows[0].length >= 6 ? "manual-table-wide" : "")}
      role="region" aria-label={"Tableau " + block.rows[0].join(", ")} tabIndex={0}>
      <table className="manual-table">
        <thead><tr>{block.rows[0].map((cell, i) => <th key={i} scope="col"><Inline text={cell} /></th>)}</tr></thead>
        <tbody>{block.rows.slice(1).map((row, i) => <tr key={i}>{row.map((cell, j) =>
          <td key={j} className={/^[−-]\d/.test(cell) ? "manual-negative" : undefined}>
            {cell.split("\\n").map((line, k) => k ? <small className="manual-report" key={k}><Inline text={line} /></small> : <Inline text={line} key={k} />)}
          </td>)}</tr>)}</tbody>
      </table>
      {block.rows[0].length >= 6 && <span className="manual-table-scroll-hint">Fais défiler le tableau horizontalement pour lire toutes les colonnes.</span>}
    </div>;
  }
  if (block.type === "callout") {
    const Icon = block.tone === "warning" ? TriangleAlert : block.tone === "keyboard" ? Keyboard : Lightbulb;
    return <aside className={"manual-callout " + block.tone}><Icon size={19} aria-hidden="true" />
      <div><b>{block.title}</b><p><Inline text={block.text} /></p></div></aside>;
  }
  if (block.type === "image") {
    return <figure className="manual-figure">
      <button type="button" onClick={() => zoom(block)} aria-label={"Agrandir " + block.alt}>
        <img src={block.src} alt={block.alt} loading="lazy" width={block.width} height={block.height} />
        <span className="manual-zoom"><Maximize2 size={15} /> Agrandir</span>
      </button><figcaption>{block.alt}</figcaption>
    </figure>;
  }
  if (block.type === "link") return <p className="manual-source-link"><a href={block.url} target="_blank" rel="noopener noreferrer">
    Consulter la source officielle <ChevronRight size={13} /></a></p>;
  if (block.type === "action") return <button type="button" className="ux-button manual-workspace-action" onClick={()=>onNavigate?.(block.view)} disabled={!onNavigate}>{block.text}<ArrowRight size={15} /></button>;
  return null;
});

const PrintManual = memo(function PrintManual({ data, showCorrection, root }) {
  const chapters=manualPrintChapters(data,showCorrection);
  return <div className="manual-print-document" ref={root}>
    <h1>Manuel d’utilisation & cahier d’exercices</h1><p>Atelier Métré Pro · Édition complète · {data.updatedAt}</p>
    <p>{showCorrection?'Le corrigé est inclus, conformément au choix d’affichage.':'Version apprenant : le corrigé est exclu.'}</p>
    <h2>Sommaire</h2><ol>{chapters.map(c=><li key={c.id}>{c.number} · {c.title}</li>)}</ol>
    {chapters.map(c=><section className="manual-print-chapter" key={c.id}><div className="manual-chapter-heading"><span className="manual-kicker">CHAPITRE {c.number} / {String(chapters.length).padStart(2,'0')}</span><h2>{c.title}</h2><p>{c.subtitle}</p></div>
      {c.sections.map(s=><article className={'manual-section'+(s.correction?' manual-print-corrected':'')} key={s.id}><header><h2>{s.title}</h2></header>{s.blocks.filter(b=>b.type!=='action').map((b,i)=><ContentBlock key={i} block={b} />)}</article>)}
    </section>)}
  </div>;
});
function getSavedChapter() {
  try { return preferenceStore.getItem("atelier-manual-chapter") || "prise-en-main"; } catch { return "prise-en-main"; }
}
function ManuelUtilisateur({ onFermer, onNavigate }) {
  const [data, setData] = useState(cachedGuide || null);
  const [error, setError] = useState(""), [attempt, retry] = useState(0);
  const [chapterId, setChapterId] = useState(getSavedChapter);
  const [query, setQuery] = useState(""), deferredQuery = useDeferredValue(query);
  const [showCorrection, setShowCorrection] = useState(false);
  const [image, setImage] = useState(null), [jump, setJump] = useState(null);
  const [printAll,setPrintAll]=useState(false),[preparingPrint,setPreparingPrint]=useState(false);
  const heading = useRef(null), reader = useRef(null), search = useRef(null);
  const printRoot=useRef(null);
  useEffect(()=>{const done=()=>setPrintAll(false);window.addEventListener('afterprint',done);return()=>window.removeEventListener('afterprint',done);},[]);
  useEffect(() => {
    let live = true;
    setError("");
    loadGuide().then((value) => { if (live) setData(value); }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [attempt]);
  useEffect(() => {
    try { preferenceStore.setItem("atelier-manual-chapter", chapterId); } catch {}
  }, [chapterId]);
  useEffect(() => {
    if (!data || !jump) return;
    const id = requestAnimationFrame(() => {
      const target = document.getElementById("manual-section-" + jump);
      target?.scrollIntoView({ behavior: "auto", block: "start" });
      target?.focus({ preventScroll: true });
      setJump(null);
    });
    return () => cancelAnimationFrame(id);
  }, [data, jump, chapterId, query]);
  const chapter = data?.chapters.find((c) => c.id === chapterId) || data?.chapters[0];
  const sections = useMemo(() => chapter ? visibleManualSections(chapter, showCorrection) : [], [chapter, showCorrection]);
  const results = useMemo(() => data ? searchManual(data, deferredQuery, showCorrection) : { items: [], total: 0 }, [data, deferredQuery, showCorrection]);
  const searching = query.trim().length > 0;
  const navigate = (id, sectionId = null) => {
    setChapterId(id);setQuery("");
    if (sectionId) setJump(sectionId);
    else requestAnimationFrame(() => { reader.current?.scrollIntoView({ block: "start" });heading.current?.focus({ preventScroll: true }); });
  };
  const printChapter = async (all=false) => {
    if(preparingPrint)return;
    setPreparingPrint(true);setPrintAll(all);
    // Le document complet n'est construit qu'à la demande d'impression.
    await new Promise(requestAnimationFrame);
    const root=all?printRoot.current:reader.current;
    await Promise.allSettled([...root?.querySelectorAll("img")||[]].map(async img=>{img.loading='eager';await img.decode();}));
    try{window.print();}finally{setPreparingPrint(false);}
  };
  const pdf = (key) => data?.documents.find((d) => d.id === key);
  const pdfUrl = (section) => {
    const doc = pdf(section.document);
    return doc ? doc.url + (section.pdfPage ? "#page=" + section.pdfPage : "") : null;
  };
  return <section className={'manual-app'+(printAll?' manual-print-all':'')} aria-labelledby="manual-title" aria-busy={preparingPrint}>
    <style media="print">{"@page { size: A4 " + (!printAll && chapterId === "exercice" && showCorrection ? "landscape" : "portrait") + "; margin: 14mm; } @page manual-wide {size: A4 landscape; margin:14mm;}"}</style>
    <header className="manual-hero">
      <div className="manual-heading-group"><span className="manual-book-icon"><BookOpen size={27} /></span>
        <div><span className="ux-overline">GUIDE DE TON ATELIER · ÉDITION COMPLÈTE</span><h1 id="manual-title">Manuel d’utilisation & exercices</h1>
          <p>Du relevé sur plan au CCTP FR/LU, au chiffrage et aux préparations de commande.</p></div></div>
      <div className="manual-actions">
        <button type="button" className="ux-button" onClick={()=>printChapter(false)} disabled={!data || searching || preparingPrint} title="Imprime le chapitre affiché, avec le corrigé uniquement s’il est révélé."><Printer size={16} /> Imprimer le chapitre</button>
        <button type="button" className="ux-button" onClick={()=>printChapter(true)} disabled={!data || searching || preparingPrint} title="Imprime les cinq chapitres ; le corrigé est inclus seulement si tu l’as affiché."><Printer size={16} /> Tout imprimer / PDF</button>
        <button type="button" className="ux-button primary" onClick={onFermer}><ArrowLeft size={16} /> Retour à l’atelier</button>
      </div>
    </header>
    <div className="manual-layout">
      <aside className="manual-navigation" aria-label="Sommaire du manuel">
        <label className="manual-search-label" htmlFor="manual-search">Rechercher dans le guide</label>
        <div className="manual-search"><Search size={17} /><input ref={search} id="manual-search" type="search" value={query}
          placeholder="Échelle, HSP, déductions…" onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape" && query) { e.preventDefault();e.stopPropagation();setQuery(""); } }} />
          {query && <button type="button" aria-label="Effacer la recherche" onClick={() => { setQuery("");search.current?.focus(); }}><X size={14} /></button>}
        </div>
        <p className="manual-nav-caption">LES CHAPITRES</p>
        <nav>{(data?.chapters || []).map((c) => {
          const Icon = ICONS[c.id] || BookOpen;
          return <button type="button" key={c.id} data-tour={"manual-"+c.id} onClick={() => navigate(c.id)}
            className={chapter?.id === c.id && !searching ? "active" : ""} aria-current={chapter?.id === c.id && !searching ? "page" : undefined}>
            <span className="manual-nav-icon"><Icon size={19} /></span><span><b>{c.number} · {c.title}</b><small>{c.subtitle}</small></span><ChevronRight size={14} /></button>;
        })}</nav>
        {data && <div className="manual-downloads"><p className="manual-nav-caption">DOCUMENTS D’ORIGINE</p>
          <a href={pdf("guide").url} download="Manuel_Atelier_Metre_TCE.pdf"><Download size={17} /><span>Manuel d’utilisation<small>{pdf("guide").pages} pages · PDF</small></span></a>
          <a href={pdf("exercise").url} download="Exercice_et_corrige_Metre_TCE.pdf"><Download size={17} /><span>Exercice et corrigé<small>{pdf("exercise").pages} pages · PDF</small></span></a>
          <p>Les PDF fournis sont conservés. Le guide en ligne ajoute le chiffrage, les achats et l’audit. Le PDF de l’exercice contient aussi la correction.</p></div>}
        <div className="manual-side-note"><Lightbulb size={17} /><p><strong>Workflow pro</strong> · Métré → Audit d’oublis → Chiffrage DPGF → CCTP et préparation des achats.</p></div>
        <div className="manual-side-note"><Lightbulb size={17} /><p>Le manuel se consulte sans modifier ton projet. Utilise « Retour à l’atelier » pour reprendre ta saisie.</p></div>
      </aside>
      <div className="manual-reader" ref={reader}>
        {!data && !error && <div className="manual-loading" role="status"><LoaderCircle size={24} className="manual-spinner" /> Chargement du manuel…</div>}
        {error && <div className="manual-loading" role="alert"><TriangleAlert size={24} /><p>{error}</p><button type="button" className="ux-button" onClick={() => retry((n) => n + 1)}>Réessayer</button></div>}
        {data && searching ? <div className="manual-paper">
          <div className="manual-chapter-heading"><span className="manual-kicker">RECHERCHE DANS LE GUIDE</span><h2>Résultats pour « {query} »</h2>
            <p role="status" aria-live="polite">{query.trim().length < 2 ? "Saisis au moins deux caractères." : results.total + " section" + (results.total > 1 ? "s" : "") + " trouvée" + (results.total > 1 ? "s" : "") + "."}</p></div>
          <div className="manual-results">{results.items.map((result) => <button type="button" key={result.sectionId} onClick={() => navigate(result.chapterId, result.sectionId)}>
            <small>{result.chapterTitle}</small><h3>{result.title}</h3><p>{result.snippet}</p><span>Lire la section <ChevronRight size={14} /></span></button>)}</div>
          {!results.total && query.trim().length >= 2 && <p>Aucune section correspondante. Essaie « plan », « foisonnement » ou « Word ».</p>}
          {!showCorrection && <div className="manual-callout tip"><GraduationCap size={18} /><p>Le corrigé est exclu de la recherche tant que tu ne l’as pas affiché dans <button type="button" className="manual-text-button" onClick={() => navigate("exercice")}>Exercice complet & corrigé</button>.</p></div>}
          <button type="button" className="ux-button" onClick={() => setQuery("")}>Revenir au chapitre</button>
        </div> : data && <>
          <div className="manual-paper">
            <div className="manual-chapter-heading"><span className="manual-kicker">CHAPITRE {chapter.number} / {String(data.chapters.length).padStart(2,'0')}</span>
              <h2 ref={heading} tabIndex={-1}>{chapter.title}</h2><p>{chapter.subtitle}</p></div>
            {chapter.id === "exercice" && <div className="manual-exercise-intro">
              <div><GraduationCap size={25} /><span><b>Construction d’un garage individuel</b><small>6,00 × 4,00 m · HSP 2,50 m · trois baies</small></span></div>
              <p>Réalise le sujet avant d’afficher la correction. Les hypothèses et les bases de mesure sont précisées dans l’énoncé.</p>
              <button type="button" className={"ux-button " + (!showCorrection ? "primary" : "")} aria-expanded={showCorrection} data-tour="manual-correction" aria-controls="manual-correction"
                onClick={() => setShowCorrection((show) => !show)}>{showCorrection ? <EyeOff size={17} /> : <Eye size={17} />}{showCorrection ? "Masquer le corrigé" : "Afficher le corrigé"}</button>
            </div>}
            <details className="manual-section-index">
              <summary><List size={17} /> Dans ce chapitre <span>{sections.length} sections</span></summary>
              <nav aria-label="Sections du chapitre">{sections.map((s) => <button type="button" key={s.id} onClick={() => setJump(s.id)}>{s.title}{s.correction && <small>Corrigé</small>}</button>)}</nav>
            </details>
            {sections.filter((s) => !s.correction).map((s) => <article id={"manual-section-" + s.id} key={s.id} className="manual-section" tabIndex={-1}>
              <header><h2>{s.title}</h2>{pdfUrl(s) && <a href={pdfUrl(s)} target="_blank" rel="noopener noreferrer" className="manual-page-link">PDF{ s.pdfPage ? " · p. " + s.pdfPage : ""} <ChevronRight size={12} /></a>}</header>
              {s.blocks.map((b, i) => <ContentBlock key={i} block={b} zoom={setImage} onNavigate={onNavigate} />)}
            </article>)}
            {chapter.id === "exercice" && <div id="manual-correction">
              {showCorrection ? <><div className="manual-correction-title"><GraduationCap size={25} /><div><span className="manual-kicker">CAS D’ÉCOLE · CORRECTION</span><h2>Le corrigé détaillé</h2></div>
                <button type="button" className="ux-button" onClick={() => { setShowCorrection(false);reader.current?.scrollIntoView({ block: "start" }); }}><EyeOff size={16} /> Masquer</button></div>
                {sections.filter((s) => s.correction).map((s) => <article id={"manual-section-" + s.id} key={s.id} className="manual-section manual-corrected-section" tabIndex={-1}>
                  <header><h2>{s.title}</h2><a href={pdfUrl(s)} target="_blank" rel="noopener noreferrer" className="manual-page-link">PDF{ s.pdfPage ? " · p. " + s.pdfPage : ""}<ChevronRight size={12} /></a></header>
                  {s.blocks.map((b, i) => <ContentBlock key={i} block={b} zoom={setImage} onNavigate={onNavigate} />)}
                </article>)}</> :
                <div className="manual-hidden-correction"><EyeOff size={26} /><h3>Le corrigé attend ton premier essai</h3><p>Il contient les calculs détaillés, les minutes par lot et la comparaison FR / LU.</p>
                  <button type="button" className="ux-button primary" onClick={() => setShowCorrection(true)}><Eye size={16} /> Afficher le corrigé</button></div>}
            </div>}
            <footer className="manual-reading-footer"><span>Édition complète · {data.updatedAt} · Guide en ligne actualisé</span>
              <button type="button" className="manual-text-button" onClick={() => reader.current?.scrollIntoView({ block: "start" })}>Revenir au début du chapitre ↑</button></footer>
          </div>
        </>}
      </div>
    </div>
    {printAll && data && <PrintManual data={data} showCorrection={showCorrection} root={printRoot} />}
    {image && <Modal title={image.alt} subtitle="Illustration extraite du document joint." onClose={() => setImage(null)} wide>
      <div className="manual-image-dialog"><img src={image.src} alt={image.alt} /></div>
    </Modal>}
  </section>;
}
export default memo(ManuelUtilisateur);
