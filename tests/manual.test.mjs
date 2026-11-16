import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { searchManual, visibleManualSections, manualPrintChapters, sectionText } from "../ux/manual-model.js";
import { evaluateExpression } from "../public/expression.js";
const data = JSON.parse(await fs.readFile("public/manual/content.json", "utf8"));

test("les PDF joints restent complets et leurs illustrations sont disponibles", async () => {
  assert.equal(data.documents.length, 2);
  assert.deepEqual(data.documents.map((d) => d.pages), [28, 24]);
  for (const doc of data.documents) {
    const bytes = await fs.readFile("public" + doc.url);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), doc.sha256);
    assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
  }
  const sections = data.chapters.flatMap((c) => c.sections);
  assert.equal(new Set(sections.map((s) => s.id)).size, 49);
  assert.equal(sections.filter(s=>s.document==='guide'||s.document==='exercise').length,40);
  const images = sections.flatMap((s) => s.blocks.filter((b) => b.type === "image"));
  assert.equal(images.length, 6);
  for (const im of images) {
    assert.ok(im.width > 200 && im.height > 100);
    assert.ok((await fs.stat("public" + im.src)).size > 0);
  }
  for (const section of sections) if (section.pdfPage) {
    const doc = data.documents.find((d) => d.id === section.document);
    assert.ok(section.pdfPage > 0 && section.pdfPage <= doc.pages);
  }
});

test('manuel complet : cinq chapitres, liens internes et recherche des nouveaux modules',()=>{
  assert.deepEqual(data.chapters.map(c=>c.id),['prise-en-main','pas-a-pas','cctp-export','chiffrage-appro','exercice']);
  assert.equal(data.chapters.at(-1).number,'05');
  const chapter=data.chapters.find(c=>c.id==='chiffrage-appro');
  assert.equal(chapter.sections.length,9);
  assert.ok(chapter.sections.every(s=>s.document===null&&s.pdfPage===null&&!s.correction));
  const actions=chapter.sections.flatMap(s=>s.blocks.filter(b=>b.type==='action'));
  assert.deepEqual(new Set(actions.map(a=>a.view)),new Set(['prices','needs','assemblies','minute','cctp']));
  assert.ok(searchManual(data,'conditionnements').items.some(r=>r.chapterId==='chiffrage-appro'));
  assert.ok(searchManual(data,'Bénéfice Aléas').items.some(r=>r.chapterId==='chiffrage-appro'));
});

test('impression complète : le corrigé suit le même choix que la lecture, sans fuite dans le mode apprenant',()=>{
  const before=JSON.stringify(data), student=manualPrintChapters(data), teacher=manualPrintChapters(data,true);
  assert.equal(student.length,5); assert.equal(teacher.length,5);
  assert.equal(student.flatMap(c=>c.sections).length,34);
  assert.equal(teacher.flatMap(c=>c.sections).length,49);
  assert.ok(student.flatMap(c=>c.sections).every(s=>!s.correction));
  assert.ok(!student.flatMap(c=>c.sections).map(sectionText).join(' ').includes('8,013'));
  assert.ok(teacher.flatMap(c=>c.sections).map(sectionText).join(' ').includes('8,013'));
  assert.equal(JSON.stringify(data),before);
});

test("le corrigé reste masqué dans les chapitres et la recherche jusqu’au choix explicite", () => {
  const exercise = data.chapters.find((c) => c.id === "exercice");
  assert.equal(exercise.sections.filter((s) => s.correction).length, 15);
  assert.ok(visibleManualSections(exercise).every((s) => !s.correction));
  assert.equal(searchManual(data, "8,013").total, 0);
  assert.ok(searchManual(data, "8,013", true).items.every((r) => r.chapterId === "exercice"));
  assert.ok(searchManual(data, "8,013", true).total > 0);
  assert.ok(searchManual(data, "etalonnage").items.some((r) => r.chapterId === "pas-a-pas"));
  assert.equal(searchManual(data, "e").total, 0);
});

test("les douze quantités de la minute reproduisent les formules du garage", () => {
  const exercise = data.chapters.find((c) => c.id === "exercice");
  const rows = exercise.sections.filter((s) => s.correction)
    .flatMap((s) => s.blocks.filter((b) => b.type === "table" && b.rows[0].length === 11))
    .flatMap((t) => t.rows.slice(1));
  assert.equal(rows.length, 12);
  const formulas = {
    "TER 01": "(6+1)*(4+1)*0.2",
    "TER 02": "19.2*0.6*0.8",
    "TER 03": "9.216-0.576-2.4-1.92",
    "TER 04": "(9.216-4.32)*1.25",
    "GO 01": "19.2*0.6*0.05",
    "GO 02": "19.2*0.5*0.25",
    "GO 03": "19.2*0.2*0.85",
    "GO 04": "5.6*3.6*0.2",
    "GO 05": "5.6*3.6*0.15",
    "GO 06": "19.2*2.5-(2.4*2+0.9*2.15+1.2)",
    "FIN 01": "18.4*2.5-(2.4*2+0.9*2.15+1.2)",
    "FIN 02": "18.4*2.5-(2.4*2+0.9*2.15+1.2)",
  };
  for (const row of rows) {
    const computed = evaluateExpression(formulas[row[1]], row[10]);
    assert.ok(Math.abs(computed - Number(row[9].replace(",", "."))) < 1e-9, row[1]);
  }
});
