export function openQualityControl(){document.dispatchEvent(new CustomEvent('atelier:quality-control',{detail:{}}));}
export function beforeQualityExport(action,label){document.dispatchEvent(new CustomEvent('atelier:quality-control',{detail:{action,label}}));}
