export const BIBLIOTHEQUE_EXTENSIONS_BTP = [
 {id:'ext-dalle-beton',nom:'Dalle Béton Armé (ép. 15 cm)',lot:'Gros Œuvre',uniteSource:'m2',description:"Décompose une surface de dalle en béton prêt à l'emploi, treillis soudé et film polyane.",composants:[
 {designation:"Béton prêt à l'emploi C25/30 (ép. 15 cm + 5% perte)",unite:'m3',coefficient:0.1575,prixUnitaireHT:145},
 {designation:'Treillis soudé ST25C (avec 15% recouvrement)',unite:'m2',coefficient:1.15,prixUnitaireHT:8.5},
 {designation:'Film polyane sous dallage 200 microns (avec 10% recouvrement)',unite:'m2',coefficient:1.10,prixUnitaireHT:1.8}]},
 {id:'ext-maconnerie-parpaing',nom:'Mur en Blocs Béton Creux 20x20x50',lot:'Gros Œuvre',uniteSource:'m2',description:'Calcule le nombre de parpaings, le mortier de montage et les armatures de chaînage.',composants:[
 {designation:'Blocs béton creux 20x20x50 (10 u/m² + 5% casse)',unite:'u',coefficient:10.5,prixUnitaireHT:2.4},
 {designation:'Mortier de hourdage prêt à gâcher',unite:'m3',coefficient:0.025,prixUnitaireHT:160},
 {designation:'Acier HA10 pour chaînages verticaux/horizontaux',unite:'ml',coefficient:1.80,prixUnitaireHT:4.5}]},
 {id:'ext-cloison-placostil',nom:'Cloison Placostil 72/48 (H = 2,50 m)',lot:'Plâtrerie - Isolation',uniteSource:'ml',description:"À partir d'un linéaire de cloison, calcule les plaques BA13 double face, l'ossature et l'isolant.",composants:[
 {designation:'Plaques de plâtre BA13 standard (double parement + 8% chutes)',unite:'m2',coefficient:5.40,prixUnitaireHT:6.2},
 {designation:'Rails métalliques R48 (haut et bas + 5% chutes)',unite:'ml',coefficient:2.10,prixUnitaireHT:2.8},
 {designation:'Montants métalliques M48 (entraxe 60 cm)',unite:'ml',coefficient:4.50,prixUnitaireHT:2.9},
 {designation:'Laine minérale ép. 45 mm',unite:'m2',coefficient:2.60,prixUnitaireHT:5.5},
 {designation:'Bandes à joints papier + enduit',unite:'ml',coefficient:6.50,prixUnitaireHT:1.9}]},
 {id:'ext-doublage-colle',nom:'Doublage Thermique Collé (100 + 13)',lot:'Plâtrerie - Isolation',uniteSource:'m2',description:'Calcule les complexes isolants, le mortier adhésif MAP et le traitement des joints.',composants:[
 {designation:'Complexe isolant polystyrène/plâtre 100+13 (+ 7% chutes)',unite:'m2',coefficient:1.07,prixUnitaireHT:24.5},
 {designation:'Mortier adhésif MAP (en sacs de 25 kg)',unite:'u',coefficient:0.16,prixUnitaireHT:14},
 {designation:'Bandes calicot et enduit de finition',unite:'ml',coefficient:1.50,prixUnitaireHT:1.9}]},
 {id:'ext-faux-plafond',nom:'Faux-Plafond BA13 sur Fourrures F530',lot:'Plâtrerie - Isolation',uniteSource:'m2',description:'Décompose une surface de plafond en plaques, fourrures, suspentes et laine.',composants:[
 {designation:'Plaques de plâtre BA13 (+ 8% chutes)',unite:'m2',coefficient:1.08,prixUnitaireHT:6.5},
 {designation:'Fourrures F530 (entraxe 50 cm)',unite:'ml',coefficient:2.20,prixUnitaireHT:3.1},
 {designation:'Suspentes métalliques (1 tous les 1,20 m)',unite:'u',coefficient:1.80,prixUnitaireHT:1.2},
 {designation:'Isolant laine de verre ép. 200 mm',unite:'m2',coefficient:1.05,prixUnitaireHT:11.5}]},
 {id:'ext-carrelage-sol',nom:'Carrelage Grès Cérame Collé (60x60)',lot:'Revêtements de Sols',uniteSource:'m2',description:'Calcule la surface de carreaux avec coupes, le mortier-colle C2S et le jointoiement.',composants:[
 {designation:'Carrelage grès cérame 60x60 (+ 10% coupes/chutes)',unite:'m2',coefficient:1.10,prixUnitaireHT:32},
 {designation:'Mortier-colle amélioré C2S (double encollage ~5 kg/m²)',unite:'kg',coefficient:5.00,prixUnitaireHT:1.1},
 {designation:'Mortier de jointoiement souple',unite:'kg',coefficient:0.60,prixUnitaireHT:2.5}]},
 {id:'ext-parquet-flottant',nom:'Parquet Stratifié / Contrecollé Flottant',lot:'Revêtements de Sols',uniteSource:'m2',description:'Calcule les lames de parquet avec perte et la sous-couche acoustique.',composants:[
 {designation:'Lames de parquet (+ 8% chutes de coupe)',unite:'m2',coefficient:1.08,prixUnitaireHT:28},
 {designation:'Sous-couche acoustique résiliente 3 mm (+ 5% recouvrement)',unite:'m2',coefficient:1.05,prixUnitaireHT:4.2}]},
 {id:'ext-peinture-interieure',nom:'Peinture Acrylique (Impression + 2 Couches)',lot:'Peinture',uniteSource:'m2',description:'Estime les quantités de sous-couche et de peinture selon un rendement moyen de 10 m²/L.',composants:[
 {designation:'Impression universelle acrylique (1 couche)',unite:'L',coefficient:0.11,prixUnitaireHT:12.5},
 {designation:'Peinture finition velours/satin (2 couches)',unite:'L',coefficient:0.22,prixUnitaireHT:16}]},
 {id:'ext-couverture-tuiles',nom:'Couverture Tuiles Mécaniques + Liteaux',lot:'Charpente - Couverture',uniteSource:'m2',description:'À appliquer sur une surface rampante pour obtenir tuiles, liteaux et écran.',composants:[
 {designation:'Tuiles terre cuite grand moule (12 u/m² + 5% casse)',unite:'u',coefficient:12.60,prixUnitaireHT:1.85},
 {designation:'Liteaux sapin traité 27x40 mm (pureau moyen 35 cm)',unite:'ml',coefficient:3.10,prixUnitaireHT:2.1},
 {designation:'Écran de sous-toiture HPV (+ 12% recouvrement)',unite:'m2',coefficient:1.12,prixUnitaireHT:3.4}]},
 {id:'ext-enduit-facade',nom:'Enduit Monocouche Gratté sur Façade',lot:'Façades - ITE',uniteSource:'m2',description:"Calcule le tonnage d'enduit hydraulique (ép. 15 mm) et le treillis d'armature.",composants:[
 {designation:"Enduit monocouche d'imperméabilisation (~22 kg/m²)",unite:'kg',coefficient:22.00,prixUnitaireHT:0.65},
 {designation:'Treillis fibre de verre anti-fissuration (points singuliers)',unite:'m2',coefficient:0.25,prixUnitaireHT:3.8}]}
];
