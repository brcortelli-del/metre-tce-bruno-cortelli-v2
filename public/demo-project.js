import { upgradeProject } from './business.js';

// Données fictives : dimensions et prix pédagogiques, jamais un dimensionnement.
export function createDemoProject() {
  const make=(id,code,label,lot,preset,dimensions,extra={})=>({id,rowNumber:id.slice(-2),code,label,lot,location:'Garage de démonstration · RDC',building:'Garage',level:'RDC',room:'Local technique',report:'Plan démo',pricingMode:'study',costs:{hours:.5,materials:20,equipment:1,requireComplete:true,materialsSource:'manual'},input:{preset,dimensionUnit:'m',outputUnit:preset==='mur'?'m²':'m³',basis:'axes',count:'1',deduction:'0',openings:[],dimensions,...extra}});
  const openings=[{w:'2.40',h:'2.00',n:'1'},{w:'0.90',h:'2.15',n:'1'},{w:'1.20',h:'1.00',n:'1'}];
  const rows=[
    make('demo-01','T01','Fouilles en rigole — hypothèse pédagogique','Terrassement','fouille',{L:'19.2',w:'0.5',h:'0.8'}),
    make('demo-02','BP01','Béton de propreté — hypothèse pédagogique','Fondations','semelle',{L:'19.2',w:'0.5',h:'0.05'}),
    make('demo-03','SF01','Semelles filantes — hypothèse pédagogique','Fondations','semelle',{L:'19.2',w:'0.5',h:'0.3'}),
    make('demo-04','GO-V02','Murs en blocs béton ép. 20 cm','Gros œuvre','mur',{L:'19.2',h:'HSP'},{measurementProfile:'masonry',openings}),
    make('demo-05','DL01','Dallage intérieur — hypothèse pédagogique','Gros œuvre','dalle',{L:'5.6',w:'3.6',h:'0.12'}),
    make('demo-06','P01','Peinture intérieure — une face, sans tableaux','Peinture','mur',{L:'18.4',h:'HSP'},{measurementProfile:'paint',openings}),
  ];
  rows[3].assemblyId='demo-blocs';
  return upgradeProject({version:1,title:'DÉMONSTRATION — Garage 6 × 4 m',country:'france',rows,
    variables:[{name:'HSP',value:'2.50',unit:'m'}],
    settings:{hourlyRate:42,k:1.3,vat:20},
    assemblies:[{id:'demo-blocs',name:'Blocs béton — ratios de démonstration à adapter',unit:'m²',hours:.85,equipment:1.5,components:[
      {id:'demo-bloc',name:'Blocs 20 × 20 × 50',unit:'u',ratio:10,waste:5,unitCost:2.4,supplier:'Fournisseur fictif',packSize:50,packLabel:'palette de 50'},
      {id:'demo-mortier',name:'Mortier de montage',unit:'m³',ratio:.015,waste:5,unitCost:90,supplier:'Fournisseur fictif',packSize:.1,packLabel:'lot de 0,1 m³'},
    ]}],
    planWorkspace:{assetId:'demo-garage-plan',fileName:'Garage-pedagogique.png',size:0,page:1,params:{},pages:{'1':{scale:0,reference:0,calibration:[],traces:[]}}},
  });
}
