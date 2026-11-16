// Le mode démo ne lit ni ne remplace les données persistantes de l'utilisateur.
export function isDemoUrl(href) {
  try { return new URL(href).searchParams.get('demo') === 'true'; } catch { return false; }
}
export const DEMO_MODE = typeof location !== 'undefined' && isDemoUrl(location.href);
const preferences = new Map();
export const preferenceStore = {
  getItem(key) { return DEMO_MODE ? preferences.get(key) ?? null : localStorage.getItem(key); },
  setItem(key, value) { if (DEMO_MODE) preferences.set(key, String(value)); else localStorage.setItem(key, value); },
};
export function createDemoStore(initial, {onStatus = () => {}} = {}) {
  let snapshot = structuredClone(initial);
  const assets = new Map();
  return {
    load: async () => structuredClone(snapshot),
    schedule(project) { snapshot = structuredClone(project); onStatus({pending:false,failed:false,demo:true}); },
    flush: async () => {}, hasPending: () => false,
    parse: async text => JSON.parse(text),
    encode: async project => new Blob([JSON.stringify(project)], {type:'application/json'}),
    putAsset: async (key, blob) => { assets.set(key, blob); },
    getAsset: async key => assets.get(key) ?? null,
    dispose: async () => { assets.clear(); },
  };
}
export function createDemoCloud(bridge) {
  const state = () => ({online:false,role:'owner',canCreate:true,projects:[],status:'Démonstration · mémoire temporaire · aucune synchronisation',error:'',conflict:false,user:null,saving:false});
  const notify = () => bridge.onStatus?.(state());
  const unavailable = async () => { throw new Error('Cette action en ligne est désactivée en démonstration.'); };
  const ready = Promise.resolve().then(notify);
  return {ready,state,connect:async()=>notify(),changed:()=>notify(),flush:async()=>{},
    create:async()=>{bridge.replace(bridge.empty());notify();},load:unavailable,
    revisions:async()=>bridge.get().revisions||[],saveRevision:async label=>bridge.localRevision(label),
    restoreRevision:async id=>bridge.restoreLocal(id),approve:unavailable,
    saveAsset:async()=>null,loadAsset:unavailable,members:async()=>[],saveMember:unavailable,removeMember:unavailable};
}
