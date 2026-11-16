import React, {useEffect,useRef} from 'react';
import {Modal} from './components.jsx';

// Display the existing settings UI in a drawer, keeping its own event handlers
// and transaction code. Restore its original DOM position on close.
export default function SettingsDrawer({bridge,target,returnView,onClose}) {
  const host=useRef(null);
  useEffect(()=>{
    const workspace=document.getElementById('proWorkspace');
    if(!workspace||!host.current)return;
    const marker=document.createComment('settings-workspace-position');
    workspace.before(marker);
    bridge.showView(target);
    host.current.append(workspace);
    return()=>{marker.replaceWith(workspace);bridge.showView(returnView);};
  },[bridge,target,returnView]);
  return <Modal drawer title={target==='variables'?'Variables du projet':'Paramètres du projet'} subtitle="Vos réglages, accessibles sans quitter l’atelier." onClose={onClose}><div className="settings-drawer-content" ref={host}/></Modal>;
}
