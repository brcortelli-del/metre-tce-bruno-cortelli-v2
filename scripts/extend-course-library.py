"""Extension documentée IB2701 : lots 02 à 05.
Les numéros de lots sont une organisation de l'application ; les codes imprimés
et les pages du cours sont conservés séparément. Aucune actualisation normative.
"""
import json,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TARGET=ROOT/'public/data'
DATA=json.loads((TARGET/'cctp-library.json').read_text())
PROOFS=json.loads((TARGET/'cctp-sources.json').read_text())
DATA['lots']=[l for l in DATA['lots'] if l['numero_lot'] not in ['02','03','04','05']]
PREFIXES=('GO-','FAC-','FUM-','VEN-')
PROOFS['ouvrages']=[o for o in PROOFS['ouvrages'] if not o['code'].startswith(PREFIXES)]
PROOFS.setdefault('formules_calcul',[])
PROOFS['formules_calcul']=[f for f in PROOFS['formules_calcul'] if not f['id'].startswith(('GO_','FAC_','FUM_','VEN_'))]
DATA['formules_calcul']=[f for f in DATA['formules_calcul'] if not f['id'].startswith(('GO_','FAC_','FUM_','VEN_'))]
PROOFS['points_de_vigilance']=[p for p in PROOFS['points_de_vigilance'] if not p['id'].startswith('SUITE_')]
LOTS={}
def lot(n,name):
    value={'numero_lot':n,'nom_lot':name,'ouvrages':[]};LOTS[n]=value;DATA['lots'].append(value)
lot('02','Gros Œuvre — Fondations et structures')
lot('03','Façades et finitions extérieures')
lot('04','Conduits de fumée — Fumisterie')
lot('05','Ventilation')
def refs(spec):
    result=[]
    for part in spec.split(';'):
        b,pages=part.strip().split(':')
        for item in pages.split(','):
            a,_,z=item.partition('-')
            for p in range(int(a),int(z or a)+1):result.append({'livre':b,'page_cours':p,'page_pdf':p+2})
    return result
def work(n,code,group,title,unit,formula,rule,desc,execution,pages,norms=(),kind='trame_et_technologie',original='',ratios=(),loc='{{localisation}}',note=''):
    o={'code':code,'designation_courte':title,'unite':unit,'formule_defaut':formula,
       'regle_metre':{'vides_pour_pleins':rule,'taux_perte_pourcent':None,'ratios_associes':list(ratios)},
       'clause_cctp':{'titre_article':title,'normes_dtu':list(norms),'description_technique':desc,
                      'mise_en_oeuvre':execution,'localisation_type':loc}}
    LOTS[n]['ouvrages'].append(o)
    p={'code':code,'sous_lot':group,'references':refs(pages),'nature_clause':kind,
       'statut_unite':'unite_indicative_de_calcul_a_confirmer_au_bordereau' if unit else 'non_precisee_par_le_cours',
       'taux_perte':'Aucun taux propre à cet ouvrage établi dans ces pages ; null ne signifie pas 0 %.',
       'points_a_completer':sorted(set(re.findall(r'\{\{([^}]+)\}\}',json.dumps(o,ensure_ascii=False))))}
    if original:p['article_original']=original
    if note:p['emploi']=note
    PROOFS['ouvrages'].append(p)
    return o
def form(id,name,n,variables,expression,unit,description,pages,nature='transcription_geometrique_des_regles_de_metre'):
    DATA['formules_calcul'].append({'id':id,'nom':name,'lot':LOTS[n]['nom_lot'],'variables':variables,'expression_js':expression,'unite_resultat':unit,'description':description})
    PROOFS['formules_calcul'].append({'id':id,'references':refs(pages),'nature':nature,'conditions':description})
def warn(id,text,pages):PROOFS['points_de_vigilance'].append({'id':'SUITE_'+id,'constat':text,'references':refs(pages)})
AREA='Surface réelle, tous vides déduits selon L1 p. 31 ; aucun seuil de 0,50 m² ni taux de perte général n’est fixé. Décrire séparément retours et tableaux lorsqu’ils constituent des prestations distinctes.'
VOL='Volume géométrique net de béton ou de maçonnerie effectivement réalisé ; déduire les vides et éviter le double comptage des intersections. Dimensions et repères HO/DO à expliciter.'
LINE='Longueur réellement exécutée, mesurée suivant le tracé développé et les repères du plan ; ne pas compter deux fois les angles ou les jonctions.'
COUNT='Comptage des éléments effectivement prévus au plan, par type et localisation ; accessoires à distinguer si le bordereau le demande.'
GENERAL='Article de prescriptions générales ; le cours ne donne pas de quantité ni d’unité de paiement pour cette disposition.'
BA=['NF EN 206-1','NF P 18-201 — DTU 21']
FOUND=['DTU 13.11','DTU 13.12']
DEEP=['NF P 11-212 — DTU 13.2']
MASON=['P 10-202 — DTU 20.1']
WALL=['NF P 18-210 — DTU 23.1']
# FONDATIONS : toutes les familles de la liste des p. 165-166 et technologies p. 146-164.
work('02','GO-F01','Fondations — Généralités','Hypothèses géotechniques et système de fondations',None,None,GENERAL,
 'Fondations destinées à reprendre les charges et surcharges pour les transmettre au sol d’assise. Nature du sol : {{sol}} ; niveau d’assise : {{niveau_assise}} ; système retenu : {{systeme_fondations}}.',
 'Reporter les résultats des sondages et essais, les hypothèses de calcul, les niveaux de référence et la cote hors gel du dossier. Préciser les joints de rupture, les qualités des bétons, mortiers, armatures et coffrages. Ne pas reprendre une contrainte de sol d’un exemple sans confirmation du rapport géotechnique.',
 'L1:143-145,165,167',FOUND)
for i,(title,desc) in enumerate([
 ('Blindage préparatoire des fondations','Protection des parois de fouille suivant le terrain et le procédé retenu.'),
 ('Assèchement du fond de fouille','Assainissement des fonds avant bétonnage ; aucun coulage sur fond gelé ou non assaini.'),
 ('Cylindrage du sol de fondation','Compactage superficiel par rouleau lisse ou à pieds de mouton.'),
 ('Compactage du sol au pilon','Compactage superficiel par pilonnage.'),
 ('Stabilisation du sol par ajout de liant','Amélioration de la cohésion superficielle par ajout de liant puis pilonnage ; dosage à déterminer avec le laboratoire.'),
 ('Compactage en profondeur par pieux courts','Enfoncement de pieux courts de petit diamètre, éventuellement remplacés par du sable ou des graviers.'),
 ('Enceinte de palplanches','Écran de palplanches métalliques protégeant la fouille contre les mouvements du sol.'),
 ('Silicatisation du sol','Solidification du sol par injection de silicate de soude et de solution saline.'),
 ('Cimentation du sol','Injection sous pression d’un coulis de ciment dans un sol graveleux.'),
 ('Paroi moulée de fondation','Tranchée profonde maintenue par une boue bentonitique, ensuite remplacée par le béton ; fonctions de fondation et de mur.')],2):
 work('02',f'GO-F{i:02}','Fondations — Travaux préparatoires',title,'m2' if i in [4,5,6] else None,'S' if i in [4,5,6] else None,AREA if i in [4,5,6] else GENERAL,desc,
 'Choisir le procédé avec le laboratoire d’étude de sol. Définir {{dimensions}}, {{niveaux}}, {{materiaux}} et {{conditions_execution}} ; affecter ces travaux au terrassement ou aux fondations sans doublon.', 'L1:146,165',FOUND)
work('02','GO-F12','Fondations superficielles','Forme de propreté sous fondations','m3','L * l * ep',VOL,
 'Couche de béton maigre sous les armatures ; béton, largeur et épaisseur suivant {{plans_fondations}}.',
 'Préparer et damer le fond, enlever points durs et lentilles molles. Couler peu après l’achèvement de la fouille. Le cours indique une épaisseur minimale de 4 cm ; préciser le dosage et le procédé retenus au projet.',
 'L1:152-153,165,170',FOUND)
for i,(title,desc,exe) in enumerate([
 ('Semelle filante en béton non armé','Semelle continue sous mur, en béton non armé, de section {{section_semelle}}.', 'Préciser niveaux, nature du béton et coulage à pleine fouille ou entre coffrages ; prévoir réservations et traitement du fond.'),
 ('Semelle filante en béton armé','Semelle continue en béton armé de section {{section_semelle}}.', 'Armatures principales transversales en partie inférieure, aciers de répartition longitudinaux, attentes des éléments verticaux ; ferraillage selon étude BA, vibrage et enrobage suivant le dossier.'),
 ('Semelle isolée en béton armé','Semelle sous charge concentrée, de forme {{forme_semelle}} et dimensions {{dimensions_semelle}}.', 'Coffrage des joues, forme de propreté, quadrillage d’armatures dans les deux directions et attentes du poteau ; bétonnage et vibrage selon étude BA.'),
 ('Semelle excentrée et longrine de redressement','Fondation sous charge excentrée, notamment en limite de propriété.', 'Prévoir une longrine de redressement reprenant les effets de rotation ; liaison des armatures avec le poteau suivant étude BA.'),
 ('Longrine de liaison','Longrine en béton armé assurant la liaison entre appuis de fondation.', 'Préciser section, niveaux, béton, coffrage des joues, vibrage, armatures de liaison aux têtes de pieux ou puits et attentes des porteurs verticaux.'),
 ('Tirant de fondation','Élément en béton armé mentionné dans la trame de fondations.', 'Définir béton, armatures, coffrages, niveaux et liaisons suivant {{etude_ba}}.'),
 ('Button de fondation','Button mentionné dans la liste des ouvrages de fondation.', 'Définir nature, composition et dosage du béton, coffrage, niveaux et vibrage ; dimensions et liaisons suivant {{etude_ba}}.'),
 ('Radier plan épais','Fondation générale en béton armé de type radier plan épais.', 'Prévoir forme de propreté, armatures, coffrage des joues et réservations ; dimensionnement suivant étude particulière.'),
 ('Radier plan nervuré','Radier en béton armé comportant nervures et poutres transversales.', 'Décrire dalle, nervures, coffrage, ferraillage et réservations sans compter deux fois leur intersection.'),
 ('Radier voûté ou plancher champignon renversé','Solution de radier voûté avec tirants ou plancher champignon renversé citée dans le cours.', 'Étude particulière nécessaire ; définir géométrie, coffrage et armatures. Le cours n’en fournit pas une clause d’exécution détaillée.'),
 ('Cuvelage sur radier','Radier étanche, éventuellement complété par un contre-voile en béton armé.', 'Distinguer structure, préparation du support, revêtement intérieur d’imperméabilisation et revêtement extérieur d’étanchéité ; définir les précautions du système retenu.'),
 ('Fondation de mur de clôture','Fondation diverse de mur de clôture.', 'Décrire section, niveaux, béton, armatures et coffrages ; affecter une seule fois aux fondations ou à l’aménagement des abords.')],13):
 work('02',f'GO-F{i:02}','Fondations superficielles',title,'m3',None if i in [21,22,23] else 'L * l * H',VOL,desc,exe,'L1:147-155,165-166',FOUND)
for i,(title,desc,exe) in enumerate([
 ('Muret de fondation en béton','Muret en béton au-dessus des semelles, encadrant un vide sanitaire ou un terre-plein.', 'Préciser épaisseur, hauteur, coffrage, dosage, armatures, attentes, vibrage, réservations de réseaux et ventilation, finition de l’arase.'),
 ('Muret de fondation en BBM','Muret en blocs de béton manufacturés de type {{type_blocs}}, module {{module_blocs}}.', 'Définir dosage du mortier, joints, chaînages en blocs spéciaux, passages de canalisations et arase dressée.'),
 ('Muret de fondation en pierre','Muret en pierres, moellons ou meulières de nature {{pierre}}.', 'Définir épaisseur, appareillage, faces alignées, mortier, parement, rejointoiement, réservations et arase.')],25):
 work('02',f'GO-F{i:02}','Fondations — Murets',title,'m2','L * H - S_vides',AREA,desc,exe,'L1:155,166,171',MASON if i>25 else BA)
deep=[
 ('Pieu battu préfabriqué','Pieu préfabriqué en béton armé, précontraint ou non, monobloc ou par tronçons clavetés.','Enfoncement par chocs ou vibrations ; sabot en pied. Le cours cite armatures longitudinales de 12 mm mini, transversales de 5 mm mini espacées de 20 cm maxi, enrobage 3 cm et béton dosé de 350 à 400 kg/m3. Ces caractéristiques doivent être confrontées au dossier.',157),
 ('Pieu métallique battu','Profilé H, tube ou assemblage soudé de palplanches.','Éléments soudés bout à bout ; sabot selon dureté du sol ; mise en œuvre par battage ou vibration.',157),
 ('Pieu tubulaire précontraint','Éléments tubulaires en béton assemblés par précontrainte avant battage.','Le cours cite des éléments de 1,5 à 3 m, diamètre 0,70 à 0,90 m et résistance au moins égale à 45 MPa à 28 jours ; choix suivant étude.',158),
 ('Pieu battu enrobé','Âme métallique en tube, profilé H ou élément composite, avec enrobage de mortier.','Battage avec sabot ; injection du mortier au tube plongeur.',158),
 ('Pieu battu ou vibrofoncé injecté haute pression','Variante du pieu battu enrobé.','Mortier injecté sous pression ; procédé et paramètres selon dossier géotechnique.',158),
 ('Pieu battu pilonné','Tube à bouchon de béton ferme enfoncé par battage sur le bouchon.','Introduire le béton ferme par petites quantités successivement pilonnées pendant l’extraction du tube ; armé ou non suivant besoins ; enrobage cité 4 cm.',158),
 ('Pieu battu moulé','Tube muni d’une pointe métallique ou en béton et rempli de béton avant extraction.','Béton d’ouvrabilité moyenne, affaissement cité de 10 à 16 cm, dosage 350 kg/m3 ; armé ou non ; enrobage cité 4 cm.',159),
 ('Pieu foré simple','Forage mécanique dans un sol cohérent au-dessus de la nappe.','Bonne tenue des parois, bétonnage immédiatement après forage ; diamètre de l’outil suivant étude. Le cours cite un dosage minimal de 350 kg/m3, affaissement 10 à 16 cm et quatre attentes de 2 m de longueur, diamètre minimal 12 mm.',159),
 ('Pieu foré tubé','Forage protégé par un tube dans un terrain moins stable.','Base du tube au-dessous du fond du forage ; fonçage préalable ou à l’avancement ; procédé permettant la traversée d’une nappe.',160),
 ('Pieu foré à la boue','Forage maintenu par boue bentonitique.','Bétonnage au tube plongeur depuis le fond, avec enlèvement simultané de la boue ; armé ou non ; enrobage cité 7 cm.',160),
 ('Pieu à tarière creuse','Pieu réalisé par tarière à axe creux, dans un sol sans points durs.','Extraction sans dévissage avec injection simultanée du béton par l’axe creux ; longueur d’outil adaptée au pieu.',160),
 ('Pieu vissé moulé','Outil à double vis et colonne cannelée, percé dans son axe et muni d’un bouchon.','Pénétration par rotation, extraction en sens inverse et remplissage continu par béton sous l’effet de la gravité.',161),
 ('Pieu foré injecté haute pression','Pieu foré de diamètre au moins égal à 250 mm dans la technologie décrite.','Forage équipé d’armatures et d’un ou plusieurs tubes à manchettes pour injection.',161),
 ('Pieu en béton foncé','Éléments cylindriques en béton armé préfabriqués ou coffrés à l’avancement.','Fonçage par vérin sous massif de réaction ; éléments cités de 0,50 à 2,50 m et diamètre 30 à 60 cm.',162),
 ('Pieu métallique foncé','Éléments métalliques soudés bout à bout au fur et à mesure de l’enfoncement.','Longueurs citées de 0,50 à 2,50 m ; profilés choisis pour résister à la déformation au fonçage.',162),
 ('Micropieu de type I','Pieu foré tubé de diamètre inférieur à 250 mm dans la définition du cours.','Remplissage par mortier de ciment au tube plongeur.',163),
 ('Micropieu de type II','Pieu foré de diamètre inférieur à 250 mm, équipé d’une armature.','Remplissage par coulis ou mortier de scellement, par gravité ou tube plongeur.',163),
 ('Micropieu de type III','Type de micropieu cité sans détail constructif complémentaire.','Le corpus signale seulement des particularités complémentaires ; compléter à partir du dossier, sans prescription inventée.',163),
 ('Micropieu de type IV','Type de micropieu cité sans détail constructif complémentaire.','Le corpus signale seulement des particularités complémentaires ; compléter à partir du dossier, sans prescription inventée.',163)]
for i,(title,desc,exe,p) in enumerate(deep,1):
 work('02',f'GO-P{i:02}','Fondations profondes',title,'ml','L',LINE,desc,exe+ ' Diamètre, section, niveaux, tête et procédé suivant {{rapport_sol}} et {{etude_fondations}}.',f'L1:{p},166',DEEP,kind='technologie_sans_clause_cctp' if i>=18 else 'trame_et_technologie')
work('02','GO-P20','Fondations profondes','Puits de fondation','m3','A * H',VOL,
 'Fondation creusée à la main sous protection d’un blindage ; section {{section_puits}} et niveaux {{niveaux_puits}}.',
 'Le cours décrit un bétonnage à sec et un blindage récupéré ou perdu. Il donne 1,20 m de diamètre pour un puits circulaire ou 0,80 m de largeur et 1,10 m2 de section minimale pour les autres formes ; il exclut le creusement sous nappe en sol peu cohérent sans rabattement extérieur. Préciser béton, dé en tête et liaisons. Les indications de sécurité sont celles du document pédagogique ancien.',
 'L1:156,162,166,172',DEEP)
for i,title in enumerate(['Recépage de tête de pieu','Dé ou semelle de liaison en tête de pieu','Armatures en attente des têtes de pieux'],21):
 work('02',f'GO-P{i}','Fondations profondes',title,'U' if i<23 else 'kg','N' if i<23 else 'masse_acier',COUNT if i<23 else 'Masse des armatures suivant nomenclature ; aucune consommation universelle par pieu.',
 'Ouvrage assurant la liaison du pieu avec la structure porteuse.', 'Recéper la partie supérieure souillée avant réalisation du dé ; définir géométrie, béton et armatures selon étude BA. Les attentes sont destinées à l’ouvrage à venir.', 'L1:156,161,166',DEEP)
for i,(title,desc) in enumerate([
 ('Mur poids en béton ou maçonnerie','Soutènement par le poids propre, en béton ou moellons ; hauteur usuelle citée jusqu’à 4 m.'),
 ('Mur de soutènement cantilever en béton armé','Mur en béton armé ; contreforts éventuellement prévus pour les grandes hauteurs citées de 6 à 8 m.'),
 ('Mur en terre armée','Solution figurant dans le schéma du cours ; aucune clause constructive détaillée n’y est donnée.'),
 ('Mur en béton ancré','Solution figurant dans le schéma du cours ; aucune clause constructive détaillée n’y est donnée.')],1):
 work('02',f'GO-S{i:02}','Soutènements',title,None,None,GENERAL,desc,'Définir {{geometrie}}, {{materiaux}}, {{fondations}} et {{drainage}} suivant étude particulière ; ne pas déduire un dimensionnement du seul schéma.','L1:164',kind='technologie_sans_clause_cctp' if i>=3 else 'trame_et_technologie')
# INFRASTRUCTURE : liste des p. 30-32, détails p. 8-29.
walls=[
 ('Mur périmétrique enterré en béton','Mur en béton armé, béton banché peu armé par treillis soudé ou non armé, de hauteur {{H}} et d’épaisseur {{ep}}.','Définir qualité du coffrage et du parement, tolérances, vibrage, chape refluée en tête si arase étanche et toutes réservations.',BA+WALL),
 ('Mur périmétrique enterré en BBM','Maçonnerie de blocs pleins ou semi-creux, module {{module_blocs}}, épaisseur {{ep}}.','Définir mortier, dosage, épaisseur et façon des joints, feuillures, réservations et raidisseurs. La nature pleine ou creuse dépend de l’exposition à l’eau et du drainage.',MASON),
 ('Mur enterré en briques pleines ou perforées','Maçonnerie de briques pleines ou perforées, module {{module_briques}}, épaisseur {{ep}}.','Définir mortier, joints, feuillures, réservations et chaînages ; étudier charges verticales et poussées des terres.',MASON),
 ('Mur enterré en pierres ou moellons','Maçonnerie d’éléments naturels : {{nature_pierres}}.','Définir épaisseur, hauteur, appareillage, une ou deux faces alignées, mortier, parements, feuillures et réservations.',MASON),
 ('Mur de refend en infrastructure','Paroi intérieure porteuse de soubassement, distincte des murs périmétriques si sa constitution diffère.','Décrire matériau, dimensions, mortier ou béton, raidisseurs, réservations et protections adaptées à sa fonction.',MASON),
 ('Mur d’échiffre en infrastructure','Mur encadrant une cage d’escalier.','Décrire comme les autres parois verticales et préciser sa liaison avec l’escalier et les porteurs.',MASON),
 ('Cour anglaise','Ouvrage permettant l’accès de la lumière à un niveau enterré.','Définir géométrie, matériau, réservations et interfaces avec le mur enterré ; le cours ne fournit pas de détail complet.',[])]
for i,(title,desc,exe,norms) in enumerate(walls,1):
 work('02',f'GO-I{i:02}','Infrastructure — Parois verticales',title,'U' if i==7 else 'm2','N' if i==7 else 'L * H - S_vides',COUNT if i==7 else AREA,desc,exe,'L2:8-12,30-31',norms,kind='technologie_sans_clause_cctp' if i==7 else 'trame_et_technologie')
humidity=[
 ('Fossé drainant','Fossé de drainage à laisser ouvert ou à équiper d’un drain et à remblayer.','Définir fond, niveau, destination des terres et finition.','ml','L'),
 ('Drainage périmétrique accolé aux fondations','Drainage au pied des murs, collecteur et évacuation des eaux.','Définir fond de drainage, cailloux, gravillon, sable, terre végétale et destination des excédents. Le drain PVC de diamètre 100 mm mini et pente 5 mm/m appartient au schéma du cours ; le tracé est à étudier selon terrain.','ml','L'),
 ('Drainage éloigné des fondations','Tranchée drainante éloignée du bâtiment.','Préciser implantation et niveau suivant les couches de terrain et les écoulements ; collecte et évacuation à coordonner avec l’assainissement.','ml','L'),
 ('Géotextile filtrant de drainage','Non-tissé synthétique imputrescible enveloppant totalement ou partiellement le remplissage en cailloux.','Le cours cite un grammage d’au moins 200 g/m2 ; préciser développé, enveloppement et recouvrements au projet.','m2','S'),
 ('Écran vertical par mortier hydrofuge','Revêtement extérieur des murs enterrés, par mortier hydrofuge ou d’imperméabilisation.','Préparer le support ; reboucher ou dresser les surfaces irrégulières, humidifier un support régulier et appliquer le système en couches. Définir épaisseur, dosage, niveau supérieur et finition.','m2','L * H - S_vides'),
 ('Écran vertical par enduit d’imprégnation à froid','Revêtement bitumineux d’imprégnation à froid, EIF.','Support lissé si nécessaire ; application en deux couches croisées ; raccords, limites hautes et protection contre les perforations à préciser.','m2','L * H - S_vides'),
 ('Protection drainante extérieure des parois enterrées','Feuille plastique préformée ou plaques drainantes protégeant l’écran vertical contre les chocs du remblai.','Préciser système, profilé d’arrêt, fixation, raccord avec semelle et drainage périphérique.','m2','L * H - S_vides'),
 ('Arase étanche en mortier hydrofuge','Coupure de capillarité dans l’épaisseur des murs périmétriques et de refend.','Préparer la tête du mur ou muret ; définir dosage et épaisseur du mortier, hydrofuge et niveau. Une chape refluée est décrite pour un mur en béton.','m2','L * l'),
 ('Arase étanche en feutre bitumé 40 TV','Feutre bitumé en tête de mur, entre couches de mortier sur maçonnerie ou sur chape refluée en béton.','Définir préparation, recouvrement des lés et enduit de protection contre les perforations.','m2','L * l'),
 ('Arase par prolongement du film sous dallage','Coupure de capillarité par continuité du film sous dalle et sur la tête de muret.','Solution du cours limitée au cas où le dallage constitue le plancher bas du RDC ; protéger le film par mortier et définir recouvrements.','m2','L * l')]
for i,(title,desc,exe,unit,formula) in enumerate(humidity,1):
 work('02',f'GO-E{i:02}','Infrastructure — Humidité et drainage',title,unit,formula,LINE if unit=='ml' else AREA,desc,exe,'L2:13-18,31',MASON)
floor=[
 ('Forme en terre battue','Forme constituée par nivellement et pilonnage du sol.','Définir niveaux finis et préparation ; ne pas assimiler le compactage à une fourniture de remblai.','m2','S'),
 ('Hérisson en pierres','Assise de dallage par pierres posées sur chant.','Matériaux sains, non plastiques, insensibles à l’eau, neutres chimiquement et sans matières organiques. Le cours cite une épaisseur de 20 cm ou plus et une couche de sable de 5 cm ; dimensions du projet à préciser.','m3','S * ep'),
 ('Blocage ou empierrement sous dallage','Assise par pierres bloquées les unes contre les autres.','Définir épaisseur et complément supérieur en sable ; compacter et damer sur toute l’emprise.','m3','S * ep'),
 ('Forme en tout-venant','Assise en tout-venant de granulométrie régulière.','Épandage et compactage en couches adaptées au matériel, au plus 20 cm dans le texte. Granularité 0/60 et sable 3 à 5 cm cités ; préciser le choix au projet.','m3','S * ep'),
 ('Forme en sablon','Assise de dallage en sablon.','Définir nature, épaisseur, couche supérieure et compactage.','m3','S * ep'),
 ('Forme en mâchefer','Assise de dallage en mâchefer, solution citée dans le cours.','Définir nature, épaisseur, conditions de compatibilité du matériau et compactage ; aucune actualisation de cette solution ancienne n’est revendiquée.','m3','S * ep'),
 ('Couche de réglage en sable','Interface sous dallage, couche de sable.','Le cours cite environ 5 cm ; régler les niveaux et préciser épaisseur réelle et compactage.','m3','S * ep'),
 ('Couche de fermeture en mortier maigre','Interface sous dallage en mortier maigre.','Le cours cite 3 cm ; préciser épaisseur et composition selon le projet.','m3','S * ep'),
 ('Film de coupure de capillarité sous dallage','Film plastique ou feutre armé bitumé sous dalle.','Définir nature, épaisseur et recouvrement ; le cours cite polyéthylène 150 à 200 microns et 20 cm de recouvrement. Attention : il déconseille également le film pour les parties 1 et 2 du DTU 13.3 à cause du tuilage ; ne pas généraliser la solution.','m2','S'),
 ('Isolation thermique sous l’ensemble du dallage','Isolant incompressible compatible avec les charges, sur support compacté.','Définir nature, épaisseur et performances. Le cours décrit une isolation sous toute la surface parmi les solutions évitant les tassements différentiels.','m2','S'),
 ('Isolation horizontale périphérique sous dallage','Variante d’isolation sous dallage en périphérie.','Le cours cite une bande d’environ 1,50 m et des panneaux 4 à 6 cm, puis signale un risque de tassement différentiel. Ne pas retenir sans choix explicite de conception.','m2','L * l'),
 ('Isolation verticale en bêche périphérique','Solution d’isolation thermique en bêche périphérique du dallage.','Définir matériau, épaisseur, hauteur et liaisons ; solution citée pour limiter les tassements différentiels.','m2','L * H'),
 ('Corps de dallage désolidarisé','Dalle en béton indépendante des éléments verticaux.','Préciser classe du béton, épaisseur, armatures, cales, coffrages des rives, vibrage, réservations, joints et finition. Le dallage ne sert pas d’assise à des éléments porteurs.','m3','S * ep'),
 ('Corps de dallage solidaire','Dalle en béton liée aux ouvrages de rive suivant le détail du projet.','Définir béton, armatures, attentes et fermeture des rives ; distinguer du dallage désolidarisé et suivre l’étude BA pour les renforts structurels.','m3','S * ep'),
 ('Armatures de dallage par treillis soudé','Nappe de treillis soudé posée sur cales.','Le cours cite 0,2 % de section pour l’exemple courant et un treillis de maille 150 mm à fil 7 mm pour dalle de 120 mm. Les valeurs varient suivant la partie du DTU citée ; ne pas remplacer l’étude structurelle.','kg','S * masse_surfacique'),
 ('Finition de dallage brute de règle','Dressage manuel ou mécanique à la règle.','Finition décrite pour revêtement scellé ou chape rapportée ; planéité citée sous règle de 2 m : 15 mm.','m2','S'),
 ('Finition de dallage surfacée','Talochage manuel ou mécanique du béton.','Planéités citées : 10 mm sous 2 m et 3 mm sous 0,20 m ; préciser le revêtement ultérieur.','m2','S'),
 ('Finition de dallage lissée','Lissage, le plus souvent mécanique.','Planéités citées : 7 mm sous 2 m et 2 mm sous 0,20 m ; préciser les interfaces avec revêtement collé ou couche isolante.','m2','S'),
 ('Chape incorporée','Mortier ou micro-mortier spécial appliqué en suivant la prise du béton.','Définir dosage, épaisseur, finition, joints et niveau d’arase ; distinguer de la chape rapportée après prise.','m2','S'),
 ('Chape rapportée','Mortier appliqué après prise du béton du dallage.','Support nettoyé, réglage à la règle, talochage et lissage ; définir dosage, épaisseur, finition, joints et niveau d’arase.','m2','S'),
 ('Couche d’usure par granulats naturels','Renforcement superficiel par quartz, silex, basalte ou porphyre.','Application en saupoudrage manuel ou mécanique ou en coulis suivant procédé ; choix des produits et dosage à préciser.','m2','S'),
 ('Couche d’usure par granulats abrasifs','Renforcement superficiel par corindon, carbure de silicium ou émeri.','Application suivant le procédé retenu ; définir produit, consommation et finition.','m2','S'),
 ('Couche d’usure par granulats métalliques','Renforcement superficiel par fer doux, fonte ou grenaille d’acier.','Définir produit, consommation, mode d’application et finition.','m2','S'),
 ('Joint de retrait du dallage','Joint permettant le libre retrait des panneaux de dallage.','Préciser tracé et type. Le cours limite les panneaux de la partie 2 à 50 m2 et cite 5 m +10 % exposés ou 6 m +10 % abrités pour le grand côté d’un dallage non armé.','ml','L'),
 ('Joint de dilatation du dallage','Joint traversant toute l’épaisseur pour autoriser la dilatation.','Ouverture à définir en fonction de la dilatation ; distinguer joint franc et joint goujonné et préciser le remplissage.','ml','L'),
 ('Joint d’isolement du dallage','Désolidarisation du dallage par rapport aux poteaux, murs, longrines ou massifs.','Joint sur toute l’épaisseur ; définir tracé et produit de séparation.','ml','L'),
 ('Fourreaux et canalisations incorporés au dallage','Incorporations et traversées coordonnées avec les corps d’état.','Le cours limite le diamètre incorporé à 1/5 de l’épaisseur, l’enrobage et l’écartement à une fois le diamètre avec minimum 5 cm ; sous dallage, distance à la sous-face au moins diamètre +5 cm. Les traversées verticales sont avec fourreaux.','ml','L')]
for i,(title,desc,exe,unit,formula) in enumerate(floor,1):
 work('02',f'GO-D{i:02}','Infrastructure — Ouvrages au sol',title,unit,formula,LINE if unit=='ml' else VOL if unit=='m3' else AREA,desc,exe,'L2:19-29,31-32',['NF P 11-213 — DTU 13.3']+BA)
# SUPERSTRUCTURE VERTICALE.
materials=[
 ('Mur en béton banché','Béton armé ou non, de type {{beton}}, épaisseur {{ep}} et hauteur {{H}}.','Définir banches, armatures, réservations par mannequins, gaines et fourreaux, vibrage et finition. Nettoyer et huiler les banches, régler et caler, bétonner par couches continues, puis nettoyer après décoffrage et ragréer si demandé.',BA+WALL),
 ('Mur en BBM creux','Blocs de béton manufacturés creux de module {{module_blocs}}, mur d’épaisseur {{ep}}.','Refuser les blocs fissurés ou cassés ; humidification adaptée en saison chaude, mortier et dosage à préciser, réservations de réseaux, blocs spéciaux pour chaînages et linteaux, feuillures et calfeutrements.',MASON),
 ('Mur en blocs pleins ou semi-creux','Maçonnerie en blocs de béton pleins ou semi-creux.','Préciser module, épaisseur, hauteur, mortier, joints, parement, feuillures et réservations.',MASON),
 ('Mur en briques pleines','Parement et contre-parement en briques pleines, module {{module_briques}}.','Préciser appareillage, dosage du mortier, épaisseur des joints, humidification, parement apparent ou revêtu, rejointoiement et nettoyage.',MASON),
 ('Mur en briques creuses à perforations verticales','Briques creuses de module {{module_briques}}, épaisseur {{ep}}.','Refuser défauts apparents ; humidifier selon absorption, définir mortier bâtard, éléments spéciaux, feuillures et calfeutrement.',MASON),
 ('Mur en briques à rupture de joint','Variante de briques citée dans la description du cours.','Préciser fabricant ou caractéristiques, épaisseur, hourdage et finition ; aucune performance forfaitaire n’est attribuée au seul nom.',MASON),
 ('Mur en briques de type G','Variante de briques citée dans la description du cours.','Préciser module, épaisseur, mortier et éléments spéciaux selon le système retenu.',MASON),
 ('Mur en béton cellulaire à coller','Blocs de béton cellulaire assemblés au mortier-colle.','Blocs secs avant pose, premier lit à bain de mortier ; joints et pièces spéciales suivant système. Définir traitement des appuis, armatures locales, feuillures et calfeutrement.',MASON),
 ('Mur en béton cellulaire à maçonner','Variante à maçonner citée pour les bâtiments industriels.','Mortier avec plastifiant et joints de 10 mm dans la description du cours ; définir le produit et ses conditions de mise en œuvre.',MASON),
 ('Paroi en pavés de verre','Paroi de pavés de verre mentionnée dans la liste des ouvrages.','Composition, armatures, joints, dimensions et interfaces à définir : le cours ne livre pas ici de clause détaillée.',[])]
for i,(title,desc,exe,norms) in enumerate(materials,1):
 work('02',f'GO-V{i:02}','Superstructure — Parois et matériaux',title,'m2','L * H - S_vides',AREA,desc,exe,'L2:39-50,57-59,69-74',norms,kind='technologie_sans_clause_cctp' if i==10 else 'trame_et_technologie')
for i,(title,context) in enumerate([
 ('Mur de façade','Paroi extérieure ; définir le type vis-à-vis de la pluie, simple, composite, double ou avec doublage.'),
 ('Mur gouttereau','Mur recevant la gouttière ; préciser la finition de sa tête.'),
 ('Mur pignon','Pignon avec pointe ou arasé au plancher ; définir les réservations des pannes.'),
 ('Mur d’allège','Partie de mur située sous une baie.'),
 ('Mur de refend en superstructure','Mur intérieur porteur ; isoler sa description si différent des murs périmétriques.'),
 ('Mur d’échiffre en superstructure','Paroi constitutive d’une cage d’escalier.'),
 ('Mur de remplissage','Maçonnerie de remplissage entre éléments d’ossature.'),
 ('Mur d’édicule','Paroi d’un local en terrasse, par exemple machinerie d’ascenseur.'),
 ('Mur de balcon ou loggia','Paroi de balcon ou de loggia.'),
 ('Mur de séparation','Mur séparant des parties du bâtiment.'),
 ('Trumeau porteur','Partie porteuse entre deux baies ; décrire à part si particularité.'),
 ('Meneau','Élément vertical intermédiaire de baie, à décrire à part si particularité.'),
 ('Garnissage des pointes de pignons','Finition des rampants sous toiture et réservations de charpente.'),
 ('Garnissage entre chevrons','Remplissage des intervalles entre chevrons en tête de mur gouttereau.'),
 ('Scellement des bois de charpente','Scellement des pièces de charpente mentionné dans la trame.')],11):
 work('02',f'GO-V{i:02}','Superstructure — Localisations et finitions',title,'ml' if i>=23 else 'm2','L' if i>=23 else 'L * H - S_vides',LINE if i>=23 else AREA,context,
 'Décrire matériau, géométrie, mortier ou béton, armatures, réservations, parement et interfaces suivant {{plans}}. Classer chaque type de mur séparément ; les cloisons non porteuses de moins de 11 cm peuvent relever du lot cloisons/doublages dans la trame.',
 'L2:54-55,68-71,74-75',MASON)
struct=[
 ('Caractéristiques générales des ouvrages en béton armé',None,None,'Qualité des bétons, des armatures et des parements.','Se reporter à l’étude BA ; ne pas donner d’indications hasardeuses. Définir les hypothèses de calcul si elles doivent être établies par l’entreprise.'),
 ('Poteau en béton armé','m3','a * b * H','Poteau isolé, d’angle ou en ossature ; section {{section}}.','Décrire béton, coffrage, armatures, réservations et chanfreins. Ferraillage selon ingénieur BA ; tracer, réaliser amorce, armer, coffrer et étayer, bétonner et vibrer puis décoffrer après durcissement.'),
 ('Voile en béton armé','m3','L * H * ep - V_vides','Voile porteur en béton armé, de géométrie {{geometrie}}.','Béton, coffrage, armatures, réservations, vibrage, parement et arase selon dossier.'),
 ('Poutre ou nervure en béton armé','m3','L * b * H','Élément horizontal porteur de structure.','Décrire béton, coffrage, armatures et réservations ; dimensionnement suivant les charges reprises. Les sections forfaitaires de chaînages ne s’appliquent pas aux poutres.'),
 ('Linteau en béton armé coulé en place','m3','L * b * H','Linteau franchissant une baie, indépendant ou filant.','Appuis du cours : plus grande valeur entre 20 cm et 1/10 de portée. Définir coffrage, armatures, habillage extérieur et feuillures.'),
 ('Linteau en blocs U','ml','L','Linteau en béton armé coulé dans des éléments spéciaux en U.','Régler et caler les blocs sur soutien inférieur étayé, placer l’armature puis couler et vibrer ; définir appuis et feuillures.'),
 ('Prélinteau préfabriqué','ml','L','Élément préfabriqué mince formant fond de moule incorporé au linteau.','Définir section et portée, appuis, lit de mortier et complément de béton selon procédé.'),
 ('Chaînage horizontal avec planelles','ml','L','Chaînage périmétrique en béton armé avec habillage extérieur.','Limiter les ponts thermiques et la fissuration de l’enduit, assurer continuité et retournement des armatures dans les angles ; bétonnage en même temps que le plancher suivant le dossier.'),
 ('Chaînage horizontal sans planelles','ml','L','Chaînage en béton armé sans habillage rapporté.','Définir coffrage, ferraillage, liaisons d’angles, vibrage et finition ; solution décrite pour zones sans risque de pont thermique.'),
 ('Chaînage vertical dans blocs spéciaux','ml','H','Liaison verticale aux angles saillants et rentrants et aux joints de fractionnement.','Coulage dans blocs d’angle, continuité par ancrages et recouvrements ; ces chaînages ne constituent pas des poteaux d’ossature.'),
 ('Bandeau en béton armé','ml','L','Ouvrage saillant en façade.','Définir béton, coffrage, armatures et finition ; décrire section, joints et larmier selon plans.'),
 ('Acrotère en béton armé','ml','L','Ouvrage en béton armé cité dans la liste.','Définir béton, coffrage, armatures, réservations et finition ; distinguer du bandeau ou de la corniche.'),
 ('Corniche en béton armé','ml','L','Ouvrage saillant en façade.','Décrire béton, coffrage, armatures, section et finition suivant plans.'),
 ('Joint de dilatation ou de retrait de la structure','ml','L','Joint intéressant les maçonneries de grande surface et l’ensemble de la structure.','Implanter suivant dossier ; le cours cite des espacements de 20 à 35 m selon région et indique qu’une valeur intermédiaire doit être justifiée.'),
 ('Coffrage de parement','m2','S_coffree','Coffrage ordinaire ou soigné selon destination du parement.','Définir faces vues et faces cachées, étaiement, réglage, propreté et décoffrage. Ne mesurer que les faces effectivement coffrées.'),
 ('Armatures principales, cadres et étriers','kg','masse_acier','Aciers HA de diamètres appropriés suivant étude BA.','Conserver nomenclature des barres, cadres, étriers et attentes ; aucun ratio de kg/m3 n’est inventé à partir du seul type d’ouvrage.'),
 ('Finition des bétons après décoffrage','m2','S','Bouchement des manques de matière, meulage des balèvres et ragréage des faces apparentes.','Employer un béton analogue pour les reprises ; définir qualité du parement et tolérances attendues.')]
for i,(title,unit,formula,desc,exe) in enumerate(struct,1):
 work('02',f'GO-B{i:02}','Structure — Béton armé',title,unit,formula,GENERAL if not unit else LINE if unit=='ml' else VOL if unit=='m3' else AREA if unit=='m2' else 'Masse suivant nomenclature de l’étude BA.',desc,exe,'L2:51-67,70-71,75-78',BA+MASON)
# PLANCHERS, y compris les variantes citées hors des exemples CCTP béton.
floors=[
 ('Dalle pleine coulée en place','Dalle en béton armé reposant sur deux ou quatre appuis.','Définir épaisseur, niveau brut, charges, performances acoustiques et au feu, armatures suivant étude BA, coffrage réglé et jointif, trémies, gaines et fourreaux, finition et planéité.', 'm3','S * ep','L2:92-98,121,123'),
 ('Plancher à poutrelles et entrevous béton','Système semi-préfabriqué à poutrelles, entrevous et béton de clavetage ou de répartition.','Définir plan de pose, étaiement, manutention, armatures de chaînage et dalle de compression ; renforts et chevêtres aux trémies, incorporations coordonnées, bétonnage suivant système.', 'm2','S','L2:98-105,121,124'),
 ('Plancher à poutrelles et entrevous isolants','Système semi-préfabriqué à isolation intégrée.','Préciser caractéristiques et performances ; renforcer trémies et charges localisées suivant étude, poser chapeaux et nappe de treillis, couler dalle de compression et chaînages en une phase.', 'm2','S','L2:101-105,121,124'),
 ('Plancher à prédalles','Prédalles complétées par béton coulé en place.','Plan de pose, stockage, manutention, trémies et réseaux à coordonner ; renforts sur joints, chapeaux sur appuis, coulage sur surface nettoyée et humidifiée ; ragréage des joints de sous-face ; aucun scellement dans les prédalles dans l’exemple.', 'm2','S','L2:106-109,121,125'),
 ('Plancher préfabriqué en béton','Plancher préfabriqué cité dans la classification.','Définir composants, portées, charges, assemblages, levage, appuis et clavetage suivant le dossier ; la liste CCTP ne fournit pas une clause détaillée universelle.', 'm2','S','L2:109-110,121'),
 ('Dalles alvéolées','Éléments préfabriqués en béton avec alvéoles longitudinales.','Préciser section, portée, appuis, clavetage, réservations et étude du fabricant ; ne pas calculer le volume de béton comme une dalle pleine.', 'm2','S','L2:110-111,121'),
 ('Plancher béton collaborant sur bac acier','Plancher mixte associant coffrage acier et béton.','Définir profil du bac, armatures, épaisseur, appuis et liaisons suivant procédé. Mesurer séparément les constituants si demandé au bordereau.', 'm2','S','L2:112-113,121'),
 ('Plancher bois à solives','Solives parallèles sur chant entre appuis, supportant un parquet ou autre revêtement.','Section, essence et qualité suivant charges et flèche. Le cours cite entraxes 0,30 à 0,40 m, appuis sur mur 15 à 20 cm avec vide d’air, entretoises et chevêtres. Le détail ancien d’écart au feu de 16 cm ne vaut pas validation actuelle.', 'm2','S','L2:86-88'),
 ('Solive de plancher bois','Pièce porteuse de plancher sur chant.','Définir section et portée ; appui encastré, sur corbeau, lambourde ou sablière suivant le dessin ; protéger les appuis de l’humidité.', 'ml','L','L2:86-88'),
 ('Entretoise de plancher bois','Entretoise clouée pour éviter le déversement des solives.','Définir section, longueur et implantation suivant plan de solivage.', 'U','N','L2:86-87'),
 ('Chevêtre et enchevêtrure de plancher bois','Dispositif autour des trémies du plancher.','Définir assemblages, solives doublées, solives boiteuses et éventuels fers de cheminée suivant le dossier.', 'U','N','L2:86-88'),
 ('Plancher métallique à poutrelles','Ossature de poutrelles métalliques recevant une dalle béton ou un parquet.','Définir profilés, portées, charges et assemblages boulonnés ou soudés suivant étude.', 'm2','S','L2:89-91'),
 ('Plancher léger sur tôle ondulée','Tôle ondulée sur solives métalliques avec couche de béton et chape suivant schéma.','Les coupes sont des exemples ; définir les profils, couches, épaisseurs et assemblages au projet.', 'm2','S','L2:91'),
 ('Plancher métallique à caillebotis','Caillebotis sur ossature métallique cité dans la coupe d’exemple.','Préciser profilés, caillebotis, charges et assemblages ; le cours ne donne pas de clause CCTP complète.', 'm2','S','L2:91'),
 ('Isolation thermique en sous-face de plancher','Isolation rapportée ou mise en fond de coffrage.','Préciser produit, épaisseur et performances suivant étude ; notamment sous local chauffé donnant sur extérieur ou local non chauffé.', 'm2','S','L2:83,123'),
 ('Dalle de compression ou de répartition','Béton complémentaire rendant les éléments semi-préfabriqués monolithiques.','Définir béton, nappe de treillis, chapeaux, réservations, liaison aux chaînages et finition. Ne pas ajouter son volume une seconde fois si le prix du plancher est composé.', 'm3','S * ep','L2:98-109'),
 ('Chevêtre de trémie en béton armé','Renfort au droit d’une trémie de plancher.','Coffrage, armatures, ancrages et réservations suivant étude BA.', 'm3','L * b * H','L2:103-109,124-125'),
 ('Coffrage de sous-face de dalle','Coffrage tunnel, table, poutres et panneaux standards ou système traditionnel CTBX.','Prévoir étaiement, propreté et aspect de face ; réserver toutes trémies avant coulage et fixer les gaines et canalisations.', 'm2','S_coffree','L2:96'),
 ('Parement de béton élémentaire','Parement défini dans les caractéristiques du cours.','Finition pour locaux utilitaires ou surfaces masquées ; pas de spécification particulière de planéité dans le tableau reproduit.', 'm2','S','L2:97'),
 ('Parement de béton ordinaire','Parement de béton pouvant recevoir un enduit épais.','Le tableau du cours indique 15 mm sous règle de 2 m et 6 mm sous réglet de 0,20 m ; aspect selon FD P 18-503 cité.', 'm2','S','L2:97'),
 ('Parement de béton courant','Parement destiné à des finitions classiques après préparation.','Le tableau du cours indique 7 mm sous 2 m et 2 mm sous 0,20 m ; préciser la préparation relevant du lot de finition.', 'm2','S','L2:97'),
 ('Parement de béton soigné','Parement destiné notamment à rester brut ou à recevoir peinture ou carrelage collé à l’extérieur exposé à la pluie.','Le tableau du cours indique 5 mm sous 2 m et 2 mm sous 0,20 m ; définir les tolérances dans les documents du projet.', 'm2','S','L2:97')]
for i,(title,desc,exe,unit,formula,pages) in enumerate(floors,1):
 work('02',f'GO-H{i:02}','Planchers et ouvrages horizontaux',title,unit,formula,VOL if unit=='m3' else COUNT if unit=='U' else LINE if unit=='ml' else AREA,desc,exe,pages,BA if i<=7 or i>=15 else [],kind='technologie_sans_clause_cctp' if 8<=i<=14 else 'trame_et_technologie')
stairs=[
 ('Escalier droit coulé en place','Escalier à ligne de foulée rectiligne, à paillasse porteuse en BA.','Définir montée, emmarchement, marches, contremarches, paillasse, paliers, coffrage, armatures et réservations de rampe. Éviter les poussées au vide à la liaison volée/palier.'),
 ('Escalier à volées droites avec palier de virage','Volées droites séparées par un palier.','Décrire chaque volée et palier avec dimensions, supports, armatures et finitions ; ne pas confondre nombre de marches et nombre de girons.'),
 ('Escalier à quartier tournant et marches balancées','Volées de directions différentes avec marches balancées.','Métré suivant le contour réel et les plans ; ne pas appliquer une formule de volée droite aux marches de géométrie variable.'),
 ('Escalier hélicoïdal','Escalier tournant autour d’un jour ou d’un fût.','Géométrie, noyau, marches rayonnantes et paliers suivant plans ; aucune simplification automatique en escalier droit.'),
 ('Escalier monobloc préfabriqué','Escalier droit, balancé ou hélicoïdal préfabriqué.','Définir géométrie, levage, appuis, liaisons et finitions suivant dossier.'),
 ('Escalier hélicoïdal à marches indépendantes','Variante préfabriquée à marches indépendantes citée dans le schéma.','Caractéristiques et assemblages à compléter ; le cours ne donne pas une clause d’exécution détaillée.'),
 ('Escalier extérieur','Escalier exécuté sur place ou préfabriqué.','Décrire massif de fondation, fouille, béton, attentes, marches, paillasse, paliers, coffrages, armatures, réservations et larmier ; inclure les finitions une seule fois.'),
 ('Escalier intérieur','Escalier intérieur, suivant les mêmes éléments de description que l’escalier extérieur.','Préciser coffrages, ferraillage, réservations de rampe, nez de marche et destination des parements.'),
 ('Balcon en béton armé','Dalle en console ou autre géométrie prévue au plan.','Définir béton, épaisseur, coffrage, ancrage dans le plancher, armatures, larmier, réservations et finitions.'),
 ('Marches d’accès et emmarchement','Marches d’accès intérieures ou extérieures.','Décrire section, béton, coffrage, ancrage des armatures et finition ; quantifier la géométrie réellement dessinée.'),
 ('Rampe d’accès','Ouvrage incliné d’accès.','Compacter le remblai, prévoir désolidarisation, béton, coffrage, armatures et finition par chape refluée à arêtes arrondies dans la trame.'),
 ('Finition de sous-face d’escalier','Brut de décoffrage, peinture, enduit plâtre ou encoffrement suivant choix.','Définir finition et préparation du support ; aucune clause complète de peinture ou plâtrerie n’est ajoutée à partir de cette seule citation.'),
 ('Finition des marches et contremarches','Brut de décoffrage, peinture, moquette, revêtement plastique ou carrelage.','Définir destination de chaque face, nez antidérapants et tapis éventuel ; les lots de revêtements restent à documenter si nécessaire.')]
for i,(title,desc,exe) in enumerate(stairs,1):
 work('02',f'GO-A{i:02}','Escaliers — Balcons — Rampes',title,'m2' if i>=12 else 'm3', 'S' if i>=12 else None,AREA if i>=12 else VOL,desc,exe,'L2:115-122,126',BA if i<12 else [],kind='technologie_sans_clause_cctp' if i in [6,12,13] else 'trame_et_technologie')
# Treillis : données du tableau du cours, pas un catalogue commercial actuel.
mesh=[('RAF R',1.043,120,125.10),('PAF R',1.042,8.64,9.00),('RAF C',1.25,96,120),('PAF C',1.25,8.64,10.80),('PAF V',1.25,7.68,9.60),
 ('ST 10',1.870,11.52,21.54),('ST 20',2.487,14.40,35.81),('ST 25',3.020,14.40,43.49),('ST 30',3.226,14.40,46.46),('ST 35',4.026,14.40,57.98),
 ('ST 50',5.267,14.40,75.84),('ST 60',6.965,14.40,100.30),('ST 15 C',2.220,9.60,21.31),('ST 25 C',4.026,14.40,57.98),('ST 25 CS',4.026,7.20,28.99),
 ('ST 40 C',6.040,14.40,86.98),('ST 50 C',7.900,14.40,113.76),('ST 65 C',9.980,14.40,143.71)]
for i,(name,mass,area,weight) in enumerate(mesh,1):
 work('02',f'GO-T{i:02}','Armatures — Treillis du cours',f'Treillis soudé {name} — tableau pédagogique','m2','S',
 'Surface de panneaux ou rouleaux réellement prévue ; recouvrements et chutes à déterminer au plan, sans pourcentage par défaut.',
 f'Tableau du cours : masse nominale {mass} kg/m2 ; surface d’un panneau ou rouleau {area} m2 ; masse unitaire {weight} kg.',
 'Choix et implantation suivant l’étude BA. Ces références et masses appartiennent au tableau ancien reproduit ; ne pas les traiter comme un état actuel des produits disponibles.',
 'L2:95' if i<=5 else 'L2:96',['NF A 35-024'] if i<=5 else ['NF A 35-016','NF A 35-019-2'],kind='donnee_technique_catalogue_du_cours',
 ratios=[{'materiau':'Acier de treillis '+name,'quantite_par_unite':mass,'unite':'kg'}])
# LOT 03 — FAÇADES ET FINITIONS EXTÉRIEURES.
ENDUIT=['NF P 15-201 — DTU 26.1']
facades=[
 ('Généralités et préparation des supports de façade',None,None,'Nature et état du support, préparation et aspect final à préciser.','Sur support neuf, le cours indique au moins un mois de stabilisation ; sur ancien, diagnostic de stabilité et compatibilité. Nettoyer, dépoussiérer, traiter les défauts d’adhérence.','L2:133-136,165'),
 ('Enduit traditionnel à trois couches','m2','S','Enduit en mortier de ciment, chaux ou mortier bâtard, avec gobetis, corps d’enduit et finition.','Préciser chaque couche, dosage, granulométrie, épaisseur et séchage. Exécution décrite entre 5 et 30 °C, protections contre dessiccation, vent et soleil ; humidification adaptée sans réhumidifier en plein soleil.','L2:131,133-138,165'),
 ('Gobetis ou couche d’accrochage','m2','S','Première couche assurant l’adhérence sur le support.','Le cours décrit ciment CEM I ou II classe 32,5, dosage 500 à 600 kg et sable 0,25/3,15 pauvre en fines ; préciser épaisseur et séchage du système retenu.','L2:136'),
 ('Corps d’enduit','m2','S','Couche assurant l’essentiel de l’imperméabilisation et de la planéité.','Mortier de ciment ou bâtard ; le cours cite dosage global de 350 à 450 kg et sable 0,1/3,15. Épaisseur moyenne des deux premières couches 15 à 20 mm avec recouvrement au moins 10 mm ; séchage entre ces couches 3 à 7 jours, jamais moins de 3 jours.','L2:137'),
 ('Couche de finition d’enduit','m2','S','Couche esthétique en mortier ordinaire ou décoratif.','Le cours cite dosage global 250 à 350 kg, sable 0,1/2 ; finition talochée 5 à 7 mm ou projetée 3 à 5 mm ; couche talochée fin, non lissée ; séchage du corps d’enduit 8 à 15 jours avant application.','L2:137-138'),
 ('Enduit bicouche projeté mécaniquement','m2','S','Enduit de mortier exécuté à la pompe en deux couches.','Première couche projetée et dressée 7 à 10 mm ; seconde couche 10 à 15 mm après au moins 7 jours, resserrée à la taloche non lissée ; parement décoratif mince ou peinture éventuellement prévu.','L2:131,139'),
 ('Enduit monocouche d’imperméabilisation','m2','S','Produit industriel à base de ciment ou chaux, prêt à gâcher.','Produit et support à choisir selon Avis Technique ; une couche homogène peut être réalisée en plusieurs passes. Le texte cite environ 15 mm ; diagnostic préalable en rénovation et incompatibilité signalée avec les anciens enduits au plâtre.','L2:131-132,146-147'),
 ('Revêtement plastique épais — RPE','m2','S','Couche décorative de protection sur béton préparé ou enduit traditionnel.','Application à la taloche ou au rouleau selon produit ; diagnostic préalable sur ancien revêtement. Le cours signale une perméabilité à la vapeur plus faible et exclut l’application sur matériau sensible à l’eau comme un mur en terre.','L2:132'),
 ('Enduit de parement hydraulique','m2','S','Produit minéral industriel à base de ciment ou chaux.','Projection sur corps d’enduit taloché ou sur béton ; préciser produit, préparation, épaisseur, aspect et coloris.','L2:132'),
 ('Enduit armé','m2','S','Enduit comportant une armature de renfort.','Treillis métallique protégé ou fibre de verre traitée ; dimensions et enrobage adaptés au support et au mortier.','L2:135,142'),
 ('Enduit incorporé au coffrage','m2','S','Couche de mortier tapissant le parement du coffrage.','Procédé cité en préfabrication ou moulage du béton pour supprimer l’enduit après décoffrage ; définir le système retenu.','L2:142'),
 ('Enduit sur matériaux hétérogènes','m2','S','Enduit renforcé au droit de matériaux juxtaposés.','Armature à treillis pour limiter la fissuration ; le tableau indique un enrobage supérieur à 3 cm, donnée à confronter au système et aux autres épaisseurs du chapitre.','L2:135,142'),
 ('Peinture sur ouvrage en béton extérieur','m2','S','Finition de protection et décoration des ouvrages en béton extérieur.','Définir préparation, fixateur, nature de peinture, couches, aspect et teinte ; l’exemple du cours est conservé séparément.','L2:167')]
for i,(title,unit,formula,desc,exe,pages) in enumerate(facades,1):
 work('03',f'FAC-{i:03}','Enduits et ravalement',title,unit,formula,GENERAL if not unit else AREA,desc,exe,pages,ENDUIT if i!=13 else [])
finishes=[
 ('Enduit brut de projection','Surface laissée brute après projection pneumatique à la pompe à mortier.'),
 ('Enduit rustique écrasé','Parties saillantes écrasées au couteau avant durcissement.'),
 ('Enduit gratté ou raclé','Surface talochée, grains superficiels éliminés après amorce de prise ; ne pas laisser de surfaces non traitées de teinte différente.'),
 ('Enduit jeté-truelle','Projection à la truelle ; structures et reliefs suivant choix.'),
 ('Enduit taloché-feutré','Finition talochée puis passée au bouclier feutré.'),
 ('Mouchetis tyrolien','Projection avec appareil à mini-palettes sur enduit taloché durci, en couches élémentaires.'),
 ('Enduit taloché','Mortier projeté et coupé à la truelle/règle ou étalé puis dressé ; finition manuelle ou mécanique.'),
 ('Enduit lissé','Surface talochée puis lissée à la truelle par ressuage du mortier, dans le tableau des finitions.'),
 ('Enduit peigné','Surface talochée passée au peigne guidé par règle ; sillons cités 3 à 5 mm espacés de 10 à 20 mm.'),
 ('Enduit recoupé','Surface brute de projection ou dressée grossièrement, puis coupée à la truelle après raffermissement.'),
 ('Enduit sous-plâtre','Surface dressée après projection à la règle ascendante obliquement dans les deux sens, destinée à l’adhérence du plâtre à l’intérieur.'),
 ('Enduit lavé','Granulats apparents par lavage au jet fin ou brossage souple.'),
 ('Enduit bouchardé','Traitement superficiel à la boucharde en pleine surface, gradine aux arêtes ; cité surtout pour la réhabilitation.'),
 ('Enduit grésé','Élimination manuelle ou mécanique des parties saillantes après durcissement, par ponçage.'),
 ('RPE granité à liant incolore','Aspect obtenu à la taloche lisseuse inox souple.'),
 ('RPE tramé au rouleau','Structures obtenues selon le rouleau choisi.'),
 ('RPE ribbé verticalement','Finition à la taloche lisseuse plastique.'),
 ('RPE ribbé en rond ou brouillé','Finition plastique travaillée en rond.')]
for i,(title,exe) in enumerate(finishes,1):
 work('03',f'FAC-F{i:02}','Aspects et finitions des enduits',title,'m2','S',AREA,'Aspect de finition décrit dans le cours ; nature du produit et coloris : {{produit_coloris}}.',exe+' Définir échantillon, préparation et conditions du système ; ne pas appliquer simultanément des finitions incompatibles.','L2:139-142',ENDUIT)
ite=[
 ('Bardage rapporté sur ossature','Parement sur ossature bois ou métal, avec isolant et lame d’air ventilée.','Le cours cite tuiles, ardoise, céramique, bois, zinc, aluminium laqué et plaques composites ; définir ossature, isolant non hydrophile, ventilation et fixations.'),
 ('Isolation extérieure sous enduit mince','Isolant collé ou fixé mécaniquement, avec enduit organique mince armé.','Isolants cités : polystyrène expansé ignifugé ou laine de roche ; enduit 3 à 5 mm, armature dans première couche, couche d’impression et finition selon procédé.'),
 ('Isolation extérieure sous enduit hydraulique','Isolant avec enduit hydraulique armé.','Isolant généralement rainuré et fixé selon système ; le cours cite enduit 15 à 20 mm et treillis de fibre de verre ou métallique dans la première couche.'),
 ('Vêture isolante','Association isolant-parement posée sur ossature fixée au mur.','Choisir le système, l’isolant et le parement ; vérifier l’aptitude du support.'),
 ('Vêtage','Isolant collé ou fixé sur le support avec parement fixé au travers de l’isolant.','Système décrit sans ossature intermédiaire, avec ou sans lame d’air selon procédé ; définir fixations et joints.'),
 ('Classement reVETIR des systèmes d’isolation extérieure','Classement pédagogique suivant réparation, entretien, vent, étanchéité, chocs, incendie et résistance thermique.','Les tableaux du cours sont des aides au choix anciennes ; conserver les critères et justifier le système au projet sans décision automatique de conformité.')]
for i,(title,desc,exe) in enumerate(ite,1):
 work('03',f'FAC-I{i:02}','Isolation par l’extérieur',title,None if i==6 else 'm2',None if i==6 else 'S',GENERAL if i==6 else AREA,desc,exe,'L2:148-153',kind='technologie_sans_clause_cctp' if i==6 else 'trame_et_technologie')
for i,(title,exe) in enumerate([
 ('Bavette et protection haute d’acrotère','Fixation mécanique, protection du système d’isolation et pente de rejet suivant détail.'),
 ('Bavette d’arrêt sous toiture','Protection haute lorsque la toiture ne déborde pas suffisamment ; définir largeur, matériau et raccords.'),
 ('Appui de baie rapporté sur isolation extérieure','Définir matériau, largeur, larmier et raccord étanche avec menuiserie et façade.'),
 ('Bavette sous appui existant','Fixation mécanique sur façade en rénovation ; largeur adaptée à l’épaisseur de l’isolation.'),
 ('Réfection de l’appui existant pour ITE','Après suppression du nez existant, dispositif de compensation d’épaisseur et nouvel appui béton avec larmier suivant détail.'),
 ('Traitement des joints de gros œuvre dans l’ITE','Mastic élastomère ou couvre-joint ; poursuivre les joints du support.'),
 ('Profil d’encadrement de tableau ou sous-face de linteau','Profil au droit des parties non enduites ; dimensions et fixation à préciser.'),
 ('Profil d’angle d’enduit','Accessoire de protection et dressage des angles.'),
 ('Joint de fractionnement d’enduit','Listel céramique collé, joint plastique ou métallique fixé au support ou noyé dans la première passe.'),
 ('Larmier sous ouvrage saillant','Dispositif sous bandeau, balcon ou saillie limitant ruissellement et salissure.'),
 ('Isolation de paroi enterrée en façade','Détail de protection de l’isolant contre le remblai et compatibilité avec émulsion bitumineuse sans solvant agressif pour le polystyrène.'),
 ('Arrêt d’ITE sur balcon, terrasse ou escalier','Bande de désolidarisation et joint mastic ; conserver la forme de pente de l’ouvrage.')],1):
 work('03',f'FAC-A{i:02}','Accessoires et points singuliers de façade',title,'ml' if i<=10 else 'm2','L' if i<=10 else 'S',LINE if i<=10 else AREA, 'Accessoire ou point singulier figurant dans les détails de façade du cours.',exe,'L2:139,142,152-153')
stone=[
 ('Revêtement attaché en pierre mince — généralités','Habillage de façade en plaques de pierre.','Définir support, pierre, dimensions, masse, résistance au gel, fixation et joints ; prendre en compte poids, vent, dilatation, humidité et mouvements du support.'),
 ('Pierre sur attaches fixées mécaniquement à joints ouverts','Système absorbant les mouvements entre revêtement et support.','Fixations par chevilles dans support béton ; lame d’air ventilée supérieure à 2 cm, isolant éventuellement interposé ; joints entre plaques laissés vides dans le système décrit.'),
 ('Pierre sur attaches scellées à joints ouverts','Fixations scellées au mortier.','Supports cités : béton, blocs béton ou terre cuite, maçonnerie de pierre ; permettre les mouvements et assurer lame d’air et joints suivant système.'),
 ('Pierre agrafée avec polochons','Revêtement agrafé avec joints vides ou calfeutrés au mastic élasto-plastique.','Le tableau cite façade inférieure à 28 m, plaques inférieures à 1 m2, joints de fractionnement obligatoires, absence d’isolant interposé et lame d’air supérieure à 2 cm.'),
 ('Pierre sur attaches mécaniques ou scellées, joints garnis au mortier','Variante à joints garnis.','Définir attaches, support et fractionnement ; le cours précise joints souples horizontaux environ tous les 3 m et verticaux environ tous les 8 m ; joints de gros œuvre poursuivis.'),
 ('Pierre sur ossature métallique intermédiaire','Système de rails modulables avec ossature primaire verticale et secondaire horizontale.','Définir rails, fixations, joints horizontaux et verticaux et lame d’air suivant système.'),
 ('Attaches de plaques de pierre','Attaches métalliques non corrodables.','Le cours cite quatre attaches par plaque, dont deux porteuses et deux de retenue ; lame d’air au moins 2 cm, ancrage inoxydable, ergots et manchons permettant le mouvement.'),
 ('Joints souples du revêtement en pierre','Joints de fractionnement et joints de gros œuvre.','À joints garnis de mortier, largeurs minimales citées 10 mm à l’horizontale et 8 mm à la verticale, avec fond de joint et mastic ne tachant pas la pierre ; poursuivre les joints du support.') ]
for i,(title,desc,exe) in enumerate(stone,1):
 work('03',f'FAC-P{i:02}','Revêtements en pierre',title,'U' if i==7 else 'ml' if i==8 else 'm2','N' if i==7 else 'L' if i==8 else 'S',COUNT if i==7 else LINE if i==8 else AREA,desc,exe,'L2:154-160',['P 65-202 — DTU 55.2'])
for i,name in enumerate(['Fontenille','Larrys','Roche-de-Peuron','Vilhonneur','Gris-bleu de Hinglé','Languédias beige','Bleu moucheté de Plaintel','Rose d’Armor','Altaquartzite de Alta','Saint-Maximin roche franche fine'],1):
 work('03',f'FAC-N{i:02}','Pierres citées dans le cours',f'Pierre naturelle — {name}','m2','S',AREA,
 'Matériau cité à titre d’exemple dans le cours ; caractéristiques et provenance à confirmer pour le projet.',
 'Le cours ne donne pas une clause de pose spécifique à cette seule désignation. Choisir les dimensions, la finition et le système de fixation du revêtement en pierre ; ne pas déduire une performance actuelle du nom commercial.',
 'L2:155' if i<10 else 'L2:159',kind='materiau_cite_sans_clause_cctp')
for i,(title,exe,unit) in enumerate([
 ('Appui de baie en béton réalisé en place','Définir dimensions, pente extérieure, rejingot et larmier ; coffrage, armatures, réservations dans tableaux, finition et joint avec menuiserie.','ml'),
 ('Appui de baie préfabriqué','Définir matériau et dimensions, assise de mortier, pose entre tableaux ou encastrée, étanchéité des raccords.','ml'),
 ('Seuil en mortier ou autre matériau','Préciser épaisseur, matériau, pente, aspect et finition ; arête arrondie dans l’exemple de pas de porte.','ml'),
 ('Bandeau de façade','Préciser type, matériau, géométrie et finition ; éviter un double compte avec la structure BA.','ml'),
 ('Corniche de façade','Préciser type, matériau, profil et finition ; distinguer béton, enduit et accessoires.','ml'),
 ('Couvertine en aluminium laqué','Protection haute des acrotères ou murs de clôture, avec goutte d’eau et pente vers l’intérieur. Définir tôle, agrafes ou tasseaux, coulisseaux de dilatation et couleur.','ml'),
 ('Habillage extérieur en briques','Habillage cité dans la trame ; préciser matériau, fixation ou hourdage et joints.','m2'),
 ('Cintre en pierre','Ouvrage cité dans la trame ; géométrie, pierre, appareillage, pose et finition à définir.','ml'),
 ('Chaîne d’angle en pierre','Ouvrage cité dans la trame ; pierre, module, liaison au mur et joints à définir.','ml')],1):
 work('03',f'FAC-O{i:02}','Appuis — Seuils — Ouvrages divers',title,unit,'L' if unit=='ml' else 'S',LINE if unit=='ml' else AREA,'Ouvrage de finition extérieure à localiser suivant {{plans_facades}}.',exe,'L2:161-165,167-168',kind='technologie_sans_clause_cctp' if i>=7 else 'trame_et_technologie')
# LOT 04 — CONDUITS DE FUMÉE.
SMOKE=['NF P 51-201 — DTU 24.1','NF EN 1443']
fum=[
 ('Généralités et choix du conduit',None,None,'Conduit d’allure verticale évacuant les produits de combustion à l’extérieur.','Choisir matériaux, classe de température, pression, condensation, corrosion, résistance au feu de cheminée et distance aux combustibles suivant appareil, combustible et fabricant. La section intérieure reste constante et de même forme.','L3:95-99,104-107'),
 ('Conduit maçonné en briques pleines','ml','L','Conduit en briques pleines, appareillage suivant section.','Définir nature des briques, section, mortier, assise, stabilité, accès et raccordement ; le cours ne donne pas d’exemple CCTP détaillé pour cette seule variante.','L3:98,123'),
 ('Conduit en briques réfractaires','ml','L','Matériau mentionné parmi les constituants possibles des conduits.','Choisir le conduit suivant destination, température et combustible ; la citation du matériau ne constitue pas une prescription complète.','L3:98'),
 ('Conduit en boisseaux de terre cuite','ml','L','Boisseaux conformes à NF EN 1806 dans le document.','Assise ou support stable ; refuser boisseaux cassés ou fissurés, présenter d’aplomb, décalage intérieur au plus 2 mm, pièces spéciales de dévoiement sans recoupe, emboîtement mâle vers le bas, joints 5 à 8 mm, mortier adapté, joints lissés intérieurement et repoussés à l’extérieur.','L3:112-114'),
 ('Conduit en boisseaux de béton de pouzzolane','ml','L','Conduits manuportables ou de hauteur d’étage, monoblocs ou composites.','Humidifier les emboîtements, poser mâle vers le bas, joints 5 à 8 mm, ôter excès de mortier, lisser intérieur et repousser extérieur ; ceinturage des conduits adossés tous les 2,50 m permettant libre dilatation dans le texte.','L3:115-117'),
 ('Conduit composite ou multiparoi','ml','L','Conduit intérieur et enveloppe externe compatibles, avec isolant ou lame d’air.','Assemblage selon fabricant ; définir matériaux, section et résistance thermique sans assimiler une enveloppe à un conduit intérieur.','L3:115'),
 ('Conduit intérieur en terre cuite','ml','L','Composant intérieur visé par NF EN 1457 cité dans le livre.','Intégrer à un système compatible ; définir section et raccords suivant fabricant.','L3:98'),
 ('Conduit intérieur en béton','ml','L','Composant intérieur visé par NF EN 1857 cité dans le livre.','Définir système complet, performances et assemblage ; ne pas substituer la seule norme du composant à celle de l’ouvrage.','L3:98'),
 ('Enveloppe externe en béton','ml','L','Enveloppe externe visée par NF EN 12446 citée dans le livre.','Définir compatibilité avec le conduit intérieur et l’isolant.','L3:98'),
 ('Enveloppe externe en terre cuite','ml','L','Enveloppe externe visée par NF EN 13069 citée dans le livre.','Définir système et raccords compatibles.','L3:98'),
 ('Conduit de fumée métallique','ml','L','Conduit métallique simple ou double paroi, type {{type_conduit}}.','Marquage décrit selon NF EN 1856-1/2 ; pièces de raccordement, brides et supports du fabricant, traversées avec pièces adaptées, libre dilatation et distances de sécurité ; éléments accessibles et démontables pour ramonage.','L3:118-121,127'),
 ('Conduit départ sol','ml','L','Conduit dont le pied repose sur une assise.','Prévoir boîte à suie, trappe de ramonage et ouverture ou té de raccordement ; té de purge éventuel suivant appareil.','L3:99,108,112'),
 ('Conduit départ console','ml','L','Conduit dont le pied repose sur une console.','Assurer stabilité et libre dilatation ; boîte à suie, accès de visite et raccordement adaptés.','L3:99,108,112'),
 ('Conduit départ plafond','ml','L','Pied de conduit en attente sous plafond.','Déboucher dans l’intégralité de sa section extérieure dans le local de l’appareil ; pièce de jonction exclue du volume d’un faux-plafond dans le cours.','L3:99,108,112-113'),
 ('Assise en maçonnerie ou béton armé','U','N','Base reprenant la charge du conduit.','Définir géométrie, support et liaisons ; ne pas compter à nouveau dans les planchers ou fondations.','L3:101,107,123'),
 ('Ceinture en béton armé dans le plancher','U','N','Assise du conduit dans l’épaisseur du premier plancher.','Définir section, armatures et stabilité du système.','L3:101'),
 ('Support ou chaise métallique de conduit','U','N','Support métallique scellé dans le mur d’adossement.','Définir section, fixation, protection et reprise de charge.','L3:101,107,123'),
 ('Ceinture en fer feuillard ou collier de stabilité','U','N','Liaison à la paroi pour stabilité d’un conduit adossé.','Conserver la libre dilatation et définir protection anticorrosion, dimensions et scellements suivant système.','L3:107,116,123-124'),
 ('Chevêtre et traversée de plancher ou toiture','U','N','Ouvrage horizontal permettant la traversée du conduit.','Prévoir stabilité, distance aux combustibles, libre dilatation, absence de piège à calories, plaques et pièces coupe-feu du système ; le détail ancien de 16 cm du plancher bois ne constitue pas une règle universelle.','L3:102,111-113,118-119,123'),
 ('Souche maçonnée hors toiture','U','N','Partie extérieure ou habillage d’un ou plusieurs conduits.','Assurer résistance mécanique et au vent, étanchéité à la pluie, hauteur de débouché selon configuration et détail de couverture.','L3:101,108-109,123'),
 ('Souche métallique ou préfabriquée','U','N','Habillage métallique ou préfabriqué de la partie hors toiture.','Définir résistance au vent, étanchéité, supports et compatibilité du système.','L3:109,123,127'),
 ('Enduit sur souche de conduit','m2','S','Enduit de protection ou de finition de la souche.','Vérifier les joints, ôter les balèvres, employer mortier à l’extérieur ; plâtre interdit sur faces externes. Grillage protégé contre corrosion ou treillis de verre traité contre alcalis suivant support.','L3:109,123,125'),
 ('Couronnement en béton','U','N','Dalle ou couronne ceinturant le débouché, avec larmier périphérique.','Dessus en pente rejetant l’eau vers l’extérieur, goutte d’eau en sous-face ; béton légèrement armé en exécution sur chantier, fixation du préfabriqué au dernier boisseau.','L3:101,123,125'),
 ('Couronnement en briques','U','N','Variante de couronnement citée dans la liste et l’exemple de souche en briques.','Définir rangs saillants, dalle ou finition supérieure, pente et raccords.','L3:123,126'),
 ('Mitron','U','N','Dispositif terminal posé ou scellé au couronnement.','Choisir le dispositif suivant conduit et tirage ; dimensions et fixation à définir.','L3:102,123'),
 ('Aspirateur statique de conduit','U','N','Terminal favorisant la vitesse d’éjection des fumées.','Définir modèle compatible et pose ou scellement sur couronnement.','L3:102,123,125'),
 ('Chapeau pare-pluie','U','N','Terminal de protection du conduit.','Définir compatibilité, fixation et entretien suivant système.','L3:102,127'),
 ('Extracteur stato-mécanique de conduit','U','N','Dispositif terminal mécanique cité parmi les couronnements.','Caractéristiques et asservissement à préciser ; pas de dimensionnement automatique à partir de la seule citation.','L3:102'),
 ('Virole, manchette et tampon','U','N','Accessoire de raccordement en attente, avec ou sans tampon.','Définir diamètre, matériau, boisseau spécial, scellement et raccord d’enduit.','L3:123,125-126'),
 ('Trappe ou tampon de ramonage','U','N','Accès permettant entretien et évacuation des suies.','Définir emplacement accessible, cadre, fermeture, matériau et scellement ; bavette extérieure si nécessaire.','L3:102,123,126'),
 ('Plaque signalétique du conduit','U','N','Plaque d’identification et de performances de l’ouvrage.','Matériau inaltérable, fixation durable et visible ; mentionner désignation, composants, installateur, fabricants, date et indication d’entretien décrite dans le cours.','L3:102,123'),
 ('Modérateur de tirage','U','N','Accessoire cité dans la liste des ouvrages.','Caractéristiques et position à définir ; aucune clause constructive détaillée dans le passage.','L3:123'),
 ('Carneau','ml','L','Conduit d’allure horizontale reliant les raccordements au conduit de fumée.','Définir tracé, matériau, accès de ramonage et raccords.','L3:103'),
 ('Chemisage de conduit existant','ml','L','Application d’un enduit spécial sur toute la hauteur intérieure du conduit existant.','Réparation laissant au conduit sa désignation initiale dans le cours ; diagnostic et procédé à définir.','L3:103'),
 ('Tubage de conduit existant','ml','L','Introduction d’un tube indépendant à l’intérieur d’un conduit existant.','Définir matériau, section, accessibilité et raccordements suivant appareil et système ; distinguer du chemisage.','L3:103'),
 ('Conduit de désenfumage de type shunt','ml','L','Conduit collectif avec raccordements individuels d’étage de même section.','Les dimensions habituelles sont des exemples du cours ; implantation, section et exigences de sécurité à définir dans le dossier.','L3:122')]
for i,(title,unit,formula,desc,exe,pages) in enumerate(fum,1):
 work('04',f'FUM-{i:03}','Conduits et accessoires' if i<19 else 'Souches — Traversées — Entretien',title,unit,formula,GENERAL if not unit else AREA if unit=='m2' else COUNT if unit=='U' else LINE,desc,exe,pages,SMOKE,kind='technologie_sans_clause_cctp' if i in [3,7,8,9,10,28,32,36] else 'trame_et_technologie')
# LOT 05 — VENTILATION.
VENT=['XP P 50-410 — DTU 68.1','NF P 50-411 — DTU 68.2','FD CEN/TR 14788']
vent=[
 ('Hypothèses et principe de ventilation',None,None,'Définir objectifs, débits, stratégie naturelle ou mécanique, mode de commande et implantation.','Formuler les hypothèses, déterminer les performances, choisir la stratégie, implanter entrées et sorties puis dimensionner bouches, conduits, transferts et ventilateurs ; références du document pédagogique ancien.','L3:131-134,140,151,154'),
 ('Ventilation par pièces séparées','Ens','N','Ventilation de chaque pièce par ses propres entrées et sorties.','Définir nature, section, débit et position des orifices ; ne pas confondre avec le balayage général.','L3:133'),
 ('Ventilation générale par balayage','Ens','N','Entrées d’air dans les pièces principales et extraction dans les pièces de service.','Assurer les transferts entre pièces et définir débits et dispositifs.','L3:133-134'),
 ('Ventilation naturelle par tirage thermique','Ens','N','Système dont les moteurs sont différence de température et vent.','Définir entrées, bouches, conduits individuels ou shunt et terminaux ; tracés et dévoiements adaptés.','L3:144-145,154'),
 ('Ventilation mécanique simple flux individuelle','Ens','N','Extraction mécanique depuis pièces humides et amenée d’air neuf dans chambres et séjours.','Définir groupe, conduits, entrées d’air, bouches, commande, accès et sortie de toiture ; réduire transmission des bruits et vibrations.','L3:145-146,154,156'),
 ('Ventilation mécanique simple flux collective','Ens','N','Réseau desservant plusieurs logements par colonnes, collecteurs et extracteurs.','Définir débits, implantation en terrasse, accès, cheminements, piquages et interfaces ; dimensionner suivant le volume d’air à extraire.','L3:147-148,154,156'),
 ('VMC simple flux hygroréglable type Hygro A','Ens','N','Bouches d’extraction hygroréglables associées à des entrées d’air autoréglables.','Modulation suivant humidité à l’extraction ; système, performances et Avis Technique à préciser.','L3:136,149'),
 ('VMC simple flux hygroréglable type Hygro B','Ens','N','Bouches d’extraction et entrées d’air hygroréglables.','Définir système et plages de fonctionnement selon étude et procédé.','L3:136,149'),
 ('Ventilation mécanique double flux','Ens','N','Deux réseaux : extraction de l’air vicié et insufflation d’air neuf, reliés à un bloc de récupération et filtration.','Définir échangeur, filtres, réseaux, bouches, implantation et entretien ; le gain énergétique de 70 % mentionné dans le cours n’est pas un rendement garanti au projet.','L3:149-150'),
 ('Ventilation double flux thermodynamique','Ens','N','Double flux avec échangeur thermodynamique pour récupération et complément de chauffage ou rafraîchissement.','Définir équipements, débits, filtration, régulation et implantation ; performances suivant étude du système.','L3:150'),
 ('Entrée d’air fixe','U','N','Orifice fixe d’amenée d’air.','Définir section et position, protection contre pluie et pollution extérieure, démontabilité et acoustique.','L3:135'),
 ('Entrée d’air autoréglable','U','N','Section se modifiant pour limiter les variations de débit selon la pression.','Le cours définit le module sous 20 Pa et cite 22, 30 et 45 m3/h ; auvent pare-pluie, déflecteur intérieur et démontabilité pour nettoyage.','L3:135'),
 ('Entrée d’air hygroréglable','U','N','Section variant selon humidité relative de la pièce.','Caractériser type ou module ; Avis Technique du système à préciser. Ne pas confondre une section en cm2 avec un débit en m3/h.','L3:136'),
 ('Entrée d’air anti-retour','U','N','Entrée comportant un clapet évitant la sortie de l’air du logement par l’orifice.','Définir matériau, section, performances et accès ; dispositif acoustique éventuel sans modifier la caractéristique aéraulique.','L3:136'),
 ('Dispositif acoustique d’entrée d’air','U','N','Accessoire limitant les bruits extérieurs.','Conserver la caractéristique aéraulique de l’entrée ; performances suivant étude acoustique.','L3:136'),
 ('Transfert d’air intérieur et détalonnage','U','N','Passage d’air entre pièces au droit des portes ou par dispositif de transfert.','Position basse dans la conception décrite, coordination avec menuisier ; le cours cite un vide d’au moins 1 cm pour détalonnage, avec vigilance sur bruit et incendie.','L3:137,152'),
 ('Grille d’extraction fixe','U','N','Bouche fixe de sortie d’air.','Définir section ou débit, emplacement haut près de la source de pollution et nettoyage sans outil.','L3:137,151'),
 ('Grille d’extraction réglable manuellement','U','N','Section variable par réglage manuel.','Définir plage et débits suivant pièce ; bouches démontables pour nettoyage.','L3:137'),
 ('Bouche d’extraction autoréglable','U','N','Bouche dont la section limite les variations de débit malgré les variations de pression.','Caractériser section ou débit sous 10 Pa en ventilation naturelle ou 100 Pa en mécanique dans le cours ; accès et nettoyage sans outil.','L3:137'),
 ('Bouche d’extraction hygroréglable','U','N','Bouche dont la section varie avec l’humidité de l’air extrait.','Définir système, plage de débit, emplacement et démontabilité.','L3:137'),
 ('Conduit individuel de ventilation naturelle','ml','L','Conduit évacuant l’air d’une seule bouche.','Section, dévoiements et terminal à définir ; stabilité et raccords suivant système.','L3:138,144,154'),
 ('Conduit collectif shunt de ventilation naturelle','ml','L','Conduit collectif à raccordement individuel de hauteur d’étage.','Définir section, raccordement, assise et couronnement ; ne pas réutiliser les conduits béton perméables en VMC haute pression dans la conception décrite.','L3:138-139,144'),
 ('Conduit maçonné en boisseaux','ml','L','Conduit de ventilation naturelle en éléments maçonnés.','Décrire assise, traversées et souche comme aux conduits, sans imposer l’écart au feu d’un conduit de fumée à un conduit de ventilation seul.','L3:154-155'),
 ('Conduit rond en ciment','ml','L','Tuyaux ronds série bâtiment à emboîtement, avec coudes et tés.','Façon des joints adaptée à la ventilation, fixation par colliers suivant diamètre et fabricant.','L3:155'),
 ('Gaine verticale de ventilation mécanique','ml','L','Colonne reliant les bouches d’extraction au réseau horizontal.','Définir tôle, assemblage, étanchéité, colliers isophoniques, collecteurs d’étage, réductions et coudes, tampon de ramonage et interfaces coupe-feu.','L3:138,147,154,158'),
 ('Gaine horizontale ou traînasse','ml','L','Réseau horizontal reliant colonnes, caissons et extracteur.','Définir tracé court, pente, assemblages étanches, changements de section, tampons de ramonage et manchettes souples.','L3:138,147,152,154,158'),
 ('Conduit souple','ml','L','Conduit souple cité dans les schémas de réseau.','Définir diamètre, matériau et usage autorisé du système ; ne pas lui attribuer une résistance au feu ou une longueur admissible non donnée par le dossier.','L3:138,146'),
 ('Conduit rigide spiralé','ml','L','Conduit rigide de réseau collectif.','Définir diamètre, épaisseur, étanchéité et supports suivant étude.','L3:138,147'),
 ('Conduit calorifugé','ml','L','Conduit avec isolation, cité parmi les types de réseaux.','Préciser isolant, épaisseur et continuité suivant étude thermique et conditions du réseau.','L3:138'),
 ('Extracteur statique de ventilation naturelle','U','N','Couronnement favorisant le tirage et protégeant de la pluie et des volatiles.','Choisir les caractéristiques du terminal ; montage compatible avec conduit et appareils raccordés.','L3:139,145'),
 ('Extracteur stato-mécanique','U','N','Extracteur assisté mécaniquement pour pallier le manque de tirage naturel.','Commande selon horloge, température extérieure, combinaison des deux ou fonctionnement continu ; dispositif de sécurité des appareils raccordés à définir.','L3:139,145'),
 ('Tourelle d’extraction','U','N','Extracteur disposé au sommet du conduit.','Définir débits, pression, accès, fixation et traitement acoustique.','L3:138-139'),
 ('Caisson d’extraction individuel','U','N','Groupe moto-ventilateur en caisson pour logement individuel.','Implanter en comble ou faux plafond accessible, suspendu ou sur plots antivibratoires ; définir débit, raccordement électrique, commande, détection de panne et refoulement.','L3:145-146,154,159'),
 ('Caisson d’extraction collectif','U','N','Ensemble moto-ventilateur sur socle antivibratile.','Définir ventilateur, moteur, transmission, réglage, caisson, raccordement et rejet en toiture ; accès maintenance et nuisances sonores à traiter.','L3:148,152,154,159'),
 ('Sortie de toiture ou de terrasse','U','N','Dispositif de rejet de l’air extrait hors du bâtiment.','Coordonner couverture ou étanchéité, fixation et pare-pluie ; éviter reprise d’air vicié vers les prises d’air et les bâtiments voisins.','L3:148,152,154'),
 ('Manchette souple et anti-vibratile','U','N','Liaison de réseau ou d’extracteur limitant transmission vibratoire.','Définir diamètres, matériau et étanchéité ; prévoir pièces adaptées au système.','L3:147,157-158'),
 ('Clapet coupe-feu de réseau','U','N','Dispositif cité pour traversées de parois ou planchers coupe-feu.','Le seuil de diamètre 150 mm appartient à l’exemple du cours ; ne pas en déduire une règle actuelle universelle. Exigences du dossier incendie à vérifier.','L3:158'),
 ('Tampon et trappe de ramonage du réseau','U','N','Accès de nettoyage en pied de colonne, aux changements de direction et sur réseaux horizontaux.','Définir accessibilité depuis les trappes de menuiserie et implantation ; le cours cite un accès sur tronçon rectiligne de plus de 10 m dans l’exemple.','L3:158'),
 ('Raccordement électrique et sécurité de ventilation','Ens','N','Alimentation des moteurs et organes électriques à partir des attentes de l’électricien.','Définir interrupteur d’arrêt, mise à la terre des masses, plans et schémas, alarme de défaut et thermostat incendie suivant installation.','L3:152,154,160'),
 ('Dépressostat et alarme de panne','U','N','Détection de défaut de fonctionnement de l’extraction.','Définir capteur, report sonore et lumineux, annulation sonore et raccordements.','L3:159-160'),
 ('Thermostat incendie en amont du ventilateur','U','N','Dispositif coupant le moteur et déclenchant l’alarme en cas d’élévation anormale de température, dans l’exemple.','Caractéristiques, implantation, logique de sécurité et raccords à définir au dossier.','L3:160')]
for i,(title,unit,formula,desc,exe,pages) in enumerate(vent,1):
 group='Ventilation — Systèmes' if i<=10 else 'Ventilation — Entrées et bouches' if i<=20 else 'Ventilation — Réseaux et équipements'
 work('05',f'VEN-{i:03}',group,title,unit,formula,GENERAL if not unit else LINE if unit=='ml' else COUNT,desc,exe,pages,VENT)
# EXEMPLES CCTP : variantes chiffrées isolées des trames par la nature de fiche.
EXCOUNTS={}
def example(n,base,original,title,desc,exe,pages,group=''):
    src=next(o for o in LOTS[n]['ouvrages'] if o['code']==base)
    EXCOUNTS[n]=EXCOUNTS.get(n,0)+1
    prefix={'02':'GO','03':'FAC','04':'FUM','05':'VEN'}[n]
    code=f'{prefix}-X{EXCOUNTS[n]:03}'
    p=next(p for p in PROOFS['ouvrages'] if p['code']==base)
    work(n,code,group or 'Exemples CCTP — '+p['sous_lot'],title,src['unite'],src['formule_defaut'],src['regle_metre']['vides_pour_pleins'],
         desc,exe,pages,src['clause_cctp']['normes_dtu'],kind='exemple_pedagogique_donnees_fixes',original=original,
         note='Exemple du cours : chiffres, matériaux, références et variantes à adapter au dossier ; aucune valeur n’est un défaut universel.')
    pp=PROOFS['ouvrages'][-1]
    pp['references']=list({(r['livre'],r['page_cours']):r for r in pp['references']+p['references']}.values())
    return LOTS[n]['ouvrages'][-1]
example('02','GO-F01','01.02.01','Fondations — Généralités de l’exemple',
 'Caractéristiques du terrain déterminées par sondages et essais ; l’exemple propose une contrainte maximale de 0,2 MPa uniquement si confirmée par le rapport de sol.',
 'Définir niveau d’assise, cote hors gel régionale, référence ±0,000 au plancher bas fini du RDC et correspondance NGF. Décrire le système retenu : semelles filantes ou isolées, longrines, puits ou autre. Ne conserver que les renseignements non déjà décrits aux terrassements.',
 'L1:167')
example('02','GO-F01','01.02.02','Fondations — Objet du marché de l’exemple',
 'Exemple situé à Boulogne-Billancourt, Hauts-de-Seine (92), Île-de-France, environnement de gel modéré éloigné de la mer.',
 'Préciser objet de l’ouvrage. L’exemple indique consistance S3, absence d’agressivité chimique du sol/eaux, de chlorures non marins et d’agressivité particulière. Ces paramètres sont ceux du dossier pédagogique et doivent être remplacés par {{parametres_projet}}.',
 'L1:167')
refs_found=['NF P 03-001 (décembre 2000)','NF EN 206-1 et annexe nationale','NF EN 12350-1','NF EN 12350-2','NF EN 12350-6','NF EN 12350-7','NF EN 12390-1','NF EN 12390-2','NF EN 12390-3:1999','NF EN 12390-6','NF EN 12390-7','DIN 4030-2','ISO 4316','FD P 18-011','NF EN 197-1','NF EN 12620','NF EN 934-2','NF EN 1008','NF P 18-201 — DTU 21','NF P 18-210 — DTU 23.1','FD P 18-503','NF EN 12504-2','prNF EN 13791']
o=example('02','GO-F01','01.02.03','Fondations — Documents de référence cités',
 'Documents de référence reproduits dans l’exemple de fondations : '+ '; '.join(refs_found)+'.',
 'Le cours renvoie aux normes de spécification et essais des bétons, ciments, granulats, adjuvants et eau de gâchage, aux environnements agressifs et aux parements. Ces références, dont un projet de norme, sont conservées comme celles de l’édition 108-4 et ne sont pas déclarées actuelles.',
 'L1:168');o['clause_cctp']['normes_dtu']=refs_found
for title,resistance,exposure,chloride,dose,nature in [
 ('Béton non armé de fondation coulé à sec','C16/20','X0','1,0',200,'sans armatures'),
 ('Béton non armé de fondation coulé dans l’eau','C16/20','X0','1,0',300,'sans armatures'),
 ('Béton avec armatures de chaînage coulé à sec','C20/25','XC1','0,40',250,'avec uniquement armatures de chaînage'),
 ('Béton avec armatures de chaînage coulé dans l’eau','C20/25','XC1','0,40',350,'avec uniquement armatures de chaînage'),
 ('Béton armé de fondation coulé à sec','C20/25','XC1','0,40',300,'avec armatures de structure'),
 ('Béton armé de fondation coulé dans l’eau','C20/25','XC1','0,40',400,'avec armatures de structure')]:
 o=example('02','GO-F13','01.02.04',title+' — exemple',
  f'BPS NF EN 206-1 {resistance} {exposure} S3 cl {chloride}, Dmax {{Dmax}} ; dosage minimal en liant équivalent {dose} kg dans la désignation du cours.',
  'Production selon NF EN 206-1 et mise en œuvre selon NF P 18-201 (DTU 21), telles que citées. Ne conserver que les bétons utiles au projet. Pour les deux variantes avec seules armatures de chaînage, aucune armature de structure n’est admise dans cette description. Conditions de coulage et nature : '+nature+'.','L1:169')
 o['clause_cctp']['normes_dtu']=BA+['DTU 13.11']
example('02','GO-F12','01.02.05','Béton de propreté dosé à 150 ou 200 kg — exemple',
 'Béton de gravillons de propreté dosé à 150 kg minimum ou 200 kg de ciment CEM II/B.',
 'Coulage à pleine fouille, épaisseur minimale de 4 cm, largeur identique aux semelles ; localisation {{localisation}}.','L1:170')
example('02','GO-F13','01.02.06','Semelle filante en béton ordinaire — exemple',
 'Béton ordinaire suivant la désignation de béton du dossier ; le texte distingue terrain sec ou coulage dans l’eau et cite 800 l de gravillon 5/25.',
 'Niveler le fond et purger les points durs ; prévoir pente de 2 à 5 % pour écoulement des eaux. Couler à pleine fouille peu après les terrassements ou entre coffrage ordinaire suivant solution.','L1:170')
example('02','GO-F14','01.02.07','Semelle filante armée — exemple à ratio 25 ou 30 kg/m3',
 'Béton pour béton armé selon caractéristiques générales. Ratio de l’exemple : 25 ou 30 kg d’acier par m3, à choisir et à justifier.',
 'Armatures sur forme de propreté, enrobage de 3 cm, attentes pour porteurs verticaux ; coulage à pleine fouille peu après terrassement ou entre coffrages ordinaires ; vibrage à prévoir.','L1:170')
example('02','GO-F15','01.02.08','Semelle isolée armée — exemple',
 'Béton pour béton armé ; aciers HA suivant ingénieur BA, ou forfait pédagogique sur base moyenne 25 à 30 kg/m3.',
 'Coffrage des joues, armatures sur forme de propreté avec enrobage au moins 3 cm, coulage et vibrage. Exemple de localisation : sous poteaux de la structure du sous-sol.','L1:170')
example('02','GO-F25','01.02.09','Muret en béton — exemple',
 'Muret de soubassement en béton, épaisseur {{ep}}.',
 'Coffrage ordinaire avec pose et décoffrage, armature minimale par treillis soudé, attentes aux ouvrages supérieurs, coulage entre banches et vibrage soigné à l’avancement ; réservations de canalisations et trémies, arase dressée pour coupure de capillarité et ragréage des faces vues.','L1:171')
example('02','GO-F26','01.02.10','Muret en BBM pleins 20 × 20 × 40 — exemple',
 'BBM pleins de module proposé 20 × 20 × 40 cm, mur de 0,20 m d’épaisseur.',
 'Mortier bâtard dosé à 250 kg de CEM II/B et 200 kg de chaux par m3 de sable 0/3 ; joints décalés ; face extérieure à enduire et joints refoulés en montant à l’intérieur ; réservations, arase au mortier bâtard et chaînages verticaux/horizontaux dans blocs spéciaux.','L1:171')
example('02','GO-F27','01.02.11','Muret en pierre ou moellons — exemple',
 'Pierre, moellons ou meulières très durs, épaisseur proposée 0,40 m ou autre ; appareillage opus incertum ou mosaïque.',
 'Hourdage au mortier de CEM II/B dosé à 350 kg/m3 de sable ; une face alignée jusqu’au TN ou deux jusqu’au sommet ; parement éclaté des faces vues ; dégradation du mortier de pose et rejointoiement au mortier gras 600 kg/m3 ; passages et réservations ; arase au mortier.','L1:171')
example('02','GO-F17','01.02.12','Longrine de liaison armée — exemple à ratio 40 à 60 kg/m3',
 'Béton pour BA ; armatures HA suivant l’étude ou forfait pédagogique basé sur 40 à 60 kg/m3.',
 'Coffrage courant des joues ; armatures sur forme de propreté liées aux têtes de pieux ou puits, enrobage minimal de 3 cm, attentes pour porteurs verticaux ; béton entre coffrages vibré soigneusement ; arase dressée pour voiles. Localisation-type : entre appuis à l’aplomb de la trame des voiles porteurs.','L1:172')
example('02','GO-P20','01.02.13','Puits en gros béton — exemple',
 'Gros béton dosé selon charge, exemple à 200 kg de CEM II/B ou CEM III/C pour 650 l de cailloux 20/40, 350 l de gravillons 5/20 et 300 l de sable 0/5.',
 'Blindage supérieur ou toute hauteur par planches de 27 mm et cerces métalliques pour puits circulaire, ou traverses bois ; blindage récupéré ou perdu au bétonnage. Curage du fond, tube plongeur et vibrage à l’avancement ; armatures HA en tête pour liaison aux longrines suivant ingénieur. Localisation-type : angles, intersections ou points d’appui isolés.','L1:172')
# Protections contre l’humidité : les variantes restent séparées.
for support,base,orig in [('voile béton','GO-E09','01.04.01'),('maçonnerie','GO-E09','01.04.02')]:
 example('02',base,orig,'Arase bitume armé 40 TV sur '+support+' — exemple',
  'Coupure de capillarité par chape bitume armé type 40 TV.',
  ('Chape refluée en tête du voile.' if support=='voile béton' else 'Chape de tête au mortier dosé à 300 kg/m3 de sable 0/3, épaisseur 2 cm et finition finement talochée.')+
  ' Recouvrement des lés 20 cm minimum ; chape de protection éventuelle en mortier dosé à 300 kg/m3 de sable 0/2, parfaitement dressée. Ciment et localisation à confirmer au dossier.',
  'L2:33')
 example('02','GO-E08',orig,'Arase mortier hydrofuge sur '+support+' — exemple',
  'Mortier dosé à 500 kg de CEM II/B par m3 de sable 0/3, épaisseur 2 cm.',
  'Hydrofuge selon fabricant et surface parfaitement dressée ; localisation {{localisation}}.','L2:33')
 example('02','GO-E10',orig,'Arase par film polyane sur '+support+' — exemple',
  'Film polyane de 200 microns, solution limitée dans le cours au plancher bas du RDC constitué par dallage.',
  ('Chape refluée en tête du voile.' if support=='voile béton' else 'Chape de tête au mortier dosé à 300 kg de CEM II/B par m3 de sable 0/3, épaisseur 2 cm, finition finement talochée.')+
  ' Continuité du film entre dallage et muret, recouvrement des lés de 20 cm minimum.','L2:33-34')
for support,orig in [('voile béton','01.04.03'),('maçonnerie','01.04.04')]:
 prep='Ragréer, reboucher bullages au mortier, enlever balèvres et combler les manques de béton analogue.' if support=='voile béton' else 'Racler le mortier de pose, joints garnis en montant ; enduit de dressage à 300 kg/m3 de sable 0/3 si le support est irrégulier.'
 example('02','GO-E06',orig,'Écran EIF sur '+support+' — exemple','Écran vertical obtenu par enduit d’imprégnation à froid.',
  prep+' Appliquer deux couches croisées d’EIF et arrêter au moins 15 cm au-dessus du sol.','L2:34')
 example('02','GO-E05',orig,'Écran mortier hydrofuge sur '+support+' — exemple',
  'Enduit au mortier dosé à 500 kg de CEM II/B par m3 de sable 0/3 avec hydrofuge selon fabricant.',
  prep+' Produit d’imprégnation pour adhérence ; épaisseur 2,5 à 3 cm sur béton ou 3 cm sur maçonnerie ; arrêt au moins 15 cm au-dessus du sol.','L2:34')
for base,orig,title,desc,exe in [
 ('GO-D02','01.05.01','Hérisson 20 cm et sable 5 cm — exemple','Hérisson en pierres de 20 cm d’épaisseur.','Mise en place soignée et compactage ; couche de sable de 5 cm en partie supérieure.'),
 ('GO-D04','01.05.02','Forme tout-venant et isolant périphérique — exemple','Forme en tout-venant, sablon ou mâchefer.','Éliminer gros éléments et compacter ou damer. Éventuellement sous local chauffé, polystyrène de 5 cm sur bande périphérique de 1,50 m ; le texte technologique signale par ailleurs les risques de tassement différentiel de cette solution.'),
 ('GO-D09','01.05.03','Film polyane 150 microns — exemple','Coupure de capillarité en film polyane 150 microns sur la forme.','Recouvrement des lés 20 cm mini, relèvement aux rives contre murs et précautions contre perforation au coulage et à la pose du treillis.'),
 ('GO-D13','01.05.04','Dalle béton C20/25 — exemple','BPS NF EN 206-1 C20/25 XC1 S3 cl 0,40, Dmax 22,4 mm.','Coffrage soigné aux ouvertures et ragréage ; épaisseur et treillis selon partie de DTU 13.3 citée, renforts aux charges localisées suivant étude ; finition par chape rapportée, refluée ou incorporée ; joints de retrait et d’isolement à définir.'),
 ('GO-D19','01.05.05','Chape incorporée 2 à 3 cm — exemple','Mortier dosé à 400 ou 450 kg de CEM II/B par m3 de sable 0/5, épaisseur 2 à 3 cm.','Sur béton frais, finition lissée ; exemple de planéité 10 mm sous 2 m et 3 mm sous 20 cm ; niveau d’arase à compléter.'),
 ('GO-D20','01.05.06','Chape rapportée 2 à 3 cm — exemple','Mortier dosé à 500 kg de CEM II/B par m3 de sable 0/2, épaisseur 2 à 3 cm.','Nettoyer le support, finition lissée ; exemple de planéité ±6 mm sous 2 m et 3 mm sous 20 cm ; niveau d’arase à compléter.')]:
 example('02',base,orig,title,desc,exe,'L2:35-36')
# Exemples de parois et de structure.
example('02','GO-V01','01.06.01','Mur en béton banché — exemple',
 'BPS NF EN 206-1 C20/25 XC1 S3 cl 0,40 Dmax 22,4, ou C25/30 XF1 S3 cl 0,40 ; épaisseur et hauteur à préciser.',
 'Armatures selon ingénieur BA, exemple minimal d’une nappe extérieure avec enrobage 2 cm. Nettoyer/huiler banches, réserver baies et trous par mannequins, poser gaines et fourreaux, caler et régler. Couler sans reprise par couches continues de 20 à 30 cm avec vibrage ; nettoyer après décoffrage. Ragréer manques, recouper ou meuler balèvres, ou laisser brut selon parement ; planéité DTU 23.1. En infrastructure seulement, chape refluée en tête pour coupure de capillarité.','L2:72')
example('02','GO-V02','01.06.02','Mur en BBM creux 20 × 20 × 50 — exemple',
 'BBM creux 20 × 20 × 50 cm, montés en 0,20 m d’épaisseur.',
 'Blocs sans fissures, cassures ou épaufrures ; humidifier en saison chaude. Mortier dosé à 350 kg de CEM II/B par m3 de sable 0/5 ; passages ventilation, gaines et réseaux ; face extérieure destinée à recevoir un revêtement ; blocs spéciaux pour chaînages et linteaux, feuillures pour dormants encastrés, calfeutrement des menuiseries au mortier dosé à 300 kg/m3 de sable 0/3.','L2:73')
example('02','GO-V04','01.06.03','Mur en briques pleines de parement — exemple',
 'Briques de Vaugirard en parement et briques ordinaires en contre-parement, moule 60 × 110 × 220 mm ; épaisseur citée 0,34 m.',
 'Refuser briques épaufrées, humidifier par trempage ; appareillage à choisir. Variante ciment 350 kg/m3 de sable 0/3, joints 10 mm ; le texte donne aussi des variantes bâtard et chaux dont le dosage doit être clarifié au projet. Parement apparent rejointoyé au mortier gras 500 kg/m3 de sable 0/2 après piquage du mortier de pose ; faces dressées, joints alignés, nettoyage avant séchage, contre-parement jointoyé en montant.','L2:73')
example('02','GO-V05','01.06.04','Mur en briques creuses — exemple',
 'Briques à perforations verticales 200 × 200 × 400 mm, montées en 0,20 m ; variantes à rupture de joint ou type G citées.',
 'Éléments sans défauts apparents suivant NF P 13-301 citée, humidification suivant absorption en saison chaude. Mortier bâtard 175 kg de CEM II/B et 175 kg de chaux XHE par m3 de sable 0/3 ; blocs spéciaux pour chaînages/linteaux, revêtement ou joints refoulés suivant choix, feuillures éventuelles et calfeutrement au mortier bâtard.','L2:74')
o=example('02','GO-V08','01.06.05','Mur en béton cellulaire à coller — exemple',
 'Blocs à coller de densité indiquée 450 daN/m3, consommation citée de 6,5 blocs par m2.',
 'Mortier-colle, joints au plus 3 mm ; blocs secs, premier lit sur bain de mortier avec débord de 2 cm formant goutte d’eau. Film polyéthylène 200 microns sous les appuis béton, renfort 1 HA12 en haut de l’avant-dernier rang sous appui, ancrage de 70 cm de chaque côté. Pièces spéciales pour chaînages/linteaux, feuillures éventuelles et calfeutrement au mortier spécial. Variante à maçonner pour bâtiments industriels avec plastifiant et joints 10 mm.','L2:74')
o['regle_metre']['ratios_associes']=[{'materiau':'Blocs de béton cellulaire de l’exemple','quantite_par_unite':6.5,'unite':'U'}]
example('02','GO-V23','01.06.06','Garnissage des pointes de pignons — exemple',
 'Béton dosé à 300 kg de CEM II/B par m3.',
 'Coulage dans coffrage ordinaire, arase dressée suivant pente de toiture avec réservations pour les pannes ; coordination charpentier.','L2:74')
for desc,exe in [
 ('Béton dosé à 300 kg de CEM II/B par m3.','Coulage après pose des chevrons dans coffrage ordinaire ; arase dressée.'),
 ('Briques pleines ordinaires au mortier bâtard.','Arase dressée au mortier.'),
 ('Éléments de même nature que les parois verticales, hourdés au mortier bâtard.','Arase dressée au mortier.')]:
 example('02','GO-V24','01.06.07','Garnissage entre chevrons — variante du cours',desc,exe+' Coordination avec charpentier.','L2:75')
for title,resistance,expo in [('Béton BPS intérieur ou protégé','C20/25','XC1'),('Béton BPS humidité ou gel modéré sans déverglaçage','C25/30','XF1'),('Béton BPS gel modéré avec déverglaçage','C25/30','XF2')]:
 example('02','GO-B01','01.07.01',title+' — exemple',f'BPS NF EN 206-1 {resistance} {expo} S3 cl 0,40, Dmax 22,4.',
 'Désignation de béton du cours suivant exposition de l’ouvrage ; n’appliquer qu’aux zones correspondant au dossier.','L2:75')
example('02','GO-B16','01.07.02','Aciers principaux, cadres et étriers — exemple','Aciers HA de diamètres appropriés.','Dimensions, nuances et ferraillage selon étude de l’ingénieur BA.','L2:75')
example('02','GO-B15','01.07.03','Coffrages ordinaires ou soignés — exemple','Soignés pour ouvrages apparents ; ordinaires pour ouvrages habillés par blocs, planelles ou enduit.','Choisir la qualité selon la destination des faces, avec montage, réglage et décoffrage.','L2:75')
example('02','GO-B17','01.07.04','Finition des bétons — exemple','Réfection après décoffrage des ouvrages restant apparents.','Boucher les manques de matière avec béton analogue si nécessaire, meuler les balèvres et ragréer.','L2:75')
for base,orig,title,exe in [
 ('GO-B08','01.07.05','Chaînage horizontal avec planelles','Coffrage ordinaire extérieur, planelle brique plâtrière 5 × 20 × 40 ou habillage de même nature que la maçonnerie ; armatures selon DTU 20.1 cité ou étude, liaisons d’angles sans poussée au vide, enrobage 2 cm, coulage vibré en même temps que le plancher.'),
 ('GO-B09','01.07.06','Chaînage horizontal sans planelles','Pour refends sans risque de pont thermique : coffrage soigné extérieur, armatures selon étude ou dispositions citées, enrobage 2 cm, liaison d’angles sans poussée au vide, coulage en même temps que plancher ; décoffrage, finitions et précautions contre fissuration de l’enduit.'),
 ('GO-B10','01.07.07','Chaînage vertical dans blocs spéciaux','Armatures selon dispositions citées, enrobage 2 cm, coulage dans blocs spéciaux de même nature que le mur avec vibrage ; éviter ségrégation ; attentes aux chaînages horizontaux et autres porteurs.'),
 ('GO-B07','01.07.08','Prélinteau préfabriqué indépendant','Prélinteau BA précontraint épaisseur 0,05 m, largeur 0,20 m, longueur à définir ; appui au moins 20 cm de chaque côté sur lit de mortier. Pas d’étai dans cet exemple ; produit d’adhérence sur joue extérieure et sous-face avant enduit.'),
 ('GO-B07','01.07.09','Prélinteau formant chaînage','Même prélinteau que la variante indépendante ; si retombée sous plancher inférieure à 25 cm, couler chaînages, linteaux et compression dans une phase ; coffrage ordinaire intérieur et planelle extérieure pour pont thermique.'),
 ('GO-B06','01.07.10','Linteau en blocs U','Appui au moins 0,20 m ou 1/10 de portée selon règle générale du cours ; calage et réglage des blocs, armatures selon étude ou dispositions citées et enrobage 2 cm ; bétonnage vibré, feuillure ou blocs U feuillurés pour dormants encastrés.'),
 ('GO-B05','01.07.11','Linteau BA coffré','Appuis selon règle du cours, armatures et enrobage 2 cm ; coffrage ordinaire en sous-face et intérieur, soigné à l’extérieur ou habillage en planelles de même nature que maçonnerie ; réservations de feuillure éventuelles.'),
 ('GO-B02','01.07.12','Poteau BA de section indicative 20 × 30','Section indicative de coffrage selon plan architecte ; coffrage soigné avec chanfrein 2 × 2 cm aux arêtes saillantes, aciers HA suivant ingénieur, enrobage 2 cm ; bétonnage sans reprise avec vibrage et ragréage.')]:
 example('02',base,orig,title+' — exemple','Ouvrage en béton armé, béton BPS selon caractéristiques générales de l’exemple.',exe,'L2:76-78')
# Planchers et escaliers.
example('02','GO-H01','01.08.01','Dalle pleine BA — exemple',
 'BPS C20/25 XC1 S3 cl 0,40 Dmax 22,4 ou C25/30 XF1 ; épaisseur à choisir, exemple 0,08 à 0,22 m. Masse de 400 kg/m2 donnée dans le cours en fonction de l’épaisseur.',
 'Charges à préciser : exemples 175 daN/m2 d’exploitation et 75 daN/m2 pour sols/cloisons. Affaiblissement R et niveau brut à définir. Armatures HA, treillis et chapeaux suivant étude, enrobage 2 cm ; coffrage soigné réglé et jointif ; réservations des trémies et réseaux ; tolérances compatibles avec enduit et revêtement ; finition talochée selon destination.','L2:123')
example('02','GO-H15','01.08.02','Isolant sous-face Fibragglo 6 cm — exemple',
 'Panneaux de fibres de bois comprimées, type Fibragglo ou équivalent, épaisseur 6 cm.',
 'En fond de coffrage si plancher sur local non chauffé ou extérieur ; performances selon BET, avec références RT 2005 telles que citées dans le livre.','L2:123')
for base,orig,title,desc,exe in [
 ('GO-H02','01.08.03','Plancher poutrelles et entrevous béton 12 + 4',
  'Poutrelles en béton précontraint et entrevous béton type 12 + 4, épaisseur brute 16 cm ; béton de compression BPS C20/25 XC1 ou C25/30 XF1, S3 cl 0,40 Dmax 22,4.',
  'Système selon Avis Technique présenté ; charges, coupe-feu, U et acoustique à préciser ; pose selon système, renforcements trémies et charges localisées, réservations de gaines ; chevêtres coffrés et armés selon BET ; compression et chaînages en une phase ; béton dressé à la règle.'),
 ('GO-H03','01.08.04','Plancher poutrelles et entrevous isolants 15 + 5',
  'Plancher nervuré BA à isolation intégrée type 15 + 5 ; clavetage et compression BPS C20/25 XC1 ou C25/30 XF1, S3 cl 0,40 Dmax 22,4.',
  'Système selon Avis Technique ; préciser charges, coupe-feu, U et acoustique ; étaiement et pose selon procédé ; chevêtres BA et poutrelles d’enchevêtrure renforcées, réservations coordonnées ; chapeaux HA sur appuis et treillis selon étude ; compression et chaînages en une phase, finition réglée selon revêtement.'),
 ('GO-H04','01.08.05','Plancher semi-préfabriqué à prédalles',
  'Prédalles avec béton complémentaire ; fabrication chantier ou usine non imposée dans la clause du cours.',
  'Avis Technique, épaisseur, charges, coupe-feu, U et acoustique à préciser. Stockage/manutention selon fabricant, trémies/réseaux réservés, treillis de renfort aux joints, chapeaux sur appuis et renforts aux trémies selon BET ; compression et chaînages en une phase sur surface nettoyée et humidifiée ; joints de sous-face ragréés au produit spécial ; aucun scellement dans les prédalles.')]:
 example('02',base,orig,title+' — exemple',desc,exe,'L2:124-125')
example('02','GO-A07','01.09.01','Escalier et marches — exemple',
 'Béton de gravillons BPS C20/25 XC1 S3 cl 0,40 Dmax 22,4 ou C25/30 XF1 suivant exposition.',
 'Coulage sur fond de forme dressé et compacté ; coffrages des jouées et réservations de scellement de rampe si nécessaire. Dimensions selon plans. Choisir marches droites, balancées ou mixtes ; marches/contremarches ordinaires pour revêtement scellé, ou marches à revêtir et contremarches apparentes soignées, ou chape incorporée et contremarches apparentes. Nez arrondis ou chanfreinés, arêtes soignées au jour ; finition talochée fin, lissée ou lissée-bouchardée.','L2:126')
example('02','GO-E09','01.09.02','Arase étanche recopiée dans le chapitre Escaliers — anomalie du cours',
 'L’article 01.09.02 reprend une coupure de capillarité en bitume armé 40 TV sur voile béton, malgré son emplacement dans le chapitre Escaliers.',
 'Chape refluée en tête de mur, recouvrement des lés 20 cm mini, protection éventuelle au mortier 300 kg de CEM II/B par m3 de sable 0/2, surface dressée. Ne pas interpréter cet article comme une prescription d’escalier.','L2:126')
PROOFS['ouvrages'][-1]['correspondance_automatique']=False
# Exemples de façades : erreurs d'unités imprimées conservées et signalées.
example('03','FAC-002','01.10.01','Enduit traditionnel 3 couches — exemple avec épaisseur à clarifier',
 'Enduit exécuté au jeté, trois couches, épaisseur moyenne indiquée 20 mm.',
 'Après mise hors d’eau et stabilisation du support au moins un mois ; nettoyer, dépoussiérer et enlever les balèvres. Gobetis à 500 kg de CEM I ou CEM II/B par m3 de sable de rivière 0,25/3,15 : le texte imprime 3 à 5 cm, incohérent avec 20 mm au total ; remplacer par {{ep_gobetis_a_confirmer}} après vérification. Séchage 3 à 7 jours. Corps au mortier bâtard 250 kg de CEM I et 150 kg de chaux par m3 de sable 0,1/3,15, 5 à 15 mm, recouvrement minimal 10 mm et séchage 8 à 15 jours. Finition en liants spéciaux à 400 kg/m3 de sable 0,1/2, rustique écrasé, 3 à 5 mm. Grillage anticorrosion fixé mécaniquement sur support hétérogène, débord 15 cm de chaque côté. Conditions de température du système, humidification et protections contre soleil/dessiccation ; échantillon et couleur au choix du maître d’ouvrage.',
 'L2:166')
example('03','FAC-007','01.10.02','Enduit monocouche — exemple avec unité à clarifier',
 'Produit prêt à l’emploi, aspect gratté moyen. L’épaisseur moyenne est imprimée « 20 m » dans le livre : donnée non applicable, à remplacer par {{ep_a_confirmer}}.',
 'Coloris au maître d’ouvrage suivant échantillon ; brosser, dépoussiérer et nettoyer les éléments nuisant à l’adhérence, piquer le support trop lisse et humidifier le support sec ; deux passes selon fabricant ; arêtes et cueillies parfaitement dressées.','L2:166')
example('03','FAC-009','01.10.03','Enduit de parement monocouche projeté — exemple',
 'Enduit d’imperméabilisation et décoration, type à définir des Ets Weber & Broutin ou caractéristiques équivalentes ; deux teintes suivant calepinage de l’architecte.',
 'Avis Technique ou cahier fabricant ; brosser et dépoussiérer, éliminer huiles de décoffrage et laitance, bourrer joints et trous. Mortier de liants hydrauliques, 10 mm sur béton ; finition grattée ou lissée au choix de l’architecte.','L2:167')
example('03','FAC-013','01.10.04','Peinture sur béton extérieur — exemple',
 'Peinture à base de résine Pliolite, aspect mat.',
 'Brossage et nettoyage, fixateur de fond, deux couches de finition ; teinte au choix de l’architecte.','L2:167')
example('03','FAC-O01','01.10.05','Appui béton coulé en place — exemple',
 'Béton de gravillons dosé à 350 kg de CEM II/B, épaisseur moyenne 8 cm, saillie 5 cm et oreilles 5 cm.',
 'Engravure dans la maçonnerie, coffrage soigné, armatures nécessaires et coulage en une phase. Ragréer les faces vues ou enduit 500 kg de CEM II/B par m3 de sable fin, épaisseur 2 cm. Arêtes et cueillies dressées ; cordon d’étanchéité avant menuiserie, interface au lot concerné.','L2:167')
example('03','FAC-O02','01.10.06','Appui monolithe en terre cuite — exemple',
 'Appui en terre cuite ton champagne, destiné à rester apparent.',
 'Assise en mortier à la hauteur requise ; pose entre tableaux avec joint d’étanchéité sur la largeur ou encastrement en engravure de 40 mm minimum.','L2:167')
example('03','FAC-O03','01.10.07','Seuil en mortier — exemple',
 'Chape dosée à 500 kg de CEM II/B par m3 de sable fin, épaisseur 2 à 3 cm.',
 'Pente de 3 cm/m, surface dressée et arête arrondie tirée au fer.','L2:168')
example('03','FAC-O06','01.10.08','Couvertine aluminium laqué 15/10 — exemple',
 'Tôle pliée aluminium laqué au four de 15/10 mm minimum, protégeant acrotères enduits ou peints, avec goutte d’eau et pente intérieure.',
 'Agrafes ou tasseaux de réglage incorporés ; coulisseaux plats de dilatation aux jonctions ; profil selon détail architecte et couleur de gamme RAL. Localisation-type : hauts d’acrotères et murs de clôtures maçonnés.','L2:168')
# Exemples de fumisterie.
example('04','FUM-001','01.13.01','Conduits de fumée — Caractéristiques générales de l’exemple',
 'Références du cours : NF P 51-201/DTU 24.1 et NF EN 1443.',
 'Mâles des boisseaux vers le bas ; garnissage en plâtre pur pour conduits adossés ou accolés dans les dispositions intérieures décrites ; dévoiements par pièces spéciales au plus 20° de la verticale. Distances de sécurité selon système ; joints de conduits voisins décalés, aucun joint dans l’épaisseur du plancher, aucune intégration complète dans un mur et au moins une face accessible. Au-delà de 2,50 m en comble, ceinture fer plat anticorrosion 30 × 3 mm avec deux scellements. Débouché au moins 0,40 m au-dessus du faîtage et de parties distantes de moins de 8 m dans l’exemple, à adapter à la configuration.','L3:124')
example('04','FUM-005','01.13.02','Conduit de fumée en boisseaux béton 20 × 20 — exemple',
 'Boisseaux de béton carrés ou rectangulaires, dimensions d’exemple 20 × 20 ; classification NF EN 1443 à préciser.',
 'Montage au mortier de ciment faisant fluer les joints ; ôter le fluage intérieur à l’avancement. Parements extérieurs rejointoyés en montant si parois alvéolaires sans enduit ni enrobage. Mise en œuvre suivant DTU 24.1 cité et système retenu.','L3:124')
example('04','FUM-004','01.13.03','Conduit en boisseaux terre cuite 20 × 20 — exemple',
 'Boisseaux terre cuite de dimensions d’exemple 20 × 20.',
 'Mise en œuvre selon caractéristiques générales du chapitre ; manchette diamètre 133 mm avec tampon, acier galvanisé et scellement au mortier bâtard ; trappe de ramonage en acier.','L3:125')
example('04','FUM-020','01.13.04','Souche en prolongement des boisseaux terre cuite — exemple',
 'Partie hors toiture prolongeant le conduit intérieur en boisseaux terre cuite.',
 'Mise en œuvre selon caractéristiques générales ; hauteur hors toiture à compléter selon configuration et dossier.','L3:125')
example('04','FUM-022','01.13.05','Enduit de souche 3 couches — exemple',
 'Mortier bâtard ou ciment, enduit en trois couches de 0,02 m d’épaisseur selon le libellé du cours, armé d’un grillage noir.',
 'Mise en œuvre et finition comme façade, arêtes dressées ; laisser 0,20 m non enduit en pied pour liaison à l’étanchéité de couverture. Clarifier {{ep_totale_ou_par_couche}} plutôt que transformer silencieusement le libellé en prescription nouvelle.','L3:125')
example('04','FUM-023','01.13.06','Couronnement béton 8 cm — exemple',
 'Béton moulé dosé à 350 kg de CEM II/B ; épaisseur moyenne 8 cm et saillie 5 cm avec goutte d’eau.',
 'Coffrage soigné des chants et sous-faces apparentes, ragréage ; larmier réservé au coffrage, réservation de l’aspirateur ; chape refluée formant glacis extérieur ou enduit serré hydrofugé en pente.','L3:125')
example('04','FUM-026','01.13.07','Aspirateur statique béton à 3 éléments — exemple',
 'Aspirateur statique en béton préfabriqué, trois éléments.',
 'Pose et scellement direct sur couronnement.','L3:125')
example('04','FUM-020','01.13.08','Souche en briques apparentes — exemple',
 'Briques repressées 6 × 11 × 22 cm, mur de 0,11 m au mortier bâtard.',
 'Assise au droit de la trémie de charpente, section intérieure identique au boisseau, enduit intérieur lissé au mortier bâtard avec gorges ; parement dressé, joints creux arrondis au mortier ciment 500 kg/m3 de sable de rivière. Couronnement à trois rangs saillants 0,03 m, dalle béton non saillante en dos d’âne et chape 2 cm au mortier dosé à 500 kg de CPJ CEM II/B par m3 de sable.','L3:126')
example('04','FUM-030','01.13.09','Trappe de ramonage fonte 20 × 20 — exemple',
 'Trappe en fonte 20 × 20, cadre dormant et clef de condamnation.',
 'Scellement au mortier bâtard sur boisseau spécial ; si extérieure, bavette zinc débordant 0,03 m du nu et 0,05 m de chaque côté, scellée au-dessus de la trappe.','L3:126')
example('04','FUM-029','01.13.10','Manchette galvanisée diamètre 153 — exemple',
 'Tôle galvanisée 15/100 mm, diamètre 153 mm, tampon éventuel en attente de raccordement.',
 'Scellement au mortier bâtard avec raccord d’enduit plâtre ou mortier ; pose sur boisseau spécial.','L3:126')
example('04','FUM-011','01.13.11','Conduit métallique inox-inox ou inox-galvanisé — exemple',
 'Système inox-inox ou inox-galvanisé, classement à compléter ; diamètres intérieur/extérieur adaptés à la chaudière et isolant fibre céramique d’exemple 25 mm.',
 'Montage selon DTU 24.1 cité et fabricant, avec l’ensemble des accessoires du système et brides de sécurité ; dépassement de faîtage 40 cm dans l’exemple à adapter ; raccords de chaudière accessibles et démontables pour ramonage ; liaison à la buse par élément de diamètre et matériau appropriés, terminal pare-pluie ou autre choix et habillage de souche suivant système.','L3:127')
# Exemples de ventilation : reprises complètes des composants et interfaces.
exvent=[
 ('VEN-023','01.14.01','Ventilation naturelle en boisseaux terre cuite','Boisseaux terre cuite alvéolés normalisés, paroi 0,05 m, hauteur 0,25 ou 0,33 m.',
 'Mortier bâtard 200 kg de CEM II/B et 200 kg de chaux par m3 de sable sec ; bourrer extérieurement, lisser les joints à l’intérieur à l’avancement et enlever balèvres ; joints 5 à 8 mm. Enduit intérieur plâtre sur boisseaux ou jointoiement à l’avancement ; départ 0,30 m sous plafond avec pièce à trou et manchette de diamètre à préciser ; assise sur cornières 40 × 40 × 4 mm, deux scellements 0,20 m et protection anticorrosion.',155),
 ('VEN-024','01.14.02','Ventilation naturelle en tuyaux ronds ciment','Tuyaux ronds ciment série bâtiment à emboîtement, référence NF P 16-302 dans le cours.',
 'Comprendre coudes, tés et raccords ; joints adaptés à la ventilation selon fabricant ; colliers acier galvanisé de diamètre 100 mm ou 125, 150, 175, 200 mm suivant choix.',155),
 ('VEN-011','01.14.03','Entrée d’air par traversée de mur','Orifice réservé dans béton banché ou tuyau ciment/PVC scellé dans maçonnerie ; épaisseur et section effective à compléter.',
 'Performance acoustique suivant RA 2000 citée ; grille extérieure fixe pare-pluie avec moustiquaire en métal non oxydable dans cette variante ; grille intérieure PVC ronde, carrée ou rectangulaire, fixe ou démontable, réglable ou non.',155),
 ('VEN-011','01.14.04','Grille d’entrée d’air à lames pare-pluie','Métal ferreux, inoxydable ou laiton, section effective à préciser.',
 'Performance acoustique RA 2000 citée ; cadre en profilés de sections adaptées et lames inclinées soudées ; scellement à pattes non apparentes ; maillage moustiquaire non oxydable dans cette variante.',156),
 ('VEN-005','01.14.05','Principe VMC individuelle simple flux','Installation individuelle simple flux de type à préciser.',
 'Extracteur en comble perdu et cheminement sur faux plancher ; colonnes dans gaines techniques, dérivations et piquages horizontaux depuis toutes pièces humides ; air neuf par coffres de volets roulants ou haut de menuiseries extérieures.',156),
 ('VEN-006','01.14.06','Principe VMC collective simple flux','Installation collective simple flux de type à préciser.',
 'Extracteurs en terrasse haute, accessibles par lanterneau du dernier palier ; gaines techniques des appartements, dérivations et piquages des pièces humides ; air neuf par coffres de volets ou haut de menuiseries.',156),
 ('VEN-012','01.14.07','Bouches d’entrée d’air de VMC','Entrées autoréglables ou hygroréglables suivant études thermique et acoustique à charge de l’entreprise.',
 'Fourniture au présent lot, pose aux lots menuiseries acier/PVC ; dispositif de réglage et déflecteur, moustiquaires interdites en site urbain dans cet exemple. Débits cités 30 m3/h par chambre et 60 m3/h par séjour ; façade 30 dB suivant références acoustiques du cours. Ne pas fusionner cette variante avec les grilles munies de moustiquaires des articles 01.14.03/04.',157),
 ('VEN-019','01.14.08','Bouches d’extraction de VMC','Bouches autoréglables ou hygroréglables Aldes ou caractéristiques équivalentes selon étude.',
 'Dans cuisines, salles de bains, salles d’eau et WC ; débits selon dossier. Raccords aux colonnes par manchettes tôle galvanisée et anti-vibratiles, annelées souples au raccord ; performances acoustiques suivant arrêtés du 30 juin 1999 cités.',157),
 ('VEN-025','01.14.09','Gaine verticale galvanisée de VMC','Gaines circulaires tôle galvanisée de classe M0 dans l’exemple ; encloisonnement et recoupement coupe-feu par gros œuvre.',
 'Tampon de ramonage bas accessible depuis trappe du menuisier, collecteur à chaque étage, réductions/cônes/coudes ; emboîtement bout à bout et bande adhésive résistante, colliers à bagues isophoniques. Clapets aux gaines de diamètre au moins 150 mm traversant parois/planchers coupe-feu dans cette clause ancienne, à confronter au dossier incendie.',158),
 ('VEN-026','01.14.10','Gaine horizontale galvanisée de VMC','Gaines circulaires reliant caissons de sortie et extracteur.',
 'Pente 3 % vers extracteur ; tampons aux changements de direction et parties rectilignes de plus de 10 m ; section changée en amont des confluences ; emboîtement étanche par bande adhésive résistante ; manchettes souples à l’extracteur.',158),
 ('VEN-033','01.14.11','Caisson d’extraction individuel — exemple','Ventilateurs centrifuges double ouïe en combles ou au-dessus des WC, suspendus à la charpente avec plots antivibratoires ; VIM ou qualité équivalente.',
 'Débit d’exemple calculé sur maxima d’extraction avec 10 % de fuite ; bloc tôle galvanisée insonorisée ; alimentation à partir des attentes électricité, commande depuis coffret de disjoncteurs accessible par trappe ; détection de panne et refoulement hors caisson vers sortie toiture.',159),
 ('VEN-034','01.14.12','Caisson d’extraction collectif — exemple','Aldes ou qualité équivalente en caisson sur socles antivibratiles.',
 'Ventilateur centrifuge double ouïe à turbine à ailettes, moteur sur roulements et quatre supports élastiques réglables par glissières, transmission par courroies trapézoïdales et poulie motrice variable ; caisson tôle galvanisée avec deux couches antirouille ; rejet vertical en terrasse ; moteur de rechange et courroie de secours par type.',159),
 ('VEN-039','01.14.13','Électricité, alarme et sécurité VMC — exemple','Alimentation des moteurs et organes de groupe depuis les attentes à proximité des extracteurs, interrupteur d’arrêt compris.',
 'Mise à la terre de toute masse métallique depuis barrette près de boîte de dérivation ; plans et schémas. Dépressostat Georgin ou équivalent dans chaque caisson, report sonore et lumineux avec annulation sonore au tableau d’alarme du sous-sol ; thermostat incendie en amont du ventilateur coupant le moteur et déclenchant alarme en température anormale.',160)]
for base,orig,title,desc,exe,page in exvent:example('05',base,orig,title,desc,exe,f'L3:{page}')
# FORMULES : les formalismes géométriques sont distingués des relations imprimées.
form('GO_SEMELLE_VOLUME','Volume net de semelle filante','02',['L','b','H','V_vides'],'L * b * H - V_vides','m3','Section constante ; longueur corrigée des angles/intersections et vides explicités.','L1:31-34,165,170')
form('GO_SEMELLE_ISOLEE','Volume de semelles isolées identiques','02',['N','a','b','H'],'N * a * b * H','m3','Semelles parallélépipédiques identiques ; ne vaut pas pour une semelle en glacis ou de géométrie différente.','L1:151,165,170')
form('GO_PIEU_CYLINDRIQUE','Volume géométrique de pieu ou puits circulaire','02',['N','D','H'],'N * Math.PI * D * D / 4 * H','m3','Cylindre de diamètre D en mètres ; volume théorique, sans surconsommation de forage inventée.','L1:156-166')
form('GO_COFFRAGE_SEMELLE','Surface de joues de semelle rectangulaire isolée','02',['N','a','b','H'],'N * 2 * (a + b) * H','m2','Quatre joues réellement coffrées ; exclut fond et dessus et ne vaut pas pour coulage à pleine fouille.','L1:165,170')
form('GO_RADIER_VOLUME','Volume de radier et nervures sans double compte','02',['V_dalle','V_nervures','V_intersections'],'V_dalle + V_nervures - V_intersections','m3','Saisir les volumes géométriques réels ; les intersections doivent être décrites pour éviter le doublon.','L1:154-155,166')
form('GO_MUR_NET','Surface nette d’un mur rectangulaire','02',['L','H','S_vides'],'L * H - S_vides','m2','Tous vides déduits selon L1 p. 31 ; pas de seuil universel ni de perte par défaut.','L1:31-34;L2:30,69')
form('GO_PIGNON_TRIANGLE','Surface de la pointe triangulaire d’un pignon','02',['b','H','S_vides'],'b * H / 2 - S_vides','m2','Pointe triangulaire seulement ; ajouter séparément la partie rectangulaire et déduire ses baies.','L1:31-34;L2:68-69')
form('GO_LONGRINE_VOLUME','Volume de longrine ou poutre rectangulaire','02',['L','b','H'],'L * b * H','m3','Longueur réellement attribuée à l’ouvrage ; corriger les intersections avec appuis, voiles ou dalles.','L1:166,172;L2:70')
form('GO_DALLAGE_VOLUME','Volume du corps de dallage','02',['S','ep'],'S * ep','m3','Épaisseur ep en mètres ; ne comprend ni forme, ni isolant, ni chape rapportée.','L2:19-32')
form('GO_ACIER_RATIO','Masse d’acier à partir d’un ratio explicitement choisi','02',['V_beton','ratio_kg_m3'],'V_beton * ratio_kg_m3','kg','Le ratio est une donnée de l’étude ou un exemple choisi ; 25/30 pour semelles et 40 à 60 pour longrines sont des exemples des p. 170/172, pas des valeurs universelles.','L1:170,172',nature='formalisation_des_ratios_cites')
form('GO_TREILLIS_MASSE','Masse de treillis à partir du tableau du cours','02',['S','masse_surfacique'],'S * masse_surfacique','kg','S est la surface réellement approvisionnée incluant les recouvrements explicités ; masse surfacique selon référence choisie, sans perte automatique.','L2:95-96')
form('GO_BLOCS_CELLULAIRE_EXEMPLE','Blocs béton cellulaire : consommation de l’exemple','02',['S'],'S * 6.5','U','Consommation 6,5 blocs/m2 citée seulement pour l’exemple de béton cellulaire à coller.','L2:74',nature='formalisation_exemple_pedagogique')
form('GO_PRESSION_SOL','Pression moyenne de contact du sol','02',['N_kN','A_m2'],'N_kN / (1000 * A_m2)','MPa','Charge verticale en kN, aire strictement positive en m2 ; conversion kPa vers MPa. Ne valide ni tassement ni charge excentrée.','L1:145,147-148',nature='formalisation_relation_charge_surface_du_cours')
form('GO_ENCASTREMENT_DB','Rapport profondeur / largeur D/B','02',['D','B'],'D / B','sans_unite','Rapport du schéma de la p. 145 ; la phrase voisine « largeur à hauteur supérieur à 3 m » est incohérente. Ne pas classifier automatiquement une fondation avec cette seule phrase.','L1:145',nature='relation_imprimee_avec_incoherence_signalee')
form('GO_SEMELLE_RIGIDE_H_MIN','Borne de hauteur d’une semelle rigide dans le cours','02',['B','b'],'(B - b) / 4 + 0.05','m','Relation imprimée h >= (B-b)/4 + 5 cm ; B et b en mètres. Prédimensionnement pédagogique, pas une validation structurelle.','L1:149',nature='relation_imprimee')
form('GO_SEMELLE_FLEXIBLE_LIMITE','Limite de hauteur de semelle flexible dans le cours','02',['B'],'B / 4','m','Relation imprimée H < B/4 ; seule la borne est renvoyée.','L1:150',nature='relation_imprimee')
form('GO_APPUI_PLANCHER','Borne d’appui du plancher en rive','02',['ep_mur'],'2 * ep_mur / 3','m','Le cours indique appui > 2/3 de l’épaisseur du porteur, enduit exclu ; la formule renvoie la borne.','L2:54',nature='relation_imprimee')
form('GO_APPUI_LINTEAU','Appui minimal du linteau dans le cours','02',['portee'],'Math.max(0.20, portee / 10)','m','Plus grande des deux valeurs : 0,20 m et 1/10 de la portée ; dispositions de l’édition du cours à confronter au dossier.','L2:60-61,77',nature='relation_imprimee')
form('GO_LINTEAU_LONGUEUR','Longueur de linteau avec deux appuis','02',['largeur_baie','appui_gauche','appui_droit'],'largeur_baie + appui_gauche + appui_droit','m','Longueur géométrique incluant les appuis réels, choisis indépendamment.','L2:60-62,77')
form('GO_ACIER_SECTION_POURCENT','Section d’acier par pourcentage de section de béton','02',['S_beton_cm2','pourcent'],'S_beton_cm2 * pourcent / 100','cm2','Pourcentage à sélectionner suivant le contexte du cours : appuis longs 0,25 %, bandeaux 0,50 %, balcons 0,20 ou 0,25 %, dallage selon sa partie. Les pourcentages ne sont pas interchangeables.','L2:26,52,54-55',nature='formalisation_des_pourcentages_cites')
form('GO_CHAINAGE_A_MIN','Section minimale de chaînage du schéma p. 66','02',['B_cm','H_cm'],'Math.max(0.004 * B_cm * H_cm, 1.50)','cm2','Transcription du schéma ; la même page comporte des incohérences de nuance et d’équivalence de barres, signalées dans le relevé. Aucune validation automatique de ferraillage.','L2:66',nature='relation_imprimee_avec_incoherence_signalee')
form('GO_POTEAU_A_VERTICAUX','Section verticale minimale de poteau citée','02',['perimetre_m'],'4 * perimetre_m','cm2','Ordre de grandeur du cours : 4 cm2 par mètre de périmètre ; ne remplace pas le dimensionnement.','L2:64',nature='relation_imprimee')
form('GO_CADRE_PHI_MIN','Diamètre minimal de cadre cité','02',['phi_vertical_mm'],'phi_vertical_mm / 3','mm','Un tiers du diamètre longitudinal dans le passage sur les poteaux.','L2:65',nature='relation_imprimee')
form('GO_CADRE_ESPACEMENT_MAX','Borne d’espacement des cadres de poteau citée','02',['phi_vertical_mm','a_min_m'],'Math.min(15 * phi_vertical_mm / 1000, a_min_m + 0.10)','m','Borne suivant les deux critères du cours ; ne comprend pas les dispositions particulières en zone de recouvrement.','L2:65',nature='relation_imprimee')
for factor in [50,40,24,30]:
 form(f'GO_RECOUVREMENT_{factor}PHI',f'Longueur de recouvrement pédagogique {factor} diamètres','02',['phi_mm'],f'{factor} * phi_mm / 1000','m',
      'Facteur cité dans un contexte précis des chaînages ou poteaux, avec nuance et type d’acier à vérifier ; les valeurs des différents passages ne doivent pas être fusionnées.','L2:52-53,65',nature='relation_imprimee')
form('GO_ENROBAGE_GRANULAT','Enrobage lié au diamètre du granulat dans le cours','02',['Dmax_mm'],'1.5 * Dmax_mm / 1000','m','Transcription du passage sur le bétonnage des poteaux ; ne remplace pas les autres conditions d’enrobage.','L2:65',nature='relation_imprimee')
form('GO_POTEAU_RECTITUDE','Tolérance de rectitude du poteau citée','02',['H_m'],'Math.max(0.01, H_m / 500)','m','Plus grande de 1 cm et de la hauteur divisée par 500 dans le cours.','L2:65',nature='relation_imprimee')
predim=[
 ('LINTEAU_FAIBLE','Linteau — continuité faible','L',10),('LINTEAU_FORTE','Linteau — continuité forte','L',15),
 ('POUTRE_FAIBLE','Poutre avec retombée — continuité faible','L',10),('POUTRE_FORTE','Poutre avec retombée — continuité forte','L',15),
 ('BANDE_NOYEE','Bande noyée','L',16),('DALLE_2APPUIS_FAIBLE','Dalle sur deux appuis — continuité faible','l',20),
 ('DALLE_2APPUIS_FORTE','Dalle sur deux appuis — continuité forte','l',30),('DALLE_4APPUIS_FAIBLE','Dalle sur quatre appuis — continuité faible','l',30),
 ('DALLE_4APPUIS_FORTE','Dalle sur quatre appuis — continuité forte','l',40),('POUTRELLES_FAIBLE','Plancher à poutrelles — continuité faible','L',25),
 ('POUTRELLES_FORTE','Plancher à poutrelles — continuité forte','L',30),('BALCON','Balcon','L',10),('POTEAU','Côté de poteau','H',15)]
for id,name,var,div in predim:
 form('GO_PREDIM_'+id,'Prédimensionnement du cours — '+name,'02',[var],f'{var} / {div}','m',
  'Borne inférieure du tableau p. 92, dimensions en mètres ; vérifier les conditions d’appuis et de continuité puis effectuer la justification structurelle. Pour les dalles, l désigne la petite portée ; les dessins distinguent les rapports L/l.','L2:92',nature='predimensionnement_pedagogique_imprime')
for div in [300,500]:
 form('GO_FLECHE_'+str(div),f'Flèche : portée/{div} citée','02',['portee'],f'portee / {div}','m','Valeur de la plage pédagogique portée/300 à portée/500 ; choisir le critère du dossier, pas une limite automatique.','L2:93',nature='relation_imprimee')
form('GO_BLONDEL','Relation de Blondel','02',['h_cm','g_cm'],'2 * h_cm + g_cm','cm','Résultat à comparer à la plage de 60 à 64 cm indiquée au cours ; une autre figure donne 62 cm. Ce contrôle ne valide pas toutes les dimensions ni la conformité d’un escalier.','L2:115,117',nature='relation_imprimee')
form('GO_MARCHE_HAUTEUR','Hauteur d’une contremarche','02',['montee','n_contremarches'],'montee / n_contremarches','m','Nombre entier de contremarches strictement positif, montée entre niveaux finis ; ne pas confondre avec nombre de girons.','L2:115-117')
form('GO_ESCALIER_RECULEMENT','Reculement d’une volée droite','02',['n_girons','g'],'n_girons * g','m','Nombre de girons réellement présents au plan ; palier d’arrivée distinct.','L2:117')
form('GO_PAILLASSE_DEVELOPPE','Développé d’une paillasse droite','02',['reculement','montee'],'Math.sqrt(reculement * reculement + montee * montee)','m','Reformulation géométrique d’une volée droite ; dimensions réelles du plan, hors palier.','L2:117-119')
form('GO_PAILLASSE_VOLUME','Volume de la paillasse droite','02',['L_inclinee','E','ep'],'L_inclinee * E * ep','m3','Épaisseur mesurée normalement à la paillasse ; ajouter marches et paliers suivant géométrie sans double compte.','L2:117-121')
form('GO_MARCHES_VOLUME','Volume de marches triangulaires régulières sur paillasse','02',['N','E','g','h'],'N * E * g * h / 2','m3','Modèle géométrique de marches droites à section triangulaire ; exclut marches balancées, paillasse et paliers déjà comptés.','L2:117-121')
form('FAC_TABLEAUX_SURFACE','Surface des tableaux et sous-face de linteau','03',['H_baie','l_baie','profondeur'],'(2 * H_baie + l_baie) * profondeur','m2','Deux tableaux et une sous-face pour une baie rectangulaire ; ne pas ajouter un appui si sa prestation est distincte.','L2:142,165')
form('FAC_ENDUIT_VOLUME','Volume géométrique d’une couche d’enduit','03',['S','ep'],'S * ep','m3','Épaisseur en mètres réellement retenue ; aucune interprétation automatique des unités incohérentes de l’exemple p. 166.','L2:136-139,166')
form('FAC_ATTACHES_PIERRE','Nombre d’attaches de plaques dans le détail du cours','03',['N_plaques'],'4 * N_plaques','U','Détail p. 159 : quatre attaches, dont deux porteuses et deux de retenue ; ne remplace pas l’étude du système.','L2:159',nature='formalisation_detail_du_cours')
form('FAC_MASSE_PIERRE','Masse d’un parement de pierre','03',['S','ep','rho'],'S * ep * rho','kg','S en m2, ep en m, masse volumique rho en kg/m3 de la pierre choisie ; valeurs de produits du cours non généralisées.','L2:155-156,159')
form('FUM_SECTION_RECTANGULAIRE','Section intérieure d’un conduit rectangulaire','04',['a','b'],'a * b','m2','Dimensions intérieures en mètres ; ne constitue pas un calcul de tirage ou de dimensionnement.','L3:104,115')
form('FUM_SECTION_CIRCULAIRE','Section intérieure d’un conduit circulaire','04',['D'],'Math.PI * D * D / 4','m2','Diamètre intérieur en mètres ; section constante du conduit dans la description.','L3:104,115')
form('FUM_LONGUEUR_DEVOIEMENT','Longueur d’une partie dévoyée','04',['H','deport'],'Math.sqrt(H * H + deport * deport)','m','Longueur géométrique d’une partie rectiligne dévoyée ; ne détermine pas un angle autorisé.','L3:104-105')
form('VEN_FUITES_EXEMPLE','Débit avec 10 % de fuite — exemple caisson individuel','05',['Q_extraction_max'],'Q_extraction_max * 1.10','m3/h','10 % cités uniquement dans l’exemple p. 159 ; ne pas généraliser à toute installation.','L3:159',nature='formalisation_exemple_pedagogique')
form('VEN_Q_CUISINE_MAX_COURS','Débit cuisine maximal du tableau du cours','05',['n_pieces'],'[75,90,105,120,135][Math.min(n_pieces,5)-1]','m3/h','n_pieces entier au moins 1 ; tableau ancien des débits pouvant être atteints ; cinq pièces et plus = 135. Ne vaut pas certification actuelle.','L3:141-142',nature='transcription_tableau_du_cours')
form('VEN_Q_BAIN_MAX_COURS','Débit salle de bains du tableau du cours','05',['n_pieces'],'n_pieces <= 2 ? 15 : 30','m3/h','n_pieces entier au moins 1 ; tableau de salle de bains avec ou sans WC, distinct de la colonne « autre salle d’eau ».','L3:141-142',nature='transcription_tableau_du_cours')
form('VEN_Q_WC_UNIQUE_COLLECTIF','Débit WC unique — tableau collectif du cours','05',['n_pieces'],'n_pieces <= 3 ? 15 : 30','m3/h','Tableau habitat collectif ; WC multiples = 15 m3/h chacun dans le tableau, tandis que le tableau individuel donne 15 pour la colonne WC.','L3:141-142',nature='transcription_tableau_du_cours')
for suffix,values,desc in [
 ('TOTAL_MIN',[35,60,75,90,105,120,135],'Débit total minimal du tableau'),
 ('CUISINE_MIN',[20,30,45,45,45,45,45],'Débit réduit minimal de cuisine du tableau'),
 ('HYGRO_MIN',[10,10,15,20,25,30,35],'Débit total minimal du tableau hygrorégulé')]:
 form('VEN_Q_'+suffix,desc+' du cours','05',['n_pieces'],str(values).replace(' ','')+'[n_pieces-1]','m3/h',
  'Domaine strict : entier de 1 à 7 pièces principales ; aucune extrapolation à 8 pièces. Tables de l’édition pédagogique à vérifier pour un projet réel.','L3:141,143',nature='transcription_tableau_du_cours')
form('VEN_SOMME_DEBITS','Somme de débits par pièces','05',['Q_cuisine','Q_salles_eau','Q_WC','Q_autres'],'Q_cuisine + Q_salles_eau + Q_WC + Q_autres','m3/h','Addition de valeurs explicitement retenues selon les pièces ; ne choisit pas automatiquement entre maxima, minima et système hygroréglable.','L3:141-143,159')
# Références et points de lecture : ne pas transformer les anciens textes en droit actuel.
work('02','GO-N01','Structure — Références du cours','Références de calcul des planchers citées',None,None,GENERAL,
 'BAEL ; Eurocodes 1, 2, 3 et 4 ; CPT Planchers titre II, tels que cités dans le cours.',
 'Ces références couvrent actions, béton, acier et structures mixtes. Elles sont des citations de l’édition étudiée, sans vérification de leur état actuel.','L2:83',
 ['BAEL','Eurocode 1','Eurocode 2','Eurocode 3','Eurocode 4','CPT Planchers titre II'])
norm_fum=['NF P 51-201 — DTU 24.1','NF P 51-202 — DTU 24.2.1','NF P 51-203 — DTU 24.2.2','NF P 51-204-1 — DTU 24.2.3','NF EN 12391-1','NF EN 1443','NF EN 1859','NF EN 1856-1','NF EN 1856-2','NF P 51-301','NF P 51-302','NF EN 1457','NF EN 1806','NF EN 1857','NF EN 1858','NF EN 12446','NF EN 13069']
work('04','FUM-N01','Fumisterie — Références du cours','Références des conduits de fumée citées',None,None,GENERAL,
 'Références du chapitre : '+ '; '.join(norm_fum)+'.',
 'Le cours distingue les normes des conduits intérieurs, enveloppes, systèmes métalliques et ouvrages. Vérifier les documents applicables au système du projet ; les désignations et dates anciennes ne sont pas déclarées actuelles.','L3:97-98',norm_fum)
work('05','VEN-N01','Ventilation — Références du cours','Références de ventilation citées',None,None,GENERAL,
 'Documents du cours : DTU 68.1, DTU 68.2, DTU 61.1, FD CEN/TR 14788 ; textes d’aération de 1982/1983 et sécurité incendie de 1986 cités.',
 'Choisir les textes et le procédé applicables au dossier. Les tables reproduites sont celles de l’édition 108-4 et ne constituent pas une vérification réglementaire actuelle.','L3:140-143',
 VENT+['NF P 45-204 — DTU 61.1'])
# Rattacher les normes de produit à leurs fiches, quand le cours les donne.
for l in DATA['lots']:
 for o in l['ouvrages']:
  if o['code']=='FUM-004':o['clause_cctp']['normes_dtu']+=['NF EN 1806']
  if o['code']=='FUM-011':o['clause_cctp']['normes_dtu']+=['NF EN 1856-1','NF EN 1856-2','NF EN 12391-1']
  if o['code']=='VEN-012':o['clause_cctp']['normes_dtu']+=['E 51-732 (septembre 1992)']
  if o['code']=='GO-F19':
   o['designation_courte']='Buttons — libellé imprimé à clarifier'
   o['clause_cctp']['titre_article']=o['designation_courte']
   o['unite']=None;o['formule_defaut']=None
   o['clause_cctp']['description_technique']='Le tableau imprime « Buttons » parmi les éléments de fondation ; libellé conservé sans interprétation automatique.'
   p=next(p for p in PROOFS['ouvrages'] if p['code']==o['code']);p['nature_clause']='ouvrage_cite_sans_clause_cctp';p['statut_unite']='non_precisee_par_le_cours'
  if o['code']=='GO-V13':o['formule_defaut']='S_brute - S_vides'
warn('NUMEROTATION','Les lots 02 Gros Œuvre, 03 Façades, 04 Fumisterie et 05 Ventilation sont une organisation logicielle. Les exemples du cours sont regroupés sous le lot imprimé 01 Gros-Œuvre, chapitres 02 à 14. Les codes imprimés sont conservés séparément.','L1:165-172;L2:165;L3:154')
warn('FONDATIONS_DB','La p. 145 imprime « rapport largeur à hauteur supérieur à 3 m » alors que le schéma utilise D/B sans unité. La contradiction est conservée ; aucune classification automatique de fondations n’en est déduite.','L1:145')
warn('PUITS_DOSAGE','Le passage technologique donne 250 kg/m3 minimum pour les puits, tandis que l’exemple p. 172 propose un dosage selon charge à 200 kg avec une composition particulière. Données distinctes, aucun dosage universel choisi.','L1:162,172')
warn('ACIER_CHAINAGE','La p. 66 associe 200 MPa à HA FeE 500 et affirme une équivalence entre 2 HA10, 8 HA8 et 4 HA7. Ces mentions imprimées sont incohérentes. La formule du schéma est distinguée et n’est pas une validation de ferraillage.','L2:66')
warn('RECOUVREMENTS','Les passages sur chaînages et poteaux citent des longueurs de recouvrement différentes selon nuance et contexte. Les facteurs 50, 40, 24 et 30 sont conservés dans des formules distinctes, sans les rendre interchangeables.','L2:52-53,65')
warn('BRIQUES_MORTIER','La variante de mortier bâtard des briques pleines cite 175 kg de ciment et 275 kg de chaux avec une mention de dosage à 400 kg ; ne pas additionner et corriger silencieusement ces données.','L2:73')
warn('ARASE_ESCALIER','L’article 01.09.02 du chapitre Escaliers reproduit une arase étanche sur voile béton. La fiche est identifiée comme anomalie et exclue du rapprochement automatique par code imprimé.','L2:126')
warn('ENDUIT_UNITES','L’exemple d’enduit traditionnel donne 20 mm au total mais 3 à 5 cm pour le gobetis ; celui de monocouche imprime 20 m. Les unités originales ont été vérifiées visuellement et ne sont pas corrigées silencieusement.','L2:166')
warn('FILM_ISOLATION','Le texte présente le film polyéthylène et l’isolant périphérique puis signale tuilage et tassements différentiels ; ces variantes ne sont pas des prescriptions universelles.','L2:23-24,35')
warn('FUMEE_SECURITE','Les anciens schémas d’écart au feu des planchers bois et les distances de sécurité déclarées des conduits relèvent de contextes différents ; aucune règle unique de 16 cm ou de débouché n’est appliquée à tout projet.','L2:87;L3:107-113,118')
warn('MOUSTIQUAIRES','Les exemples de grilles 01.14.03/04 incluent des moustiquaires, tandis que 01.14.07 les interdit en site urbain. Les variantes sont conservées séparément.','L3:155-157')
warn('DEBITS_VENTILATION','Les tableaux individuels et collectifs ne donnent pas les mêmes débits de WC selon le nombre de pièces et le caractère unique ou multiple. Maxima, minima et hygrorégulation restent distincts ; aucune extrapolation au-delà des colonnes 1 à 7.','L3:141-143')
warn('NORMES_HISTORIQUES','BAEL, RT 2000/2005, anciens DTU et arrêtés cités sont ceux de l’édition 108-4. Aucune mise à jour réglementaire, conformité incendie ou justification structurelle actuelle n’est revendiquée.','L1:145;L2:83,123;L3:140-143,153')
warn('UNITES','Sauf donnée explicitement chiffrée du cours, unités et formules géométriques sont proposées pour le calcul. Ce ne sont pas des unités de paiement réglementaires imposées ; aucune perte de 5 % ou déduction générale de baie à 0,50 m2 n’a été introduite.','L1:31-35')
# Références de la règle générale de métré, en plus de celles de l'ouvrage.
for p in PROOFS['ouvrages']:
 if p['code'].startswith(PREFIXES):
  p['references']=list({(r['livre'],r['page_cours']):r for r in p['references']+refs('L1:31-35')}.values())
# Conditions précises des schémas de prédimensionnement.
for f in DATA['formules_calcul']:
 if f['id'].startswith('GO_PREDIM_'):
  if '2APPUIS' in f['id']:f['description']+=' Le schéma indique L >= 2,5 l.'
  if '4APPUIS' in f['id']:f['description']+=' Le schéma indique L < 2,5 l.'
  if 'BANDE_NOYEE' in f['id']:f['description']+=' Le schéma indique une portée L au plus égale à 3,50 m.'
DATA['metadata']['version']='1.1'
# Une définition absent du livre ne devient pas une abréviation inventée :
# le dictionnaire des trois livres, déjà extrait, est conservé sans substitution.
assert len({o['code'] for l in DATA['lots'] for o in l['ouvrages']})==sum(len(l['ouvrages']) for l in DATA['lots'])
assert len({f['id'] for f in DATA['formules_calcul']})==len(DATA['formules_calcul'])
assert set(DATA)=={'metadata','abreviations','formules_calcul','lots'}
for l in DATA['lots']:
 for o in l['ouvrages']:
  assert set(o)=={'code','designation_courte','unite','formule_defaut','regle_metre','clause_cctp'}
  assert o['regle_metre']['taux_perte_pourcent'] is None
coverage={
 'edition_source':'108-4','mode':'extraction_par_lots_avec_trames_technologie_et_variantes_d_exemples',
 'limites':'Les chapitres couvrent terrassement/VRD, fondations et structures, façades, fumisterie et ventilation. Ils ne fournissent pas un CCTP complet de tous les autres corps d’état ; les prescriptions simplement citées restent à compléter.',
 'lots':[{'numero_lot':l['numero_lot'],'nom_lot':l['nom_lot'],'ouvrages':len(l['ouvrages']),
 'exemples':sum(1 for o in l['ouvrages'] if next(p for p in PROOFS['ouvrages'] if p['code']==o['code'])['nature_clause']=='exemple_pedagogique_donnees_fixes')} for l in DATA['lots']],
 'abreviations':len(DATA['abreviations']),'formules':len(DATA['formules_calcul']),
 'chapitres_suivants':[{'livre':'L1','chapitre':4,'pages_cours':[141,172]},{'livre':'L2','chapitre':5,'pages_cours':[5,36]},{'livre':'L2','chapitre':6,'pages_cours':[37,78]},{'livre':'L2','chapitre':7,'pages_cours':[79,126]},{'livre':'L2','chapitre':8,'pages_cours':[127,168]},{'livre':'L3','chapitre':11,'pages_cours':[93,127]},{'livre':'L3','chapitre':12,'pages_cours':[129,160]}],
 'unites':'Unités de calcul indicatives ; à confirmer au bordereau.',
 'taux_pertes':'Aucun taux de perte non établi par les sources n’est ajouté.',
 'normes':'Références historiques citées ; état actuel non vérifié.'}
for name,obj in [('cctp-library.json',DATA),('cctp-sources.json',PROOFS),('cctp-coverage.json',coverage)]:
 (TARGET/name).write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps(coverage,ensure_ascii=False,indent=2))
