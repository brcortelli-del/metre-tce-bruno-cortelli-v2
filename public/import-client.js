import { MAX_IMPORT_BYTES } from "./import-core.js";
export async function readCadBim(
  file,
  { signal, onProgress = () => {}, unit = "" } = {},
) {
  const format = file.name.split(".").pop().toLowerCase();
  if (!["dxf", "csv", "xlsx", "ifc"].includes(format))
    throw new Error("Formats acceptés : DXF, CSV, XLSX et IFC.");
  if (!file.size || file.size > MAX_IMPORT_BYTES)
    throw new Error(
      "Fichier vide ou supérieur à 35 Mo. Exporte une sélection du chantier.",
    );
  if (signal?.aborted) throw new DOMException("Import annulé", "AbortError");
  const buffer = await file.arrayBuffer();
  if (signal?.aborted) throw new DOMException("Import annulé", "AbortError");
  return new Promise((resolve, reject) => {
    // Les gros parseurs sont chargés à la demande et exécutés hors du thread UI.
    const worker = new Worker(
      format === "ifc" ? "/ux/ifc-worker.js" : "/ux/import-worker.js",
      { type: "module" },
    );
    const clean = () => {
      clearTimeout(timer);
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      clean();
      reject(new DOMException("Import annulé", "AbortError"));
    };
    const timer = setTimeout(() => {
      clean();
      reject(
        new Error(
          "Lecture trop longue (120 s). Exporte une sélection ou une nomenclature CSV.",
        ),
      );
    }, 120000);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }) => {
      if (data.progress) {
        onProgress(data.progress);
        return;
      }
      clean();
      if (data.error) reject(new Error(data.error));
      else resolve({ ...data.result, format });
    };
    worker.onerror = () => {
      clean();
      reject(
        new Error(
          "Le lecteur a rencontré une erreur. Vérifie le fichier et recharge le site.",
        ),
      );
    };
    worker.postMessage({ format, buffer, unit }, [buffer]);
  });
}
