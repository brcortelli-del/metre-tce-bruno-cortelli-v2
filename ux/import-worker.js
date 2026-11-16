import DxfParser from "dxf-parser";
import ExcelJS from "exceljs";
import {
  decodeTable,
  parseCsv,
  dxfMeasurements,
  MAX_IMPORT_RECORDS,
} from "../public/import-core.js";
// Un seul Worker par import ; fermer le Worker annule aussi un parsing XLSX.
self.onmessage = async ({ data }) => {
  try {
    let result;
    if (data.format === "dxf")
      result = dxfMeasurements(
        new DxfParser().parseSync(decodeTable(data.buffer)),
        data.unit,
      );
    else if (data.format === "csv")
      result = {
        tables: [{ name: "CSV", ...parseCsv(decodeTable(data.buffer)) }],
      };
    else if (data.format === "xlsx") {
      // Vérification préalable des tailles ZIP décompressées, avant ExcelJS.
      const bytes = new Uint8Array(data.buffer),
        view = new DataView(data.buffer);
      let expanded = 0,
        entries = 0;
      for (let i = 0; i + 46 < bytes.length; i++)
        if (view.getUint32(i, true) === 0x02014b50) {
          const size = view.getUint32(i + 24, true);
          if (size === 0xffffffff)
            throw new Error("XLSX ZIP64 non pris en charge.");
          expanded += size;
          entries++;
          if (expanded > 100 * 1024 * 1024 || entries > 2000)
            throw new Error("XLSX trop volumineux une fois décompressé.");
          i +=
            45 +
            view.getUint16(i + 28, true) +
            view.getUint16(i + 30, true) +
            view.getUint16(i + 32, true);
        }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data.buffer);
      const tables = [];
      let formulaCount = 0;
      workbook.eachSheet((sheet) => {
        if (sheet.rowCount > MAX_IMPORT_RECORDS + 1 || sheet.columnCount > 200)
          throw new Error(
            "XLSX : maximum 20 000 lignes et 200 colonnes par feuille.",
          );
        const rows = [];
        sheet.eachRow((row) => {
          const cells = [];
          for (let c = 1; c <= sheet.columnCount; c++) {
            const v = row.getCell(c).value;
            if (
              v &&
              typeof v === "object" &&
              ("formula" in v || "sharedFormula" in v)
            ) {
              formulaCount++;
              cells.push("FORMULE_EXCEL_NON_IMPORTEE");
            } else if (v && typeof v === "object" && v.richText)
              cells.push(v.richText.map((r) => r.text).join(""));
            else if (v && typeof v === "object" && "text" in v)
              cells.push(String(v.text));
            else
              cells.push(
                typeof v === "number" || typeof v === "string" ? v : "",
              );
          }
          rows.push(cells);
        });
        if (rows.length > 1)
          tables.push({
            name: sheet.name,
            headers: rows
              .shift()
              .map((v, i) => String(v || "Colonne " + (i + 1))),
            rows,
          });
      });
      if (!tables.length)
        throw new Error("Aucune feuille avec en-tête et données.");
      result = {
        tables,
        warnings: formulaCount
          ? [
              formulaCount +
                " cellule(s) avec formule Excel exclue(s). Exporte des valeurs depuis Revit pour éviter des résultats en cache périmés.",
            ]
          : [],
      };
    } else throw new Error("Format non pris en charge.");
    self.postMessage({ result });
  } catch (e) {
    self.postMessage({ error: e.message || String(e) });
  }
};
