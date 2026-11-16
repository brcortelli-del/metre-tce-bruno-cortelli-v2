"""Inventaire traçable des mentions normatives/réglementaires des trois livres.

Les candidats OCR sont conservés, jamais présentés comme une liste de normes
certifiées. Le JSON métier et les lignes de contexte se contrôlent séparément.
"""
import argparse, hashlib, json, re
from pathlib import Path
import fitz

parser=argparse.ArgumentParser()
for name in ['l1','l2','l3']:parser.add_argument('--'+name,required=True)
parser.add_argument('--output',required=True)
args=parser.parse_args()
pattern=re.compile(r'\b(?:NF\s*(?:EN|P|A|T|DTU)|XP\s*[- ]?[A-Z]?\s*\d|FD\s*P|DTU\s*[- ]?\d|CCTG|BAEL|BPEL|Eurocodes?|NV\s*65|RT\s*20(?:00|05|12)|DIN\s*\d|ISO\s*\d|EN\s*\d{3,}|décret|arrêté|loi\s+(?:sur|du)|Code\s+(?:des\s+marchés|du\s+travail|civil|de\s+la\s+construction|de\s+l.environnement))',re.I)
mentions=[]; sources=[]
for book in ['L1','L2','L3']:
    path=Path(getattr(args,book.lower()));raw=path.read_bytes();pdf=fitz.open(stream=raw,filetype='pdf')
    sources.append({'livre':book,'nom':path.name,'sha256':hashlib.sha256(raw).hexdigest(),'pages_pdf':len(pdf)})
    for index,page in enumerate(pdf):
        lines=page.get_text().splitlines();printed=index-1
        scope='generalites_et_materiaux' if book=='L1' and printed<105 else 'lot01' if (book=='L1' and printed<=140 or book=='L3' and printed<=92) else 'lot02' if book=='L1' or (book=='L2' and printed<=126) else 'autres_lots_auditer_ensuite'
        for j,line in enumerate(lines):
            if not pattern.search(line):continue
            mentions.append({'livre':book,'page_pdf':index+1,'page_cours':printed if printed>0 else None,'perimetre':scope,'ligne_source':line.strip(),'contexte':' '.join(x.strip() for x in lines[max(0,j-1):min(len(lines),j+2)]),'statut':'candidat_repere_a_rapprocher_au_registre'})
out={'date_audit':'2026-11-13','methode':'Détection de mentions et contexte sur toutes les pages PDF ; contrôle manuel et registre distinct nécessaires, notamment pour variantes OCR, millésimes et arrêtés sans numéro.','sources':sources,'mentions':mentions}
Path(args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'pages':sum(x['pages_pdf'] for x in sources),'mentions':len(mentions),'sortie':args.output}))
