import { TUTORIAL_MEDIA } from '../../public/tutorial-media.js';

const narrations = [
  "Bienvenue dans ton atelier de métré. Cette démonstration utilise un garage fictif de six mètres par quatre. Le bandeau jaune confirme que tes vrais chantiers restent intacts. La navigation donne accès au relevé sur plan, à la feuille de minute, au descriptif et au chiffrage. Choisis une vue selon ton travail ; l’interface ne suppose pas un partage fixe de l’écran en deux zones.",
  "Les boutons France et Luxembourg changent le pays du chantier de démonstration. Les profils de mesurage et les textes correspondants doivent toujours être contrôlés selon le métier et les pièces du marché. Le pays ne choisit pas automatiquement le taux de TVA. Après cette bascule, la TVA saisie est conservée. Vérifie son application séparément avant d’éditer un bordereau.",
  "Ouvre la fiche des raccourcis depuis l’en-tête. Alt plus P affiche le relevé sur plan. Dans cette vue, L choisit le linéaire, S la surface et C le comptage. Maintiens la touche Majuscule pour contraindre un segment à l’horizontale ou à la verticale. Échap arrête un tracé. Dans la minute, Entrée et Tab permettent de circuler entre les cellules. Ces raccourcis respectent les champs dans lesquels tu saisis du texte.",
  "Le plan de démonstration est déjà chargé. Pour remplacer un plan, utilise le bouton Importer. Nous ouvrons ici le même fichier pédagogique, puis nous étalonnons le segment horizontal coté six mètres. Deux clics fixent les extrémités. Saisis six dans le champ de cote réelle, puis valide l’échelle. Contrôle toujours une autre cote écrite avant de retenir les mesures du dessin.",
  "Choisis Surface et relève les quatre angles extérieurs du garage. Enregistre le tracé avec une désignation explicite. Une mesure sur plan reste une estimation jusqu’au contrôle de l’échelle et des cotes. Pour alimenter l’avant-métré, utilise le relevé dans le calculateur ou prépare un ensemble d’articles à vérifier. Les ouvertures et les intersections doivent être renseignées ; elles ne sont pas déduites automatiquement par un simple tracé.",
  "La feuille de minute permet de travailler sans plan. Chaque ligne porte un numéro, un index, une désignation et ses dimensions. La variable de projet H S P représente ici deux mètres cinquante. Modifier une cote recalcule la ligne concernée. Pour reprendre une nomenclature AutoCAD ou Revit, ouvre Import CAO BIM et charge le fichier. L’aperçu et la correspondance des colonnes précèdent toujours la validation et l’injection des quantités.",
  "Dans Normes et DTU, cherche une référence ou une ancienne appellation, par exemple B A E L, puis vingt point un. Lis le statut, les conditions d’application et les sources indiquées. Ce registre est daté. Il ne transforme pas à lui seul une ancienne étude de structure en calcul Eurocode, et ne remplace pas automatiquement une réglementation pour tous les bâtiments. Vérifie l’édition applicable au projet avant d’utiliser une mention dans le descriptif.",
  "Dans l’éditeur CCTP, le bouton Importer la minute reprend les désignations et les localisations du projet. Les quantités et les prix restent dans l’avant-métré. Complète les articles sans correspondance, puis relis les matériaux, la mise en œuvre, les normes et le mode de mesurage. Le bouton Word produit un véritable fichier D O C X modifiable. Le document de démonstration est un brouillon à compléter, pas un descriptif d’exécution validé.",
  "Ouvre Approvisionnement et audit, puis le vérificateur d’oublis. Les alertes attirent ton attention sur des compléments possibles : gestion des terres, propreté, chaînages ou traitement des joints. Elles ne décident pas à la place des plans et du cahier des charges. La gestion des terres et le béton de propreté sont deux contrôles distincts. Une liste sans alerte ne garantit pas que tous les ouvrages ont été métrés.",
  "Dans l’étude de prix, les quantités de la minute alimentent les sous-détails. Renseigne le coût de main-d’œuvre, les matériaux et le matériel. Le déboursé sec est ensuite multiplié par le coefficient de vente choisi. Les méthodes de coefficient sont explicites. Contrôle les prix manquants, la TVA, les arrondis et les totaux par lot. Le bordereau client Excel exclut les coûts internes ; l’étude interne conserve les sous-détails pour ta vérification.",
  "L’approvisionnement décompose les ouvrages affectés à un bloc de matériaux. Dans cet exemple fictif, le mur en blocs alimente des besoins de blocs et de mortier. Vérifie la quantité physique nette, les pertes, le fournisseur et la quantité par colis. Le nombre de colis est arrondi au supérieur. Une liste partielle est signalée lorsque des ouvrages ne sont pas affectés. Le fichier exporté prépare une commande ; aucun ordre n’est envoyé au fournisseur.",
  "Le manuel propose le garage de six mètres par quatre, avec une hauteur sous plafond de deux mètres cinquante et trois baies. Lis d’abord le sujet, puis construis ta minute et vérifie les bases de cotes hors œuvre, dans œuvre et aux axes. Révèle ensuite le corrigé. Sous les hypothèses du manuel, l’élévation physique nette vaut quarante virgule zéro soixante-cinq mètres carrés. Compare les détails avant de chiffrer : la quantité de décompte dépend du profil et des pièces du marché.",
];
export const VIDEO_SCENARIOS = TUTORIAL_MEDIA.map((media,index)=>({...media,narration:narrations[index]}));

// Les sélecteurs sont stricts. Un bouton absent interrompt la capsule au lieu
// de produire un film qui semble réussir sans avoir effectué l'action.
export async function runScenario(index, ui) {
  const {page,click,nav,fill,hold,point,calibrate,root}=ui;
  switch(index) {
    case 0:
      await nav('plan'); await hold(1000); await nav('minute'); await hold(1600); break;
    case 1:
      await click('country-luxembourg'); await page.locator('[data-country="luxembourg"][aria-pressed="true"]:not(:disabled)').waitFor();
      await hold(1000); await click('country-france'); await page.locator('[data-country="france"][aria-pressed="true"]:not(:disabled)').waitFor();
      await nav('prices'); await hold(1200); break;
    case 2:
      await click('shortcuts'); await hold(1600); await page.keyboard.press('Escape');
      await nav('plan'); await page.locator('#planCanvas').focus(); await page.keyboard.press('l'); await hold(900);
      await page.keyboard.press('s'); await hold(900); await page.keyboard.press('Escape'); break;
    case 3:
      await nav('plan');
      await page.locator('#planFile').setInputFiles(root+'/public/demo-plan.png');
      await page.locator('#planName').filter({hasText:'demo-plan.png'}).waitFor();
      await calibrate(); await hold(1800); break;
    case 4:
      await nav('plan'); await calibrate(); await click('plan-area');
      for(const xy of [[240,230],[960,230],[960,710],[240,710]])await point(...xy);
      await fill('#traceLabel','Emprise H.O. du garage — 24 m²'); await page.locator('#tracePurpose').selectOption('emprise');
      await click('plan-save-trace'); await page.locator('#traceRows tr').waitFor();
      await click('plan-use-trace'); await hold(1800); break;
    case 5:
      await nav('minute'); await fill('[data-minute-id="demo-04"][data-minute-field="h"]','HSP');
      await page.locator('[data-minute-id="demo-04"][data-minute-field="h"]').press('Enter'); await hold(1000);
      await nav('import'); await page.locator('[data-tour="cao-file"]').setInputFiles(root+'/public/examples/revit.csv');
      await page.getByRole('heading',{name:'Reconnaître les colonnes',exact:true}).waitFor(); await hold(1500); break;
    case 6:
      await nav('norms'); await fill('.norms-tools input[type="search"]','BAEL'); await hold(1400);
      await fill('.norms-tools input[type="search"]','20.1'); await hold(1800); break;
    case 7: {
      await nav('cctp'); await click('cctp-import-minute'); await hold(1200);
      const download=page.waitForEvent('download',{timeout:60000}); await click('cctp-export-word');
      await (await download).saveAs(ui.temp+'/demonstration-cctp.docx'); await hold(1300); break;
    }
    case 8:
      await nav('needs'); await click('audit-tab'); await hold(2000); break;
    case 9: {
      await nav('prices'); await page.getByLabel('Coefficient K',{exact:true}).waitFor();
      await fill('[aria-label="Coefficient K"]','1.30'); await page.getByLabel('Coefficient K',{exact:true}).press('Tab');
      const download=page.waitForEvent('download',{timeout:60000});
      await click('pricing-export-client');
      await (await download).saveAs(ui.temp+'/demonstration-bordereau.xlsx'); await hold(1300); break;
    }
    case 10: {
      await nav('needs'); await click('needs-tab'); await hold(1500);
      const download=page.waitForEvent('download',{timeout:60000});
      await ui.clickLocator(page.getByRole('button',{name:'CSV',exact:true}));
      await (await download).saveAs(ui.temp+'/demonstration-besoins.csv'); await hold(1300); break;
    }
    case 11:
      await nav('manual'); await click('manual-exercice'); await hold(1700);
      await click('manual-correction'); await hold(1800); break;
    default: throw new Error('Scénario inconnu.');
  }
}
