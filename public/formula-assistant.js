import { evaluateExpression } from "./expression.js";
/** Les schémas sont des identités géométriques. Aucune prescription DTU ou
 * valeur de sol n'est déduite d'un dessin. Les nombres restent des expressions
 * du parseur typé existant, jamais du JavaScript évalué. */
export const GEOMETRIES = [
  {
    id: "trapeze",
    title: "Surface de trapèze",
    unit: "m²",
    fields: [
      ["B", "Grande base", "m"],
      ["b", "Petite base", "m"],
      ["H", "Hauteur", "m"],
    ],
    expression: "(B + b) / 2 * H",
    path: "M28 96 L64 30 L136 30 L176 96 Z",
  },
  {
    id: "talus",
    title: "Fouille avec talus",
    unit: "m³",
    fields: [
      ["L", "Longueur", "m"],
      ["b", "Largeur au fond", "m"],
      ["B", "Largeur en tête", "m"],
      ["H", "Profondeur", "m"],
    ],
    expression: "L * ((b + B) / 2) * H",
    path: "M24 30 L176 30 L138 96 L66 96 Z",
  },
  {
    id: "toiture",
    title: "Développé de toiture",
    unit: "m²",
    fields: [
      ["L", "Longueur du pan", "m"],
      ["D", "Longueur réelle du rampant", "m"],
    ],
    expression: "L * D",
    path: "M24 86 L94 28 L178 66 L108 108 Z",
    note: "Mesure le rampant dans la coupe. Une projection horizontale n’est pas la longueur du rampant.",
  },
  {
    id: "fouille",
    title: "Volume de fouille droite",
    unit: "m³",
    fields: [
      ["L", "Longueur développée", "m"],
      ["b", "Largeur", "m"],
      ["H", "Profondeur", "m"],
    ],
    expression: "L * b * H",
    path: "M32 46 L130 28 L174 52 L76 74 Z M32 46 L32 96 L76 116 L174 94 L174 52 M76 74 L76 116",
  },
  {
    id: "vides",
    title: "Surface nette et ouvertures",
    unit: "m²",
    fields: [
      ["L", "Longueur du mur", "m"],
      ["H", "Hauteur", "m"],
      ["n", "Nombre de baies identiques", "u"],
      ["b", "Largeur de baie", "m"],
      ["h", "Hauteur de baie", "m"],
    ],
    expression: "L * H - n * b * h",
    path: "M24 24 H178 V108 H24 Z M78 48 H126 V94 H78 Z",
    note: "Déduction géométrique de toutes les baies saisies. Aucun seuil DTU présumé. Pour les profils contractuels FR/LU, utilise la fiche mur et ses ouvertures.",
  },
];
export function geometryExpression(shape, values, variables = []) {
  const parts = {};
  for (const [key, label, unit] of shape.fields) {
    const raw = String(values[key] ?? "")
      .trim()
      .replace(/^=/, "");
    const value = evaluateExpression(raw, unit, variables);
    if (!Number.isFinite(value) || value < 0 || (key !== "n" && value === 0))
      throw new Error(label + " : saisis une valeur positive.");
    if (unit === "u" && !Number.isInteger(value))
      throw new Error(label + " : nombre entier requis.");
    // Les cotes numériques deviennent explicitement métriques ; les variables
    // gardent leurs liens et leur unité, y compris dans un projet saisi en mm.
    parts[key] =
      /[A-Za-z_]/.test(raw) || /m[²³]?/.test(raw)
        ? "(" + raw + ")"
        : "((" + raw + ")" + (unit === "m" ? " * 1m" : "") + ")";
  }
  const expression =
    "=" + shape.expression.replace(/\b[A-Za-z]+\b/g, (k) => parts[k] ?? k);
  evaluateExpression(expression, shape.unit, variables);
  return expression;
}
export function formulaSuggestions(query, variables = [], library = null) {
  const term =
    String(query)
      .replace(/^=/, "")
      .match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0]
      ?.toLowerCase() || "";
  const all = [
    ...variables.map((v) => ({
      key: v.name,
      label: v.name,
      detail: `${v.value} ${v.unit} · variable du projet`,
      insert: v.name,
      type: "variable",
    })),
    ...(!variables.some((v) => v.name === "PI")
      ? [
          {
            key: "PI",
            label: "PI",
            detail: "Constante géométrique 3,14159…",
            insert: "PI",
            type: "variable",
          },
        ]
      : []),
    ...GEOMETRIES.map((g) => ({
      key: g.id,
      label: g.title,
      detail: g.expression,
      type: "geometry",
      geometry: g.id,
    })),
    ...(library?.abreviations || []).map((a) => ({
      key: "abbr-" + a.sigle,
      label: a.sigle,
      detail: a.signification,
      type: "definition",
    })),
    ...(library?.formules_calcul || []).map((f) => ({
      key: f.id,
      label: f.nom,
      detail: f.description || f.expression_js,
      type: "course",
      formula: f,
    })),
  ];
  return all
    .filter(
      (s) => !term || (s.label + " " + s.key).toLowerCase().includes(term),
    )
    .slice(0, 9);
}
