import { dxfPrimitives } from "./dxf-core.js";

function rasterDxf(result) {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const shape of result.shapes)
    for (const p of shape.points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(
        maxX,
        p.x + (shape.text ? shape.height * shape.text.length * 0.6 : 0),
      );
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y + (shape.text ? shape.height : 0));
    }
  const w = Math.max(maxX - minX, 0.01),
    h = Math.max(maxY - minY, 0.01),
    scale = 2300 / Math.max(w, h),
    padding = 50;
  const canvas = new OffscreenCanvas(
      Math.max(150, Math.round(w * scale + padding * 2)),
      Math.max(150, Math.round(h * scale + padding * 2)),
    ),
    ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ctx.fillStyle = "#263a30";
  ctx.lineWidth = 1.5;
  const xy = (p) => ({
    x: padding + (p.x - minX) * scale,
    y: canvas.height - padding - (p.y - minY) * scale,
  });
  for (const shape of result.shapes) {
    const points = shape.points.map(xy);
    if (shape.text) {
      ctx.save();
      ctx.translate(points[0].x, points[0].y);
      ctx.rotate(-shape.rotation);
      ctx.font = Math.max(4, shape.height * scale) + "px Arial";
      ctx.fillText(shape.text, 0, 0);
      ctx.restore();
    } else {
      ctx.beginPath();
      points.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      if (shape.closed) ctx.closePath();
      ctx.stroke();
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return canvas.transferToImageBitmap();
}
self.onmessage = async ({ data: { buffer, name } }) => {
  try {
    self.postMessage({ progress: "Décodage du dessin…" });
    if (name.toLowerCase().endsWith(".dxf")) {
      await import("./vendor/dxf-parser/dxf-parser.js");
      const drawing = new self.DxfParser().parseSync(
        new TextDecoder().decode(buffer),
      );
      if (drawing.entities.length > 200000)
        throw new Error(
          "Le dessin dépasse 200 000 entités. Importe un extrait.",
        );
      const result = dxfPrimitives(drawing),
        bitmap = rasterDxf(result);
      self.postMessage(
        {
          bitmap,
          unknown: result.unknown,
          curves: result.curves,
          entities: result.entities,
        },
        [bitmap],
      );
    } else {
      const lib = await import("./vendor/libredwg/dist/libredwg-web.js"),
        decoder = await lib.LibreDwg.create(
          new URL("./vendor/libredwg/wasm", import.meta.url).href,
        );
      let pointer;
      try {
        pointer = decoder.dwg_read_data(buffer, lib.Dwg_File_Type.DWG);
        if (!pointer)
          throw new Error("Ce fichier DWG ne peut pas être décodé.");
        const converted = decoder.convertEx(pointer),
          entities = converted.database.entities.length;
        if (!entities || entities > 200000)
          throw new Error(
            "Dessin DWG vide ou supérieur à 200 000 entités reconnues.",
          );
        self.postMessage({ progress: "Préparation de la vue 2D…" });
        self.postMessage({
          svg: decoder.dwg_to_svg(converted.database),
          unknown: converted.stats.unknownEntityCount || 0,
          entities,
        });
      } finally {
        if (pointer) decoder.dwg_free(pointer);
      }
    }
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
