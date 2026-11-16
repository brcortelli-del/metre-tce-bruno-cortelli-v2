import { createVirtualTable, installGridKeyboard } from "./virtual-table.js";
import { escapeHtml as esc } from "./takeoff-view.js";
import { fieldsFor, fmt } from "./core.js";
import { lotStyle } from './lot-colors.js';
import { rowCctpButtonMarkup } from './row-cctp.js';
import {premiumActionsMarkup} from './premium-metre.js';

export function createMinuteView({
  container,
  body,
  getProject,
  updateRow,
  canWrite,
  onError,
}) {
  const value = (row, key) =>
    ["count", "deduction"].includes(key)
      ? row.input[key]
      : row.input.dimensions[key];
  const markup = (row) => {
    const fields = fieldsFor(row.input.preset, row.input.outputUnit);
    return `<td>${esc(row.rowNumber)}</td><td>${esc(row.code)}</td><td><span class="row-lot" style="${lotStyle(row.lot)}">${esc(row.lot)}</span><br><b>${esc(row.label)}</b><small>${esc([row.building, row.level, row.room, row.location].filter(Boolean).join(" / "))}</small>${row.input.planLink ? '<span class="linked-badge">Lié au plan</span>' : ""}</td>${["count", "L", "w", "h", "deduction"].map((key) => `<td>${["count", "deduction"].includes(key) || fields.some((f) => f[0] === key) ? `<input data-minute-id="${esc(row.id)}" data-minute-field="${key}" value="${esc(value(row, key))}" aria-label="${esc(key)} ${esc(row.code || row.rowNumber || row.label)}" ${!canWrite() ? "disabled" : ""} ${row.input.planLink?.field === key ? 'readonly title="Dimension liée au relevé de plan"' : ""}>` : "—"}</td>`).join("")}<td data-partial class="numeric">${fields.some(f=>f[0]==="Q") ? `<input data-minute-id="${esc(row.id)}" data-minute-field="Q" value="${esc(value(row,"Q"))}" aria-label="Quantité ${esc(row.code || row.rowNumber || row.label)}" ${!canWrite()?"disabled":""} ${row.input.planLink?.field==="Q"?"readonly":""}><small data-partial-result></small>` : ""}</td><td data-total class="numeric"></td><td>${row.result.unit}</td><td>${rowCctpButtonMarkup(row)}${premiumActionsMarkup(row)}<button class="quiet" data-edit-row="${esc(row.id)}" data-write>Fiche complète</button>${row.input.planLink ? `<button class="quiet" data-detach-row="${esc(row.id)}" data-write>Détacher du plan</button>` : ""}</td>`;
  };
  function quantities(el, row) {
    const partial = el.querySelector("[data-partial]"),
      total = el.querySelector("[data-total]");
    const partialResult = partial.querySelector("[data-partial-result]");
    if(partialResult) partialResult.textContent = "= " + fmt(row.result.total / row.result.count,3);
    else partial.textContent = fmt(row.result.total / row.result.count, 3);
    total.textContent = fmt(row.result.total, 3);
    for (const cell of [partial, total])
      cell.classList.toggle("deduction-value", row.result.total < 0);
  }
  const virtual = createVirtualTable({
    container,
    body,
    columns: 12,
    estimate: 104,
    renderRow: (row) => {
      const el = document.createElement("tr");
      el.innerHTML = markup(row);
      quantities(el, row);
      return el;
    },
    updateRow: (el, row, previous) => {
      // Chemin de frappe : conserver les input, la sélection et le focus.
      if (
        row.input.preset !== previous.input.preset ||
        row.input.outputUnit !== previous.input.outputUnit ||
        row.input.planLink?.field !== previous.input.planLink?.field ||
        !!row.input.planLink !== !!previous.input.planLink ||
        row.label !== previous.label ||
        row.cctpArticle !== previous.cctpArticle
      )
        el.innerHTML = markup(row);
      for (const input of el.querySelectorAll("[data-minute-field]"))
        if (input !== document.activeElement)
          input.value = value(row, input.dataset.minuteField) ?? "";
      quantities(el, row);
    },
  });
  function edit(event) {
    const started = performance.now();
    const input = event.target.closest("input[data-minute-id]");
    if (!input || !canWrite() || input.readOnly) return;
    const id = input.dataset.minuteId,
      key = input.dataset.minuteField;
    try {
      updateRow(id, (row) => {
        if (key === "count" || key === "deduction")
          row.input[key] = input.value;
        else row.input.dimensions[key] = input.value;
      });
      input.removeAttribute("aria-invalid");
      input.title = "";
      // Résultats immédiats, DOM limité à cette ligne ; aucun remontage du tableau.
      virtual.setItems(
        virtual
          .items()
          .map((row) =>
            row.id === id ? getProject().rows.find((r) => r.id === id) : row,
          ),
      );
      virtual.renderNow();
      body.dataset.lastEditMs = (performance.now() - started).toFixed(3);
    } catch (error) {
      input.setAttribute("aria-invalid", "true");
      input.title = error.message;
      if (event.type === "change") onError(error);
    }
  }
  body.addEventListener("input", edit);
  body.addEventListener("change", (event) => {
    if (event.target.getAttribute("aria-invalid") === "true") edit(event);
  });
  body.addEventListener("focusout", (event) => {
    const input = event.target;
    if (input.matches("[data-minute-field][aria-invalid=true]")) {
      const row = getProject().rows.find(
        (r) => r.id === input.dataset.minuteId,
      );
      if (row) input.value = value(row, input.dataset.minuteField);
      input.removeAttribute("aria-invalid");
    }
  });
  installGridKeyboard(body, virtual);
  return virtual;
}
