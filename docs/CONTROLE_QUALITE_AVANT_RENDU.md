# Contrôle Qualité Avant Rendu — 10 points Jury / MOE

Accès : Guide & Workflow Exercice, étape 6 ; bouton de la minute professionnelle ; icône bouclier de l’en-tête. La grille s’ouvre aussi avant les exports CSV, Excel, DPGF/minute et CCTP (y compris les exports Word/PDF de l’éditeur).

Les dix critères valent chacun 10 % :

1. Périmètre et consignes du rendu.
2. Quantités et unités renseignées.
3. Minutes de calcul traçables.
4. Niveaux et zones identifiés.
5. Plans, cotes et calibration vérifiés.
6. Baies, vides et petites largeurs contrôlés.
7. Lots, niveaux et sous-totaux cohérents.
8. Articles CCTP présents et à jour.
9. Prescriptions et interfaces relues.
10. Dossier final prêt à rendre.

Le score est déclaré par le métreur : il ne constitue ni une certification réglementaire ni une validation automatique du jury. Un projet vide reste à 0 %. Une anomalie bloque la coche du critère associé, même si elle avait été cochée auparavant.

## Contrôles automatiques

- Quantité égale à zéro, absente ou invalide ; unité vide.
- Minute sans étapes détaillées ou sans dimensions ; reprise d’une quantité brute sans preuve de plan/import ou expression justifiée.
- Localisation incomplète : un niveau ET une zone/pièce sont attendus.
- Article CCTP absent ou article de ligne à relire après modification des données. Un article rédigé dans l’éditeur et relié à l’ouvrage par son identifiant est aussi reconnu ; un titre seul n’est pas une rédaction.

Chaque anomalie propose un accès à la ligne correspondante dans la minute professionnelle. Les quantités, les prix et les articles ne sont jamais corrigés automatiquement. Le contrôle couvre tout le projet, sans tenir compte du filtre de tableau ; l’export conserve son périmètre habituel (par exemple le filtre pour l’impression DPGF).

Les coches sont stockées dans ce navigateur par projet et empreinte du dossier. Toute modification des données auditées invalide les coches pour éviter un score ancien sur un dossier modifié. Les données du métré et du CCTP sont distinctes de ce suivi local. Le rapport de contrôle TXT permet de conserver la grille et les réserves.

## Audit IA Final

Le bouton explicite **Audit IA Final (OpenAI)** appelle `/api/analyse-metre` avec `operation: audit_final`. Le mode d’extraction existant du Copilote reste disponible sans changement de contrat.

Le serveur reçoit toutes les lignes, quantités, unités, dimensions, étapes de calcul, localisations et textes CCTP enregistrés (lignes et éditeur). Aucun prix, coefficient de marge ou fichier de plan n’est transmis. Les textes non enregistrés ne font pas partie de l’audit.

La génération utilise la clé serveur existante et GPT-4o-mini, avec un schéma JSON strict. Elle reste réservée au propriétaire authentifié, avec le contrôle d’origine habituel. Le jury virtuel fournit exactement trois risques prioritaires : constat déductible des données ou point à vérifier, identifiants d’ouvrages concernés, action corrective. Il ne prétend pas avoir vu les plans ou le descriptif absent du contexte et ne certifie aucune norme.

Les dossiers volumineux sont découpés en segments complets (trois appels simultanés maximum), puis synthétisés en trois risques globaux. Le panneau annonce le nombre de segments avant l’appel. Aucune limite silencieuse aux 500 premières lignes : les limites de 2 000 lignes et 500 articles d’éditeur du projet sont conservées. La demande reste bornée à 2 millions de caractères ; un élément isolé excessif est refusé explicitement, sans présenter un audit partiel comme complet.

En démonstration, sans clé ou si OpenAI échoue, le contrôle local serveur fournit trois risques identifiés comme locaux. Une erreur d’authentification ou de transport ne devient pas un faux succès IA. Si un segment OpenAI échoue, le résultat complet bascule en local ; aucun mélange partiel n’est annoncé comme un audit OpenAI global. L’annulation reste disponible.

## Export et réserves

Avant l’export, relisez le score et les anomalies. **Continuer avec … alerte(s)** permet d’assumer explicitement des réserves ; 100 % n’est pas imposé. Si le dossier change pendant cette étape, relancez l’export depuis sa version actuelle. Le bouton **Rapport de contrôle .txt** conserve les critères, les anomalies et l’audit reçu ; un audit devenu obsolète y est signalé.

## Validation

Tests : règles de détection, score bloqué par anomalies, état vide, coches par projet/empreinte, reconnaissance du CCTP d’éditeur, dossiers de plus de 500 lignes, couverture de tous les segments, synthèse, JSON strict, diagnostics sans secret, annulation et préservation du contrat du Copilote. Contrôles navigateur : accès depuis le guide, score, audit local, correction ciblée, quantité nulle, zone manquante et passage vers CSV, DPGF et CCTP.
