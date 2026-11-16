/** Le parseur CAD et son WASM ne vivent plus sur le thread de saisie.
 * L'ArrayBuffer et le bitmap DXF sont transférés, pas recopiés.
 * Un import annulé termine le worker et libère immédiatement son tas WASM. */
export async function importCad(file, { signal, onProgress = () => {} } = {}) {
  if (signal?.aborted) throw new DOMException("Import annulé", "AbortError");
  const worker = new Worker(new URL("./cad-worker.js", import.meta.url), {
    type: "module",
  });
  let abort, timer;
  try {
    const buffer = await file.arrayBuffer();
    if (signal?.aborted) throw new DOMException("Import annulé", "AbortError");
    const result = await new Promise((resolve, reject) => {
      abort = () => reject(new DOMException("Import annulé", "AbortError"));
      signal?.addEventListener("abort", abort, { once: true });
      timer = setTimeout(
        () =>
          reject(
            new Error(
              "Le dessin dépasse le temps de lecture prévu. Importe un extrait ou un PDF.",
            ),
          ),
        120000,
      );
      worker.onerror = () =>
        reject(new Error("Le lecteur CAD a été interrompu."));
      worker.onmessage = ({ data }) => {
        if (data.progress) onProgress(data.progress);
        else if (data.error) reject(new Error(data.error));
        else resolve(data);
      };
      worker.postMessage({ buffer, name: file.name }, [buffer]);
    });
    if (result.bitmap)
      return {
        canvas: result.bitmap,
        unknown: result.unknown,
        curves: result.curves,
        entities: result.entities,
      };
    onProgress("Affichage du plan…");
    return {
      ...(await rasterSvg(result.svg)),
      unknown: result.unknown,
      entities: result.entities,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    worker.terminate();
  }
}
async function rasterSvg(raw) {
  const xml = new DOMParser().parseFromString(raw, "image/svg+xml");
  if (xml.querySelector("parsererror"))
    throw new Error("Le dessin ne produit pas de vue 2D exploitable.");
  const root = xml.documentElement,
    allowed = new Set([
      "svg",
      "g",
      "defs",
      "path",
      "line",
      "polyline",
      "polygon",
      "rect",
      "circle",
      "ellipse",
      "text",
      "tspan",
      "use",
      "symbol",
      "pattern",
      "clipPath",
    ]);
  for (const el of [...root.querySelectorAll("*")]) {
    if (!allowed.has(el.localName)) {
      el.remove();
      continue;
    }
    for (const a of [...el.attributes]) {
      if (
        ["stroke", "fill"].includes(a.name) &&
        /^(?:white|#fff(?:fff)?|rgb\(255,\s*255,\s*255\))$/i.test(a.value)
      )
        el.setAttribute(a.name, "#25372f");
      if (
        /^on/i.test(a.name) ||
        (/href$/i.test(a.name) && !a.value.startsWith("#")) ||
        /url\((?!['"]?#)/i.test(a.value)
      )
        el.removeAttribute(a.name);
    }
  }
  let box = (root.getAttribute("viewBox") || "").split(/[ ,]+/).map(Number);
  if (
    box.length !== 4 ||
    !box.every(Number.isFinite) ||
    box[2] <= 0 ||
    box[3] <= 0
  )
    throw new Error("Les limites du dessin ne permettent pas de l’afficher.");
  const ratio = 2400 / Math.max(box[2], box[3]),
    width = Math.max(1, Math.round(box[2] * ratio)),
    height = Math.max(1, Math.round(box[3] * ratio));
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(root)], {
      type: "image/svg+xml",
    }),
  );
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(new Error("Le rendu 2D du dessin a échoué."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return { canvas };
  } finally {
    URL.revokeObjectURL(url);
  }
}
