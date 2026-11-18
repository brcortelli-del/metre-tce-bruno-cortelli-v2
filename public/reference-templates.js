// Exports autonomes A4 portrait : tous les contenus utilisateur sont échappés.
import { calculate, lineAmount } from "./core.js";
import { cctpRowIsStale } from "./row-cctp.js";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n) =>
  Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 4 });
const money = (n) =>
  Number(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const CHUNK = 42;
function lines(text, width = 68) {
  return String(text || "")
    .split("\n")
    .flatMap((line) => {
      const words = line.split(/\s+/);
      const out = [];
      let value = "";
      for (const word of words) {
        if (value && value.length + word.length + 1 > width) {
          out.push(value);
          value = "";
        }
        for (let i = 0; i < word.length; i += width) {
          const part = word.slice(i, i + width);
          if (i > 0) {
            out.push(value);
            value = "";
          }
          value += (value ? " " : "") + part;
        }
      }
      out.push(value);
      return out;
    });
}
function base(title, body) {
  return (
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' +
    esc(title) +
    "</title><style>" +
    CSS +
    '</style></head><body><nav><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><span>Format A4 portrait · échelle 100 % · désactiver les en-têtes et pieds de page du navigateur.</span></nav>' +
    body +
    "</body></html>"
  );
}
function projectHeader(project, index, pages) {
  return (
    '<table class="operation"><tr><td><b>OPÉRATION</b> ' +
    esc(project.title) +
    "<br><b>TRAVAUX DE :</b> " +
    esc(project.meta?.address || "À renseigner") +
    '</td><td class="page-no">PAGE<br>' +
    index +
    " / " +
    pages +
    "</td></tr></table>"
  );
}
export function avantMetreHTML(project) {
  let carry = 0;
  const records = [];
  for (const [rowIndex, row] of (project.rows || []).entries()) {
    const r = calculate(row.input, project.variables || [], project);
    const price = row.unitPrice,
      priced = price != null && price !== "" && Number.isFinite(Number(price));
    const amount = priced ? lineAmount(r.total,price) : null;
    const description = [
      row.label,
      "Lot : " + row.lot,
      ...([row.level, row.room || row.location].some(Boolean)
        ? [
            "Localisation : " +
              [row.level, row.room || row.location].filter(Boolean).join(" / "),
          ]
        : []),
      ...r.steps,
    ];
    const wrapped = description.flatMap((t) => lines(t, 54));
    wrapped.forEach((line, i) =>
      records.push({
        code: i === 0 ? row.rowNumber || String(rowIndex + 1) : "",
        times: i === 0 ? row.code || "" : "",
        text: line,
        unit: i === 0 ? r.unit : "",
        quantity: i === 0 ? fmt(r.total) : "",
        price: i === 0 && priced ? money(price) : "",
        amount: i === 0 && amount != null ? money(amount) : "",
        numericAmount: i === 0 ? amount || 0 : 0,
      }),
    );
  }
  const pages = [];
  for (let i = 0; i < records.length || i === 0; i += CHUNK)
    pages.push(records.slice(i, i + CHUNK));
  const missing = (project.rows || []).filter(
    (r) => r.unitPrice == null || r.unitPrice === "",
  ).length;
  return base(
    "Avant-métré — " + project.title,
    pages
      .map((page, p) => {
        const before = carry;
        for (const r of page) carry += r.numericAmount;
        const blanks = Array.from({ length: CHUNK - page.length }, () => ({}));
        return (
          '<section class="sheet avant"><small class="brand">Atelier Métré Pro</small>' +
          projectHeader(project, p + 1, pages.length) +
          '<table class="grid"><colgroup><col style="width:5%"><col style="width:3%"><col style="width:57%"><col style="width:5%"><col style="width:10%"><col style="width:10%"><col style="width:10%"></colgroup><thead><tr><th>N°</th><th class="times-head">Index</th><th>DÉSIGNATION</th><th>U</th><th>Quant</th><th>PV HT</th><th>Montant</th></tr></thead><tbody><tr class="report"><td colspan="6">REPORT</td><td class="num">' +
          money(before) +
          "</td></tr>" +
          [...page, ...blanks]
            .map(
              (r) =>
                "<tr><td>" +
                esc(r.code) +
                '</td><td class="num">' +
                esc(r.times) +
                '</td><td class="designation">' +
                esc(r.text) +
                "</td><td>" +
                esc(r.unit) +
                '</td><td class="num">' +
                esc(r.quantity) +
                '</td><td class="num">' +
                esc(r.price) +
                '</td><td class="num">' +
                esc(r.amount) +
                "</td></tr>",
            )
            .join("") +
          '</tbody><tfoot><tr><td colspan="5">À REPORTER' +
          (missing
            ? " · total partiel, " + missing + " ligne(s) sans prix"
            : "") +
          '</td><td colspan="2" class="num">' +
          money(carry) +
          '</td></tr><tr><td colspan="7">BAS DE PAGE ' +
          (p + 1) +
          " / " +
          pages.length +
          "</td></tr></tfoot></table></section>"
        );
      })
      .join(""),
  );
}
export function cctpTemplateHTML(project) {
  const records = [];
  const sorted = [...(project.rows || [])].sort((a, b) =>
    String(a.lot).localeCompare(String(b.lot), "fr"),
  );
  let lastLot = "";
  for (const row of sorted) {
    if (lastLot !== row.lot) {
      records.push({ code: "", element: "LOT", text: row.lot, strong: true });
      lastLot = row.lot;
    }
    const stale = cctpRowIsStale(row, project.country);
    const article =
      row.cctpArticle?.text ||
      "ARTICLE CCTP NON RÉDIGÉ — à compléter avant rendu.";
    const wrapped = lines(
      "Localisation : " +
        [row.level, row.room || row.location].filter(Boolean).join(" / ") +
        "\n" +
        (stale ? "À RELIRE : le métré a changé depuis cet article.\n" : "") +
        article,
      72,
    );
    const codes = lines(row.code || row.rowNumber || "—", 8),
      elements = lines(row.label, 20);
    for (
      let i = 0;
      i < Math.max(wrapped.length, codes.length, elements.length);
      i++
    )
      records.push({
        code: codes[i] || "",
        element: elements[i] || "",
        text: wrapped[i] || "",
      });
  }
  const pages = [];
  for (let i = 0; i < records.length || i === 0; i += CHUNK)
    pages.push(records.slice(i, i + CHUNK));
  return base(
    "CCTP — " + project.title,
    pages
      .map(
        (page, p) =>
          '<section class="sheet cctp"><small class="brand">Atelier Métré Pro · ' +
          esc(project.title) +
          " · " +
          (p + 1) +
          " / " +
          pages.length +
          '</small><table class="grid"><colgroup><col style="width:10%"><col style="width:19%"><col style="width:71%"></colgroup><thead><tr><th>CODE</th><th>ÉLÉMENTS/<br>FONCTIONS</th><th class="components">-COMPOSANTS <span class="lots">-Lots concernés</span><br>　*mise en œuvre<br>Localisation :</th></tr></thead><tbody>' +
          [...page, ...Array.from({ length: CHUNK - page.length }, () => ({}))]
            .map(
              (r) =>
                "<tr" +
                (r.strong ? ' class="lot"' : "") +
                "><td>" +
                esc(r.code) +
                "</td><td>" +
                esc(r.element) +
                "</td><td>" +
                esc(r.text) +
                "</td></tr>",
            )
            .join("") +
          "</tbody></table></section>",
      )
      .join(""),
  );
}
export function openReferenceTemplate(project, type) {
  const html =
    type === "cctp" ? cctpTemplateHTML(project) : avantMetreHTML(project);
  const dialog = document.createElement("dialog");
  dialog.setAttribute(
    "aria-label",
    type === "cctp"
      ? "Trame CCTP de référence"
      : "Trame avant-métré de référence",
  );
  dialog.style.cssText =
    "width:96vw;max-width:1100px;height:92vh;max-height:94vh;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;";
  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;color:#0f172a;";
  const title = document.createElement("strong");
  title.textContent = type === "cctp" ? "Trame CCTP" : "Trame avant-métré";
  const close = document.createElement("button");
  close.textContent = "Fermer la trame";
  close.style.cssText = "padding:8px 12px;cursor:pointer;";
  close.onclick = () => dialog.close();
  header.append(title, close);
  const frame = document.createElement("iframe");
  frame.title = title.textContent;
  frame.style.cssText = "width:100%;height:calc(100% - 45px);border:0;";
  frame.srcdoc = html;
  dialog.append(header, frame);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
const CSS = `@page{size:A4 portrait;margin:9mm}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;color:#000;font-family:"Times New Roman",serif}nav{display:flex;gap:15px;align-items:center;padding:14px;font:13px Arial,sans-serif;position:sticky;top:0;background:#fff;border-bottom:1px solid #bbb}nav button{padding:10px;cursor:pointer}.sheet{width:192mm;min-height:277mm;background:#fff;margin:18px auto;padding:3mm 2mm;break-after:page}.sheet:last-child{break-after:auto}.brand{display:block;font:8px Arial;margin-bottom:2mm}.operation{width:100%;border:2px solid #000;margin-bottom:2mm;border-collapse:collapse;font:10px Arial}.operation td{padding:3px;border:1px solid #000}.page-no{width:11%;text-align:center}.grid{width:100%;table-layout:fixed;border-collapse:collapse;border:2px solid #000}.grid th{border:1px solid #000;border-bottom:2px solid #000;text-align:center;padding:4px 2px;font-size:10px;height:12mm}.grid td{border-left:1px solid #000;border-right:1px solid #000;font-size:9px;height:5.4mm;line-height:4.2mm;vertical-align:top;padding:0 2px;overflow-wrap:anywhere}.avant .grid td{border-bottom:.5px solid #777;font-family:Arial,sans-serif;font-size:8px;line-height:4.2mm}.avant .grid .num{text-align:right;font-variant-numeric:tabular-nums;font-family:monospace;white-space:nowrap;font-size:7.5px}.grid .report td,.grid tfoot td{font-weight:bold;border-top:2px solid #000;height:4mm;line-height:3mm}.times-head{writing-mode:vertical-rl}.cctp .grid th{font-style:italic;font-size:14px;height:17mm}.cctp .grid .components{text-align:left}.cctp .grid td{border-bottom:1px dotted #000;font-size:10px}.lots{float:right;font-size:12px}.lot td{font-weight:bold;background:#f3f3f3}.cctp .grid td:nth-child(2){font-size:9px;line-height:3.4mm}@media print{body{background:white}nav{display:none}.sheet{margin:0;padding:0;width:192mm;min-height:0}.grid{print-color-adjust:exact}.grid tr{break-inside:avoid}}`;
