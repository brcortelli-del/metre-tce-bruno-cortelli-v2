# Métré France / Luxembourg — contrôle au 13 novembre 2026

Cette comparaison distingue géométrie, décompte contractuel, exécution et dimensionnement. Un seuil de paiement n’est ni une règle de résistance ni une quantité réelle de matériau à commander. Les déductions sont appréciées par ouverture, avant répétition, selon le texte et la position du marché.

| Sujet | France | Luxembourg |
|---|---|---|
| Maçonnerie, baies isolées | Aucun seuil national général de0,50 m² établi par les sources primaires librement consultées. Pièces du marché à définir ; le logiciel fournit par défaut le net géométrique pédagogique. | CTG 012v5,02/10/2026 : baies mesurées en surface déduites si>2,5 m², pas à égalité (§1.5.3.1). Le cas volumique>0,5 m³ est illustré figure54. Les niches, éléments engagés, linteaux, tableaux et trumeaux ont des règles distinctes. |
| Béton et coffrage | Règles du marché ; ne pas attribuer au seul Eurocode2 une règle de facturation. | CTG 013§1.5 : ouvertures>0,5 m³ en volume,>2,5 m² en surface ; coffrage développé avec seuil surfacique propre. Armatures non déduites du béton. Saignées : cas distinct. |
| Enduits intérieurs / isolation intérieure | Décompte à expliciter au marché. | CTG 023 : réservations≤2,5 m² non déduites ; interruptions≤1m conservées en linéaire. Tableaux et sous-faces comptés à part, avec dispositions de profondeur. |
| Ouvrages secs | Décompte à expliciter au marché. | CTG 039 : parois verticales2,5 m², planchers0,5 m² ; plafonds ouverts déduits avec exceptions techniques, trappes non déduites. Ne pas appliquer2,5 m²à tous les plafonds. |
| Peinture | Décompte à expliciter au marché. | CTG 034 : ouvertures>2,5 m², ou>0,5 m²dans les planchers ; tableaux et fonds de niches à surface réelle, séparés. |
| Isolation de façade | Décompte et système à expliciter au marché. | CTG 011 contient un cas spécifique6 m² pour isolants/barrières et un cas d’encadrement complet. Aucune automatisation de cette règle ambiguë sans préciser la position ; ce n’est pas le seuil de la maçonnerie. |
| Terrassement | Quantité, profils, tolérances et mode de paiement selon pièces du marché ; CCTG fascicule2si visé. Le foisonnement de transport ne se confond pas avec le volume en place. | CTG 002§1.5 : déblais en place sur profils et attachements contradictoires ; remblais selon profils, attachements ou pesage suivant la position. |
| Nus, retours, petites surfaces et angles | Choisir la prestation et sa base de mesurage dans le bordereau. Aucun basculement universel nu intérieur/extérieur. | CTG 012 distingue notamment dimensions de l’élément et, pour murs doubles, dimensions extérieures du parement/isolant. D’autres CTG utilisent les nus bruts ou surfaces traitées. Retours, trumeaux et angles spéciaux peuvent avoir des positions séparées. |
| Pièces | CCTP ; BPU pour prix unitaires ; DPGF pour décomposition forfaitaire. Une DPGF ne change pas à elle seule la nature du prix. | Cahier des charges, CTG et prescriptions particulières ; bordereau des prix/de soumission ; positions. L’export Word est ici un descriptif technique sans quantités ; le bordereau chiffré se trouve dans l’export Excel. |
| Référentiels | NF DTU pour exécution selon domaine, Eurocodesavec annexesFRpour calcul ; CCAG Travauxsi visé en marché public, NF P 03-001si visée en marché privé. | CTGdu marché, normesILNAS-ENet annexesAN-LU, normesDINlorsqu’elles sont appelées. Les annexes de deuxième génération sont en cours de préparation : pas de conversion aveugle des anciens calculs. |

## Corrections et actualisations identifiées

- Arrondi du cours :24,7587 m³donne24,759 m³à trois décimales, et non27,759.
- Sections d’acier :2HA10≈1,571 cm² ;8HA8≈4,021 cm² ;4HA7≈1,539 cm². Leur équivalence stricte est erronée ; aucun ferraillage n’est choisi par le logiciel.
-175 kg+275 kg=450 kg : le dosage visé par la phrase400 kg demeure indéterminé.
- DTU13.11/13.12→NF DTU 13.1 septembre2019. NF DTU 20.1 juillet2020. NF DTU 13.2 mai2020,13.3 décembre2021,21 juin2017. DTU23.1reste en vigueur ;23.2concerne les dalles alvéolées.
- BAEL 91annulé : ses prédimensionnements restent historiques. Un changement de référence ne les transforme pas en calcul Eurocode.
- BétonFR : la noteAFNORdemande encore206+A2avecCN2025dans l’attente de l’ensemble des nouvelles parties206. BétonLU : complémentCN-LU2023identifié parILNAS.
- La CTG 012v5contient une légende contradictoire figure40. Le moteur suit le texte général§1.5.3.1et la figure41pour les baies isolées.

## Sources, portée et contrôle

Les URLs, dates, versions, domaines et statuts détaillés sont dans [l’audit JSON](cctp-audit-fr-lu.json). La [base FR/LU](cctp-fr-lu.json) conserve les554 fiches des lots01et02, avec les références des livres séparées des propositions actuelles. Les54 références de ces deux lots ont un statut d’audit ; NF T 54-090reste non vérifiée, les séries génériques et transitions restent à préciser. Les99 expressions et267 sigles sont inventoriés ; les sigles non développés dans les livres restent signalés. Les autres lots ne sont pas présentés comme adaptés aux règles de marchéFR/LU.

Il s’agit d’une vérification de sources accessibles et de règles de calcul implémentées, pas d’une certification exhaustive des prescriptions techniques payantes ni d’un dimensionnement structurel.

Sources principales :

- [CRTI-B — index des CTG](https://www.crtib.lu/fr/clauses-techniques)
- [CTG012v5](https://www.crtib.lu/api/media/file/CTG_012-Mauerarbeiten_FR_v5.0%20%2B%20ANNEX-1.pdf), PDFp.18–40et45–47
- [CTG013v6](https://www.crtib.lu/api/media/file/CTG013_vers_6_0-1.pdf), PDFp.15–18
- [CTG002v3](https://www.crtib.lu/api/media/file/CTG002_fr-1.pdf), PDFp.17
- [CCAGTravaux2021, article11](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000043315688/)
- [NFDTU20.1 — noticeAFNOR](https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-201/travaux-de-batiment-ouvrages-en-maconnerie-de-petits-elements-parois-et-mur/fa200726/85614)
- [ILNAS — normes nationales et compléments](https://portail-qualite.public.lu/fr/normes-normalisation/participer-normalisation/normes-nationales.html)
