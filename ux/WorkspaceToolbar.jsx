import React, {useEffect, useState} from 'react';
import {Layers3, MoveHorizontal, ScanLine, Boxes} from 'lucide-react';
import {lotColor} from '../public/lot-colors.js';

// Presentation only: reuse the existing minute filter and calculated row results.
export default function WorkspaceToolbar({bridge,view}) {
  const [rows,setRows]=useState(()=>bridge.get().rows);
  const [selected,setSelected]=useState('');
  useEffect(()=>{
    const sync=()=>setRows([...bridge.get().rows]);
    const filter=e=>{if(e.target.id==='minuteLot')setSelected(e.target.value==='Tous les lots'?'':e.target.value);};
    document.addEventListener('atelier:meta',sync);document.addEventListener('change',filter);
    return()=>{document.removeEventListener('atelier:meta',sync);document.removeEventListener('change',filter);};
  },[bridge]);
  const lots=[...new Set(rows.map(r=>r.lot).filter(Boolean))];
  const active=lots.includes(selected)?selected:'';
  useEffect(()=>{
    if(view!=='minute')return;
    const control=document.getElementById('minuteLot');
    const next=active||'Tous les lots';
    if(control&&control.value!==next){control.value=next;control.dispatchEvent(new Event('change',{bubbles:true}));}
  },[active,view,rows]);
  const visible=active?rows.filter(r=>r.lot===active):rows;
  const sum=unit=>visible.reduce((n,r)=>{const u=r.result?.unit,f=unit==='m'?({mm:.001,cm:.01,m:1,ml:1}[u]):u===unit?1:undefined;return n+(f===undefined?0:(Number(r.result.total)||0)*f);},0);
  const number=n=>n.toLocaleString('fr-FR',{maximumFractionDigits:3});
  const choose=lot=>{setSelected(lot);if(view!=='minute')bridge.showView('minute');};
  return <div className="workspace-toolbar">
    <nav className="quick-lots" aria-label="Filtres rapides par lot TCE">
      <span className="toolbar-label"><Layers3 size={16}/>Lots TCE</span>
      <button className={!active?'selected':''} aria-pressed={!active} onClick={()=>choose('')}>Tous les lots <span>{rows.length}</span></button>
      {lots.map(lot=><button key={lot} className={active===lot?'selected':''} style={{'--chip-color':lotColor(lot).color}} aria-pressed={active===lot} onClick={()=>choose(lot)}><i/>{lot}<span>{rows.filter(r=>r.lot===lot).length}</span></button>)}
      {!lots.length&&<span className="toolbar-empty">Les lots apparaîtront avec vos premiers ouvrages</span>}
    </nav>
    <div className="toolbar-totals" aria-label="Quantités du lot sélectionné" aria-live="polite" aria-atomic="true">
      {[[MoveHorizontal,'Longueurs','m',sum('m')],[ScanLine,'Surfaces','m²',sum('m²')],[Boxes,'Volumes','m³',sum('m³')]].map(([Icon,label,unit,total])=><div key={unit} title={label+' · '+(active||'tous les lots')}><Icon size={16}/><span>{label}</span><strong key={active+total}>{number(total)} <small>{unit}</small></strong></div>)}
    </div>
  </div>;
}
