import * as IFC from "web-ifc";
import { extractIfc } from "./ifc-extract.js";
self.onmessage = async ({ data }) => {
  const api = new IFC.IfcAPI();
  let model = -1;
  try {
    api.SetWasmPath(new URL("./", self.location.href).href, true);
    await api.Init(undefined, true); // mono-thread : pas de SharedArrayBuffer / COOP requis
    model = api.OpenModel(new Uint8Array(data.buffer));
    if (model < 0) throw new Error("IFC illisible ou schéma non reconnu.");
    const result = extractIfc(api, model, IFC, (message) =>
      self.postMessage({ progress: message }),
    );
    self.postMessage({ result });
  } catch (e) {
    self.postMessage({
      error:
        e.message ||
        "Impossible de lire cet IFC. Essaie une nomenclature CSV/XLSX.",
    });
  } finally {
    if (model >= 0) api.CloseModel(model);
    api.Dispose();
  }
};
