import { zipSync, strToU8 } from "fflate";
import { numberedArticles, articleIssues } from "../public/cctp-model.js";
import { documentLabel, COUNTRIES, AUDIT_DATE } from '../public/country-rules.js';
const xml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
const textRun = (r) =>
  `<w:r><w:rPr>${r.bold ? "<w:b/>" : ""}${r.italic ? "<w:i/>" : ""}</w:rPr>${String(
    r.text,
  )
    .split("\n")
    .map((t) => `<w:t xml:space="preserve">${xml(t)}</w:t>`)
    .join("<w:br/>")}</w:r>`;
const para = (runs, style = "Normal", extra = "") =>
  `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr>${runs.map(textRun).join("")}</w:p>`;
const p = (s, style = "Normal") => para([{ text: s }], style);
function contentBlocks(blocks) {
  let counter = 0;
  return blocks
    .map((b) => {
      counter = b.list === "ordered" ? counter + 1 : 0;
      const prefix = b.list === "bullet" ? "• " : counter ? `${counter}. ` : "";
      return para(
        [...(prefix ? [{ text: prefix }] : []), ...b.runs],
        "Normal",
        prefix ? '<w:ind w:left="280" w:hanging="220"/>' : "",
      );
    })
    .join("");
}
export function createCctpDocx(project, { sources = true } = {}) {
  const articles = numberedArticles(project.cctp),
    pending = articles.filter((a) => articleIssues(a).length).length;
  if (!articles.length) throw new Error("Ajoute au moins un article au CCTP.");
  const title = documentLabel(project.country);
  let body = p(title, "Title") + p(project.title, "Subtitle");
  body += p(`Pays du chantier : ${COUNTRIES[project.country || 'france']} · Référentiel vérifié le ${AUDIT_DATE}.`,'Caption');
  if(project.country==='luxembourg')body+=p('Descriptif technique sans quantités ni prix. Le bordereau chiffré est exporté depuis la minute.','Caption');
  for (const line of [
    project.meta?.address,
    project.meta?.client && "Client : " + project.meta.client,
    project.meta?.architect && "Maître d’œuvre : " + project.meta.architect,
    project.meta?.studyDate && "Étude : " + project.meta.studyDate,
  ].filter(Boolean))
    body += p(line);
  body += p(
    pending
      ? `Brouillon — ${pending} article(s) à compléter ou relire.`
      : "Articles marqués relus dans l’atelier.",
  );
  body += p("Sommaire", "Heading1");
  let lot = "",
    sub = "";
  for (const a of articles) {
    if (a.lotHeading !== lot) {
      lot = a.lotHeading;
      body += p(lot, "TOC1");
    }
    if (a.subHeading !== sub) {
      sub = a.subHeading;
      body += p(sub, "TOC2");
    }
    body += `<w:p><w:pPr><w:pStyle w:val="TOC3"/></w:pPr><w:hyperlink w:anchor="a${xml(a.id.replace(/[^a-zA-Z0-9]/g, ""))}">${textRun({ text: a.number + " " + a.title })}</w:hyperlink></w:p>`;
  }
  body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  lot = "";
  sub = "";
  for (const [i, a] of articles.entries()) {
    if (a.lotHeading !== lot) {
      lot = a.lotHeading;
      body += p(lot, "Heading1");
    }
    if (a.subHeading !== sub) {
      sub = a.subHeading;
      body += p(sub, "Heading2");
    }
    body +=
      `<w:bookmarkStart w:id="${i}" w:name="a${xml(a.id.replace(/[^a-zA-Z0-9]/g, ""))}"/>` +
      p(a.number + " " + a.title, "Heading3") +
      `<w:bookmarkEnd w:id="${i}"/>`;
    if (a.references)
      body += p(
        "Références citées — à vérifier au marché : " + a.references,
        "Caption",
      );
    for (const [label, blocks] of [
      ["Description des ouvrages", a.description],
      ["Mise en œuvre", a.execution],
      ["Localisation", a.location],
      ["Mode de métré", a.measurement || []],
    ])
      body +=
        p(label, "Heading4") +
        contentBlocks(
          blocks.length ? blocks : [{ runs: [{ text: "À compléter" }] }],
        );
    if (a.unit) body += p("Unité de métré indicative : " + a.unit, "Caption");
    if (sources && a.source?.pages)
      body += p(
        "Source pédagogique : " +
          a.source.pages +
          (a.source.note ? " — " + a.source.note : ""),
        "Caption",
      );
    if(sources)for(const link of a.source?.links||[])body+=p(link.label+' — '+link.url,'Caption');
  }
  body +=
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>';
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const styles = `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="${ns}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="000000"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="280" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>${[
    ["Normal", 22, 0, 0],
    ["Title", 34, 1, 0],
    ["Subtitle", 26, 1, 0],
    ["Heading1", 28, 1, 0],
    ["Heading2", 25, 1, 1],
    ["Heading3", 23, 1, 2],
    ["Heading4", 22, 1, 3],
    ["Caption", 18, 0, 0],
    ["TOC1", 23, 1, 0],
    ["TOC2", 22, 0, 0],
    ["TOC3", 21, 0, 0],
  ]
    .map(
      ([name, size, bold, level]) =>
        `<w:style w:type="paragraph" w:styleId="${name}"><w:name w:val="${name}"/>${name === "Normal" ? "" : '<w:basedOn w:val="Normal"/>'}<w:pPr>${name.startsWith("Heading") ? `<w:keepNext/><w:outlineLvl w:val="${level}"/><w:spacing w:before="200" w:after="100"/>` : ""}${name === "TOC2" ? '<w:ind w:left="240"/>' : name === "TOC3" ? '<w:ind w:left="480"/>' : ""}</w:pPr><w:rPr><w:sz w:val="${size}"/><w:color w:val="000000"/>${bold ? "<w:b/>" : ""}</w:rPr></w:style>`,
    )
    .join("")}</w:styles>`;
  return zipSync(
    {
      "[Content_Types].xml": strToU8(
        '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
      ),
      "_rels/.rels": strToU8(
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      ),
      "word/document.xml": strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}</w:body></w:document>`,
      ),
      "word/styles.xml": strToU8(styles),
      "word/_rels/document.xml.rels": strToU8(
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      ),
    },
    { level: 6 },
  );
}
const pdfText = (s) =>
  String(s ?? "")
    .replaceAll("φ", "diam.")
    .replaceAll("Φ", "diam.")
    .replaceAll("≥", ">=")
    .replaceAll("≤", "<=")
    .replaceAll("→", " -> ")
    .replace(/[\u2011\u2013\u2014]/g, "-")
    .replaceAll("\u202f", " ")
    .replaceAll("\u00a0", " ");
export async function createCctpPdf(project, lib, { sources = true } = {}) {
  const articles = numberedArticles(project.cctp);
  if (!articles.length) throw new Error("Ajoute au moins un article au CCTP.");
  const doc = await lib.PDFDocument.create(),
    normal = await doc.embedFont(lib.StandardFonts.Helvetica),
    bold = await doc.embedFont(lib.StandardFonts.HelveticaBold),
    italic = await doc.embedFont(lib.StandardFonts.HelveticaOblique),
    both = await doc.embedFont(lib.StandardFonts.HelveticaBoldOblique);
  const W = 595.28,
    H = 841.89,
    M = 52,
    WIDTH = W - 2 * M;
  let page, y;
  const f = (r) =>
    r.bold ? (r.italic ? both : bold) : r.italic ? italic : normal;
  function lines(runs, size, width = WIDTH) {
    const result = [[]];
    let used = 0;
    for (const run of runs)
      for (const token of pdfText(run.text)
        .replaceAll("\r", "")
        .split(/(\n|[^\S\n]+)/)) {
        if (!token) continue;
        if (token === "\n") {
          result.push([]);
          used = 0;
          continue;
        }
        for (const word of f(run).widthOfTextAtSize(token, size) > width
          ? [...token]
          : [token]) {
          const w = f(run).widthOfTextAtSize(word, size);
          if (used + w > width && used > 0) {
            result.push([]);
            used = 0;
          }
          if (!used && !word.trim()) continue;
          result.at(-1).push({ ...run, text: word });
          used += w;
        }
      }
    return result;
  }
  const start = () => {
    page = doc.addPage([W, H]);
    y = H - M;
  };
  const drawLine = (runs, size, x = M) => {
    for (const r of runs) {
      page.drawText(r.text, { x, y, size, font: f(r) });
      x += f(r).widthOfTextAtSize(r.text, size);
    }
  };
  const write = (runs, size = 10, after = 7) => {
    const ll = lines(runs, size);
    for (const l of ll) {
      if (y < M + 22) start();
      drawLine(l, size);
      y -= size * 1.42;
    }
    y -= after;
  };
  const label = (s, size = 12) => {
    if (y < M + 70) start();
    write([{ text: s, bold: true }], size, 7);
  };
  start();
  write([{ text: documentLabel(project.country), bold: true }], 19, 20);
  write([{text:`Pays du chantier : ${COUNTRIES[project.country || 'france']} · Référentiel vérifié le ${AUDIT_DATE}.`}],9);
  if(project.country==='luxembourg')write([{text:'Descriptif technique sans quantités ni prix ; bordereau chiffré exporté depuis la minute.'}],9);
  write([{ text: project.title, bold: true }], 15, 16);
  for (const t of [
    project.meta?.address,
    project.meta?.client && "Client : " + project.meta.client,
    project.meta?.architect && "Maître d’œuvre : " + project.meta.architect,
    project.meta?.studyDate && "Étude : " + project.meta.studyDate,
  ].filter(Boolean))
    write([{ text: t }], 11);
  const pending = articles.filter((a) => articleIssues(a).length).length;
  write(
    [
      {
        text: pending
          ? `Brouillon - ${pending} article(s) à compléter ou relire.`
          : "Articles marqués relus dans l’atelier.",
      },
    ],
    10,
    14,
  );
  // Sommaire réservé avant le corps. La pagination est renseignée après rendu,
  // sans refaire les calculs ni matérialiser le tableau de métré.
  const toc = articles.map((a) => ({
    a,
    lines: lines([{ text: a.number + " " + a.title }], 9, WIDTH - 40),
  }));
  const tocPages = [];
  let space = 0;
  for (const t of toc) {
    const height = t.lines.length * 13 + 5;
    if (!tocPages.length || space + height > H - 2 * M - 45) {
      tocPages.push({ page: doc.addPage([W, H]), items: [] });
      space = 0;
    }
    tocPages.at(-1).items.push(t);
    space += height;
  }
  let lot = "",
    sub = "";
  start();
  for (const a of articles) {
    if (a.lotHeading !== lot) {
      if (y < M + 220) start();
      lot = a.lotHeading;
      label(lot, 15);
    }
    if (a.subHeading !== sub) {
      sub = a.subHeading;
      label(sub, 12);
    }
    if (y < M + 100) start();
    a.pdfPage = doc.getPageCount();
    label(a.number + " " + a.title, 11);
    if (a.references)
      write(
        [
          {
            text: "Références citées - à vérifier au marché : " + a.references,
            italic: true,
          },
        ],
        9,
      );
    for (const [heading, blocks] of [
      ["Description des ouvrages", a.description],
      ["Mise en œuvre", a.execution],
      ["Localisation", a.location],
      ["Mode de métré", a.measurement || []],
    ]) {
      label(heading, 10);
      let n = 0;
      for (const b of blocks.length
        ? blocks
        : [{ runs: [{ text: "À compléter" }] }]) {
        n = b.list === "ordered" ? n + 1 : 0;
        write(
          [
            ...(b.list === "bullet"
              ? [{ text: "• " }]
              : n
                ? [{ text: n + ". " }]
                : []),
            ...b.runs,
          ],
          10,
          4,
        );
      }
    }
    if (a.unit)
      write(
        [{ text: "Unité de métré indicative : " + a.unit, italic: true }],
        9,
      );
    if (sources && a.source?.pages)
      write(
        [
          {
            text:
              "Source pédagogique : " +
              a.source.pages +
              (a.source.note ? " - " + a.source.note : ""),
            italic: true,
          },
        ],
        8,
      );
    if(sources)for(const link of a.source?.links||[])write([{text:link.label+' : '+link.url,italic:true}],8);
    y -= 12;
  }
  for (const t of tocPages) {
    page = t.page;
    y = H - M;
    label("Sommaire", 16);
    for (const item of t.items) {
      for (const [i, l] of item.lines.entries()) {
        drawLine(l, 9);
        if (!i)
          page.drawText(String(item.a.pdfPage), {
            x: W - M - 20,
            y,
            size: 9,
            font: normal,
          });
        y -= 13;
      }
      y -= 5;
    }
  }
  doc.getPages().forEach((p, i) =>
    p.drawText(`${i + 1} / ${doc.getPageCount()}`, {
      x: W - M - 42,
      y: 27,
      size: 8,
      font: normal,
    }),
  );
  return doc.save();
}
