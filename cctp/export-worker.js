import { createCctpDocx, createCctpPdf } from "./exports.js";
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "pdf" && !self.PDFLib)
      importScripts("/vendor/pdf-lib/pdf-lib.min.js");
    const bytes =
      data.type === "pdf"
        ? await createCctpPdf(data.project, self.PDFLib, data.options)
        : createCctpDocx(data.project, data.options);
    self.postMessage({ bytes }, [bytes.buffer]);
  } catch (e) {
    self.postMessage({ error: e.message || String(e) });
  }
};
