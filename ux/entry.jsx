import PortableLogin from './PortableLogin.jsx';
import ManuelUtilisationModal from '../src/components/ManuelUtilisationModal.jsx';
import LocalProjects from './LocalProjects.jsx';
import PlanVision from './PlanVision.jsx';
import LexiqueSurlignageBTP,{ouvrirLexique} from '../src/components/LexiqueSurlignageBTP.jsx';
import { DEMO_MODE, preferenceStore } from '../public/demo-mode.js';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  Ruler,
  Table2,
  FileText,
  LibraryBig,
  Upload,
  Sun,
  Moon,
  Keyboard,
  Undo2,
  Redo2,
  FolderOpen,
  SlidersHorizontal,
  Boxes,
  Banknote,
  Package,
  History,
  Download,
  Search,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  Film,
  Bot,
} from "lucide-react";
import { Modal } from "./components.jsx";
import { FormulaAssistant } from "./FormulaAssistant.jsx";
import { ImportWizard } from "./ImportWizard.jsx";
import { NormsPage } from "./NormsPage.jsx";
import ChiffrageDPGF from "./ChiffrageDPGF.jsx";
import ApprovisionnementEtAudit from "./ApprovisionnementEtAudit.jsx";
import TutorielVideoSite from "./TutorielVideoSite.jsx";
import ManuelUtilisateur from "./ManualUtilisateur.jsx";
import AssistantMetreIA from "./AssistantMetreIA.jsx";
import WorkspaceToolbar from "./WorkspaceToolbar.jsx";
import SettingsDrawer from "./SettingsDrawer.jsx";
import ProfessionalMinute from "./ProfessionalMinute.jsx";
import ExerciseWorkflow from "./ExerciseWorkflow.jsx";
import RowCctpWorkspace,{openCctpExport} from "./RowCctpWorkspace.jsx";
import QualityControl from './QualityControl.jsx';
import PremiumMetre from './PremiumMetre.jsx';
import {openQualityControl} from './quality-events.js';
import { LOT_PALETTE } from "../public/lot-colors.js";
const primaryNav = [
  ["professional", "Minute professionnelle", Table2, ""],
  ["plan", "Relevé sur plan", Ruler, "Alt P"],
  ["minute", "Feuille de minute", Table2, "Alt M"],
  ["cctp", "Éditeur CCTP FR / LU", FileText, "Alt C"],
  ["norms", "Normes & DTU", LibraryBig, ""],
  ["import", "Import CAO / BIM", Upload, ""],
  ["manual", "Manuel & exercices", BookOpen, ""],
  ["tutorial", "Tutoriel vidéo", Film, ""],
  ["assistant", "Assistant métré", Bot, ""],
];
const secondaryNav = [
  ["calculator", "Calculs & avant-métré", Ruler],
  ["project", "Fiche projet", FolderOpen],
  ["variables", "Variables", SlidersHorizontal],
  ["assemblies", "Ouvrages composés", Boxes],
  ["prices", "Étude de prix", Banknote],
  ["needs", "Approvisionnement & audit", Package],
  ["exports", "Exports & trames", Download],
  ["history", "Révisions & accès", History],
];
const titles = Object.fromEntries(
  [...primaryNav, ...secondaryNav].map(([v, label]) => [v, label]),
);
const keys = [
  ["Alt + P", "Ouvrir le relevé sur plan"],
  ["Alt + M", "Ouvrir la feuille de minute"],
  ["Alt + C", "Ouvrir l’éditeur CCTP"],
  ["L / S / C", "Sur le plan : ligne / surface / comptage"],
  ["Maj maintenue", "Sur le plan : verrouiller le segment à 90°"],
  ["Échap", "Arrêter le tracé ou fermer la fenêtre"],
  ["Ctrl + Alt + N", "Ajouter un ouvrage dans la minute professionnelle"],
  ["Ctrl + Alt + D", "Dupliquer la ligne sélectionnée, hors champ texte"],
  ["Ctrl + Z / Ctrl + Y", "Annuler / rétablir une action du projet"],
  ["Entrée / Tab", "Minute : cellule suivante (N → L → l → H)"],
  ["Maj + Entrée / Tab", "Minute : cellule précédente"],
  ["↑ / ↓", "Minute : même colonne, ligne précédente / suivante"],
];
const editable = (el) =>
  !!el?.closest?.(
    'input,textarea,select,[contenteditable="true"],[role="textbox"]',
  );
function App({ bridge }) {
 const [manualOpen,setManualOpen]=useState(false),[localProjectsOpen,setLocalProjectsOpen]=useState(false);
  const [workflowOpen,setWorkflowOpen]=useState(false);
  const previousWorkspace = useRef("calculator");
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [importModal,setImportModal]=useState(false);
  const [settingsDrawer,setSettingsDrawer]=useState(null);
  const closeAssistant=useCallback(()=>setAssistantOpen(false),[]);
  const [view, setView] = useState("calculator"),
    [collapsed, setCollapsed] = useState(false),
    [shortcuts, setShortcuts] = useState(false),
    [theme, setTheme] = useState(() => {
      try {
        return preferenceStore.getItem("atelier-theme") || "light";
      } catch {
        return "light";
      }
    });
  const [meta, setMeta] = useState({
      title: bridge.get().title,
      count: bridge.get().rows.length,
      country: bridge.get().country,
      role: document.body.dataset.role,
    }),
    [history, setHistory] = useState(bridge.history()),
    [formulaTarget, setFormulaTarget] = useState(null),
    [library, setLibrary] = useState(null),
    [catalogue, setCatalogue] = useState([]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="color-scheme"]')
      ?.setAttribute("content", theme === "dark" ? "dark" : "light");
    try {
      preferenceStore.setItem("atelier-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
  }, [collapsed]);
  useEffect(() => {
    const update = () => {
      const p = bridge.get();
      setMeta((prev) =>
        prev.title === p.title &&
        prev.count === p.rows.length &&
        prev.country === p.country &&
        prev.role === document.body.dataset.role
          ? prev
          : {
              title: p.title,
              count: p.rows.length,
              country: p.country,
              role: document.body.dataset.role,
            },
      );
      setHistory((h) => {
        const n = bridge.history();
        return h.undo === n.undo && h.redo === n.redo ? h : n;
      });
    };
    const navigate = (e) => {
      if (!["manual","tutorial"].includes(e.detail.view)) previousWorkspace.current = e.detail.view;
      setView(e.detail.view);
      setFormulaTarget(
        e.detail.view === "minute"
          ? document.getElementById("formulaAssistantSlot")
          : null,
      );
      update();
    };
    const ready = () =>
      setFormulaTarget(document.getElementById("formulaAssistantSlot"));
    const metaChange = () => update();
    document.addEventListener("atelier:view", navigate);
    document.addEventListener("atelier:minute-ready", ready);
    document.addEventListener("atelier:meta", metaChange);
    return () => {
      document.removeEventListener("atelier:view", navigate);
      document.removeEventListener("atelier:minute-ready", ready);
      document.removeEventListener("atelier:meta", metaChange);
    };
  }, [bridge]);
  useEffect(() => {
    let live = true;
    bridge
      .loadLibrary()
      .then(({ data, catalogue }) => {
        if (live) {
          setLibrary(data);
          setCatalogue(catalogue);
        }
      })
      .catch((e) => bridge.toast(e.message));
    return () => {
      live = false;
    };
  }, [meta.country, bridge]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.isComposing || e.repeat) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const v = { p: "plan", m: "minute", c: "cctp" }[e.key.toLowerCase()];
        if (v) {
          e.preventDefault();
          bridge.showView(v);
        }
        return;
      }
      if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key.toLowerCase()==='n'&&!editable(e.target)){e.preventDefault();bridge.showView('professional');requestAnimationFrame(()=>document.dispatchEvent(new Event('atelier:quick-row')));return;}
      const isEditable = editable(e.target),
        isMinute = !!e.target.closest?.("[data-minute-field]");
      // Lire le manuel ne doit pas annuler une action du chantier avec Ctrl Z.
      if (["manual","tutorial"].includes(view)) return;
      if (
        (e.ctrlKey || e.metaKey) &&
        (!isEditable || isMinute) &&
        ["z", "y"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        if (
          view === "plan" &&
          e.key.toLowerCase() === "z" &&
          !e.shiftKey &&
          bridge.plan.undoDraft()
        )
          return;
        if (
          view === "plan" &&
          (e.key.toLowerCase() === "y" || e.shiftKey) &&
          bridge.plan.redoDraft()
        )
          return;
        bridge.undo(e.key.toLowerCase() === "y" || e.shiftKey);
        return;
      }
      if (
        view === "plan" &&
        !isEditable &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const tool = { l: "length", s: "area", c: "count" }[
          e.key.toLowerCase()
        ];
        if (tool) {
          e.preventDefault();
          bridge.plan.setTool(tool);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, bridge]);
  const changeView = (v) => v==='import'?setImportModal(true):['project','variables'].includes(v)?setSettingsDrawer({target:v,returnView:view}):bridge.showView(v);
  return (
    <>
      <aside className="atelier-sidebar" aria-label="Navigation principale">
        <a
          className="atelier-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            changeView("calculator");
          }}
        >
          <span className="atelier-brand-mark">
            <Ruler size={25} />
          </span>
          <span>
            atelier
            <span className="brand-metre">
              métré<span className="brand-dot">.</span>
            </span>
          </span>
        </a>
        <button
          className="sidebar-toggle ux-icon-button"
          aria-label={
            collapsed ? "Déployer la navigation" : "Réduire la navigation"
          }
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? (
            <PanelLeftOpen size={19} />
          ) : (
            <PanelLeftClose size={19} />
          )}
        </button>
        <span className="sidebar-caption">ESPACE DE TRAVAIL</span>
        <nav>
          <button className="workflow-trigger" title="Guide & Workflow Exercice" aria-expanded={workflowOpen} onClick={()=>{setAssistantOpen(false);setWorkflowOpen(v=>!v);}}><BookOpen size={19}/><span>Guide & Workflow Exercice</span></button>
          {primaryNav.map(([id, title, Icon, key]) => (
            <button
              key={id}
              data-tour={"nav-"+id}
              title={title}
              aria-current={view === id ? "page" : undefined}
              aria-expanded={id==='assistant'?assistantOpen:undefined}
              className={(id==='assistant'?assistantOpen:view === id) ? "active" : ""}
              onClick={() => {if(id==='assistant'){setWorkflowOpen(false);setAssistantOpen(v=>!v);}else changeView(id);}}
            >
              <Icon size={19} />
              <span>{title}</span>
              {key && <kbd>{key}</kbd>}
              {id === "import" && <i className="nav-new" />}
            </button>
          ))}
        </nav>
        <details className="sidebar-more" open>
          <summary>OUTILS DU PROJET</summary>
          <nav>
            {secondaryNav.map(([id, title, Icon]) => (
              <button
                key={id}
              data-tour={"nav-"+id}
                title={title}
                aria-current={view === id ? "page" : undefined}
                className={view === id ? "active" : ""}
                onClick={() => changeView(id)}
              >
                <Icon size={17} />
                <span>{title}</span>
              </button>
            ))}
          </nav>
        </details>
        <div className="sidebar-bottom">
          <div className="lot-legend">
            <span className="sidebar-caption">REPÈRES PAR LOT</span>
            {LOT_PALETTE.slice(0, 4).map((p) => (
              <span key={p.key}>
                <i style={{ background: p.color }} />
                {p.name}
              </span>
            ))}
          </div>
          <div className="private-profile">
            <span className="profile-avatar">BC</span>
            <span>
              <b>Mon atelier privé</b>
              <small>École Chez Soi · TCE</small>
            </span>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <header className="atelier-header">
        <div className="header-topline">
        <div className="header-breadcrumb">
          <span>Mon atelier</span>
          <i>/</i>
          <b>{titles[view] || "Projet"}</b>
        </div>
        <div className="header-actions ux:flex ux:items-center"><PortableLogin/><button className="ux-button manual-open-button" onClick={()=>setManualOpen(true)}><BookOpen/><span>Manuel d’utilisation</span></button><button className="ux-icon-button" aria-label="Projets & sauvegardes" title="Projets & sauvegardes" onClick={()=>setLocalProjectsOpen(true)}><FolderOpen/></button><button className="ux-button" title="Lexique BTP" onClick={ouvrirLexique}><BookOpen size={16}/><span>Lexique BTP</span></button>
          <button className="ux-icon-button" title="Contrôle Qualité Avant Rendu" aria-label="Contrôle Qualité Avant Rendu" onClick={openQualityControl}><ShieldCheck size={16}/></button>
          <button className="ux-icon-button" title="Exporter le CCTP complet (.txt / Aperçu impression)" aria-label="Exporter le CCTP complet" onClick={openCctpExport}><FileText size={16}/></button>
          <button className="ux-button workflow-trigger" title="Guide & Workflow Exercice" aria-label="Guide & Workflow Exercice" aria-expanded={workflowOpen} onClick={()=>{setAssistantOpen(false);setWorkflowOpen(v=>!v);}}><BookOpen/><span>Guide exercice</span></button>
          <button
            className="ux-icon-button search-action"
            title="Rechercher un ouvrage"
            aria-label="Rechercher un ouvrage"
            onClick={() => {
              changeView("calculator");
              document.getElementById("catalogSearch").focus();
            }}
          >
            <Search size={19} />
          </button>
          <div className="history-controls">
            <button
              className="ux-icon-button"
              aria-label="Annuler la dernière action"
              title="Annuler · Ctrl Z"
              disabled={!history.undo || bridge.readOnly()}
              onClick={() => bridge.undo(false)}
            >
              <Undo2 size={18} />
            </button>
            <button
              className="ux-icon-button"
              aria-label="Rétablir la dernière action"
              title="Rétablir · Ctrl Y"
              disabled={!history.redo || bridge.readOnly()}
              onClick={() => bridge.undo(true)}
            >
              <Redo2 size={18} />
            </button>
          </div>
          <button
            data-tour="shortcuts" className="ux-button shortcut-button" aria-label="Raccourcis"
            onClick={() => setShortcuts(true)}
          >
            <Keyboard size={17} />
            <span>Raccourcis</span>
          </button>
          <button className="ux-button header-copilot" aria-label="Copilote IA" aria-expanded={assistantOpen} onClick={()=>{setWorkflowOpen(false);setAssistantOpen(v=>!v);}}><Bot size={16}/><span>Copilote IA</span></button>
          <button
            className="ux-button theme-toggle"
            data-tooltip={theme==='light'?'Passer au thème Nuit':'Passer au thème Atelier'}
            title={
              theme === "light"
                ? "Activer le mode sombre"
                : "Activer le mode clair"
            }
            aria-label={
              theme === "light"
                ? "Activer le mode sombre"
                : "Activer le mode clair"
            }
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            <span>{theme==='light'?'Atelier':'Nuit'}</span>
          </button>
          <span className="header-private">
            <ShieldCheck size={14} />
            Espace de travail
          </span>
        </div>
        </div>
        <WorkspaceToolbar bridge={bridge} view={view}/>
      </header>
      {createPortal(
        ["professional", "import", "norms", "manual", "needs", "prices", "tutorial"].includes(view) ? null : (
          <>
            <div className="workspace-title">
              <div>
                <span className="ux-overline">ATELIER DE MÉTRÉ · TCE</span>
                <h1>
                  {view === "calculator" ? "Chaque cote compte" : titles[view]}
                  <span className="heading-dot">.</span>
                </h1>
                <p>
                  {view === "calculator"
                    ? "Relever, calculer, vérifier. Tout votre métré, au même endroit."
                    : meta.title}
                </p>
              </div>
              <div className="workspace-meta">
                <span className="ux-chip">
                  <span className="status-dot" />
                  {meta.count} lignes de métré
                </span>
                <button
                  className="ux-button primary"
                  onClick={() => changeView("import")}
                >
                  <Upload size={16} />
                  Import CAO / BIM
                </button>
              </div>
            </div>
          </>
        ),
        document.getElementById("workspaceHeading"),
      )}
      {["professional", "import", "norms", "manual", "needs", "prices", "tutorial"].includes(view) &&
        createPortal(
          view === "professional" ? <ProfessionalMinute bridge={bridge}/> : view === "import" ? (
            <ImportWizard bridge={bridge} catalogue={catalogue} />
          ) : view === "prices" ? (
            <ChiffrageDPGF bridge={bridge} />
          ) : view === "needs" ? (
            <ApprovisionnementEtAudit bridge={bridge} />
          ) : view === "tutorial" ? (
            <TutorielVideoSite onFermer={() => bridge.showView(previousWorkspace.current)} onNavigate={view=>bridge.showView(view)} />
          ) : view === "manual" ? (
            <ManuelUtilisateur onFermer={() => bridge.showView(previousWorkspace.current)} onNavigate={view=>bridge.showView(view)} />
          ) : (
            <NormsPage bridge={bridge} />
          ),
          document.getElementById("uxWorkspace"),
        )}
      {formulaTarget &&
        view === "minute" &&
        createPortal(
          <FormulaAssistant bridge={bridge} library={library} />,
          formulaTarget,
        )}
      <AssistantMetreIA bridge={bridge} ouvert={assistantOpen} onOuvrir={()=>{setWorkflowOpen(false);setAssistantOpen(true);}} onFermer={closeAssistant}/>
      <ExerciseWorkflow bridge={bridge} open={workflowOpen} onClose={()=>setWorkflowOpen(false)} onNavigate={target=>{if(target==='assistant')setAssistantOpen(true);else{setAssistantOpen(false);bridge.showView(target);}}}/>
      <RowCctpWorkspace bridge={bridge}/>
      <QualityControl bridge={bridge}/>
      <PremiumMetre bridge={bridge}/><LexiqueSurlignageBTP/><PlanVision bridge={bridge}/><ManuelUtilisationModal isOpen={manualOpen} onClose={()=>setManualOpen(false)} onNavigate={bridge.showView}/>{localProjectsOpen&&<LocalProjects bridge={bridge} onClose={()=>setLocalProjectsOpen(false)}/>}
      {importModal&&<Modal wide title="Importer un relevé" subtitle="AutoCAD, Revit, IFC ou tableau : conservez le contrôle de chaque quantité." onClose={()=>setImportModal(false)}>
        <ImportWizard bridge={{...bridge,showView:v=>{setImportModal(false);bridge.showView(v);}}} catalogue={catalogue}/>
      </Modal>}
      {settingsDrawer&&<SettingsDrawer bridge={bridge} {...settingsDrawer} onClose={()=>setSettingsDrawer(null)}/>}
      {shortcuts && (
        <Modal
          title="Les bons réflexes, au clavier"
          subtitle="Ta fiche mémo pour travailler sans interrompre le geste."
          onClose={() => setShortcuts(false)}
        >
          <div className="shortcut-list">
            {keys.map(([key, action]) => (
              <div key={key}>
                <span>{action}</span>
                <kbd>{key}</kbd>
              </div>
            ))}
          </div>
          <p className="ux-notice">
            Les lettres L, S et C agissent sur le plan lorsque tu ne saisis pas
            de texte. Dans un champ texte classique, Ctrl Z conserve son
            comportement de saisie.
          </p>
        </Modal>
      )}
    </>
  );
}
export function mountAtelier(bridge) {
  const host = document.createElement("div");
  host.id = "atelierUX";
  document.body.prepend(host);
  document.body.classList.add("atelier-modern");
  const root = createRoot(host);
  root.render(<App bridge={bridge} />);
  return {
    destroy() {
      root.unmount();
      host.remove();
    },
  };
}
