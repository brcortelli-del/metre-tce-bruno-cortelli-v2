import { createVirtualTable } from "./virtual-table.js";
import { fmt, money, parseUnitPrice, lineAmount } from "./core.js";
import { lotStyle } from './lot-colors.js';
import { rowCctpButtonMarkup } from './row-cctp.js';
import {premiumActionsMarkup} from './premium-metre.js';
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const esc = escapeHtml;
export function createTakeoffView({ container, body, getProject, isReadOnly }) {
  const markup = (row, i) => {
    const price = parseUnitPrice(row.unitPrice),
      amount = lineAmount(row.result.total, price),
      currency = getProject().settings.currency;
    return `<td>${esc(row.rowNumber || String(i + 1).padStart(2, "0"))}</td><td>${esc(row.code || "—")}</td><td class="report-cell">${esc(row.report || "—")}</td><td class="designation-cell"><div class="row-label">${esc(row.label)}</div><div class="row-location">${esc([row.building, row.level, row.room, row.location].filter(Boolean).join(" / "))}</div><span class="row-lot" style="${lotStyle(row.lot)}">${esc(row.lot)}</span><ul class="row-steps">${row.result.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></td><td>${row.result.unit}</td><td class="numeric row-qty ${row.result.total < 0 ? "deduction-value" : ""}">${fmt(row.result.total, 3)}</td><td class="numeric row-price">${price === null ? "—" : money(price, currency)}</td><td class="numeric row-amount">${amount === null ? "—" : money(amount, currency)}</td><td class="actions-cell">${rowCctpButtonMarkup(row)}${premiumActionsMarkup(row)}<div class="row-actions" ${isReadOnly() ? "hidden" : ""}>${row.input.planLink ? `<button class="quiet" data-action="plan" data-id="${esc(row.id)}">Voir le plan</button>` : ""}<button class="quiet" data-action="edit" data-id="${esc(row.id)}" aria-label="Modifier ${esc(row.label)}">Modifier</button><button class="quiet delete" data-action="delete" data-id="${esc(row.id)}" aria-label="Supprimer ${esc(row.label)}">Supprimer</button></div></td>`;
  };
  return createVirtualTable({
    container,
    body,
    columns: 9,
    estimate: 225,
    renderRow: (row, i) => {
      const el = document.createElement("tr");
      el.innerHTML = markup(row, i);
      return el;
    },
    updateRow: (el, row, previous, i) => {
      el.innerHTML = markup(row, i);
    },
  });
}
