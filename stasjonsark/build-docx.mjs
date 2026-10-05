// Lager en redigerbar Word-versjon av stasjonsarkene:
//   node stasjonsark/build-docx.mjs
// → stasjonsark/Stasjonsark.docx
// Tekstene hentes fra stasjonsark.html. Illustrasjonene og muskelkartene
// tegnes i Chromium og legges inn som bilder; all tekst er vanlig, redigerbar Word-tekst.

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium, docx;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }
try { docx = require("docx"); }
catch { docx = require("/opt/node-tools/node_modules/docx"); }
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, AlignmentType, LevelFormat, TableLayoutType, LineRuleType,
} = docx;

const here = path.dirname(new URL(import.meta.url).pathname);

/* ---------- Hent data og bilder fra HTML-versjonen ---------- */
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 3 });
await page.goto("file://" + path.join(here, "stasjonsark.html"), { waitUntil: "networkidle" });
await page.addStyleTag({ content: ".top{display:none!important}" });
await page.evaluate(() => document.fonts.ready);

const data = await page.evaluate(() => ({
  ex: EX.map((e) => ({
    id: e.id, name: e.name, color: e.color, soft: e.soft, ink: e.ink, darkText: !!e.darkText,
    sub: e.sub, reps: e.reps, repsNote: e.repsNote || "", partner: e.partner || "",
    steps: e.steps, theory: e.theory,
    prim: e.prim.map((k) => (e.labels && e.labels[k]) || M[k]),
    sec: e.sec.map((k) => (e.labels && e.labels[k]) || M[k]),
    alt: { name: e.alt.name, text: e.alt.text, fit: e.alt.fit, reps: e.alt.reps },
  })),
  q: Q,
}));

const shot = async (sel) => {
  const el = await page.$(sel);
  const box = await el.boundingBox();
  return { buf: await el.screenshot({ omitBackground: false }), w: box.width, h: box.height };
};
const img = {};
for (const e of data.ex) {
  img[e.id] = {
    illu: await shot(`#${e.id} .illu`),
    map: await shot(`#${e.id} .muscles svg`),
    alt: await shot(`#${e.id} .alt svg`),
  };
}
await browser.close();

/* ---------- Hjelpere ---------- */
const hex = (c) => c.replace("#", "").toUpperCase();
const FONT = "Calibri", DISPLAY = "Arial Black", INK = "2F2A3B", MUTED = "625C70";
const PAGE_W = 11906, MARGIN = 720, CONTENT = PAGE_W - 2 * MARGIN; // A4 i DXA
const PX_PER_DXA = 96 / 1440;
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none };
const run = (text, o = {}) => new TextRun({ text, font: o.font || FONT, size: o.size || 19, bold: o.bold, italics: o.italics, color: o.color || INK, characterSpacing: o.spacing });
const para = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], spacing: { before: o.before || 0, after: o.after ?? 60, line: o.line || 252, lineRule: LineRuleType.AUTO }, alignment: o.align, numbering: o.numbering, keepNext: o.keepNext });
const image = (im, widthDxa, maxHDxa = Infinity) => {
  const w = Math.round(Math.min(widthDxa, maxHDxa * im.w / im.h) * PX_PER_DXA);
  return new ImageRun({ type: "png", data: im.buf, transformation: { width: w, height: Math.round(w * im.h / im.w) } });
};
const cell = (children, width, o = {}) => new TableCell({
  children, width: { size: width, type: WidthType.DXA },
  shading: o.fill ? { fill: hex(o.fill), type: ShadingType.CLEAR, color: "auto" } : undefined,
  borders: o.borders || noBorders,
  margins: { top: o.pad ?? 140, bottom: o.pad ?? 140, left: o.padX ?? 200, right: o.padX ?? 200 },
  verticalAlign: o.vAlign,
  columnSpan: o.span,
});
const table = (widths, rows) => new Table({
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: widths, layout: TableLayoutType.FIXED, borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
  rows: rows.map((cells) => new TableRow({ children: cells, cantSplit: true })),
});
const spacer = (after = 120) => new Paragraph({ children: [], spacing: { before: 0, after, line: 120, lineRule: LineRuleType.AUTO } });
const eyebrow = (text, color) => para(run(text.toUpperCase(), { size: 15, bold: true, color, spacing: 30 }), { after: 20 });
const h3 = (text, color) => para([run("● ", { color, size: 24, font: FONT }), run(text, { font: DISPLAY, size: 24 })], { after: 100 });

/* ---------- Ett øvelsesark ---------- */
const numbering = [];
function exerciseSheet(e, i) {
  const ref = `steg-${e.id}`;
  numbering.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { run: { bold: true, color: hex(e.color), font: DISPLAY, size: 20 }, paragraph: { indent: { left: 400, hanging: 400 } } } }] });
  const onColor = e.darkText ? hex(e.ink) : "FFFFFF";
  const col = hex(e.color), ci = hex(e.ink);

  const header = table([CONTENT], [[cell([
    para(run("STYRKESTASJON", { size: 16, bold: true, color: onColor, spacing: 40 }), { after: 0 }),
    para(run(e.name, { font: DISPLAY, size: 60, color: onColor }), { after: 40, line: 240 }),
    para(run(e.sub, { size: 21, bold: true, color: onColor }), { after: 0 }),
  ], CONTENT, { fill: e.color, pad: 220, padX: 340 })]]);

  const illu = para(image(img[e.id].illu, CONTENT, 2900), { align: AlignmentType.CENTER, after: 0 });

  const LEFT = Math.round(CONTENT * 0.55), RIGHT = CONTENT - LEFT - 200;
  const steps = e.steps.map(([b, t]) => para([run(b + " ", { bold: true }), run(t)], { numbering: { reference: ref, level: 0 }, after: 70 }));
  const dose = table([LEFT - 120], [[cell([
    para(run(`3 × ${e.reps}`, { font: DISPLAY, size: 40, color: onColor }), { after: 0, line: 240 }),
    para(run(`sett × repetisjoner${e.repsNote ? " " + e.repsNote : ""}`, { size: 16, bold: true, color: onColor }), { after: 60 }),
    para([run("Hvile: ", { bold: true, size: 18, color: onColor }), run("mens partneren din tar sitt sett. Bytt etter hvert sett.", { size: 18, color: onColor })], { after: 30 }),
    e.partner
      ? para(run(e.partner, { size: 18, color: onColor }), { after: 0 })
      : para([run("Partneren: ", { bold: true, size: 18, color: onColor }), run("følg med på teknikken og si fra hvis noe kan bli bedre.", { size: 18, color: onColor })], { after: 0 }),
  ], LEFT - 120, { fill: e.color, pad: 160, padX: 240 })]]);
  const legendRow = (sym, title, list) => [
    para([run(sym + " ", { color: col, size: 22 }), run(title, { bold: true, size: 19 })], { after: 10 }),
    para(list.flatMap(([n, l], j) => [run(n + " ", { size: 17 }), run(`(${l})${j < list.length - 1 ? ", " : ""}`, { size: 17, italics: true, color: MUTED })]), { after: 80 }),
  ];
  const lineBorder = { style: BorderStyle.SINGLE, size: 8, color: "DCDFE6" };
  const mid = table([LEFT, 200, RIGHT], [[
    cell([h3("Slik gjør du det", e.color), ...steps, spacer(80), dose], LEFT, { pad: 0, padX: 0 }),
    cell([para([])], 200, { pad: 0, padX: 0 }),
    cell([
      h3("Muskler som jobber", e.color),
      para(image(img[e.id].map, RIGHT - 340, 2500), { align: AlignmentType.CENTER, after: 80 }),
      ...legendRow("■", "Jobber mest", e.prim),
      ...legendRow("▨", "Hjelper til", e.sec),
    ], RIGHT, { borders: { top: lineBorder, bottom: lineBorder, left: lineBorder, right: lineBorder }, pad: 160, padX: 170 }),
  ]]);

  const HALF = Math.round((CONTENT - 200) / 2);
  const colBorder = { style: BorderStyle.SINGLE, size: 14, color: col };
  const low = table([HALF, 200, HALF], [[
    cell([
      eyebrow("Treningslære", ci),
      para(run(e.theory.t, { font: DISPLAY, size: 24 }), { after: 80 }),
      ...e.theory.p.map((p) => para(run(p, { size: 18 }), { after: 60 })),
    ], HALF, { borders: { top: colBorder, bottom: colBorder, left: colBorder, right: colBorder }, pad: 160, padX: 220 }),
    cell([para([])], 200, { pad: 0, padX: 0 }),
    cell([
      eyebrow("Alternativ øvelse", ci),
      para([run(e.alt.name + "  ", { font: DISPLAY, size: 24 }), run(e.alt.reps, { bold: true, size: 17, color: ci })], { after: 60 }),
      para(image(img[e.id].alt, HALF - 440, 1250), { align: AlignmentType.CENTER, after: 60 }),
      para(run(e.alt.text, { size: 18 }), { after: 60 }),
      para([run("Passer hvis ", { bold: true, size: 18, color: ci }), run(e.alt.fit, { size: 18 })], { after: 0 }),
    ], HALF, { fill: e.soft, pad: 160, padX: 220 }),
  ]]);

  return [header, spacer(140), illu, spacer(140), mid, spacer(160), low];
}

/* ---------- Refleksjonsarket ---------- */
function reflectionSheet() {
  const header = table([CONTENT], [[cell([
    para(run("TIL LÆREREN · AVSLUTNING AV TIMEN", { size: 16, bold: true, color: "FFFFFF", spacing: 40 }), { after: 0 }),
    para(run("Refleksjon etter økta", { font: DISPLAY, size: 52, color: "FFFFFF" }), { after: 40, line: 240 }),
    para(run("Velg 4–6 spørsmål. La elevene snakke to og to i 1–2 minutter før dere tar svarene felles.", { size: 21, bold: true, color: "FFFFFF" }), { after: 0 }),
  ], CONTENT, { fill: "#2F2A3B", pad: 220, padX: 340 })]]);
  const stripeW = Math.floor(CONTENT / data.ex.length);
  const widths = data.ex.map((_, i) => i < data.ex.length - 1 ? stripeW : CONTENT - stripeW * (data.ex.length - 1));
  const stripes = table(widths, [data.ex.map((e, i) => cell([new Paragraph({ children: [], spacing: { after: 0, line: 100, lineRule: LineRuleType.AUTO } })], widths[i], { fill: e.color, pad: 20, padX: 0 }))]);

  numbering.push({ reference: "sporsmal", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { run: { bold: true, font: DISPLAY, size: 19 }, paragraph: { indent: { left: 440, hanging: 440 } } } }] });
  const HALF = Math.round((CONTENT - 200) / 2);
  const block = (g) => table([HALF], [[cell([
    para(run(g.t, { font: DISPLAY, size: 24, color: hex(g.i) }), { after: 100 }),
    ...g.q.flatMap(([q, h]) => [
      para(run(q, { bold: true, size: 19 }), { numbering: { reference: "sporsmal", level: 0 }, after: h ? 20 : 110 }),
      ...(h ? [new Paragraph({ indent: { left: 440 }, spacing: { after: 110, line: 240, lineRule: LineRuleType.AUTO }, children: h.split(/<b>|<\/b>/).map((t, j) => run(t, { size: 16, color: j === 1 ? hex(g.i) : MUTED, bold: j === 1 })) })] : []),
    ]),
  ], HALF, { fill: g.s, pad: 180, padX: 240 })]]);
  const [g1, g2, g3, g4] = data.q;
  const qgrid = table([HALF, 200, HALF], [[
    cell([block(g1), spacer(160), block(g3)], HALF, { pad: 0, padX: 0 }),
    cell([para([])], 200, { pad: 0, padX: 0 }),
    cell([block(g2), spacer(160), block(g4)], HALF, { pad: 0, padX: 0 }),
  ]]);

  numbering.push({ reference: "tips", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 300, hanging: 220 } } } }] });
  const lineBorder = { style: BorderStyle.SINGLE, size: 8, color: "DCDFE6" };
  const box = { top: lineBorder, bottom: lineBorder, left: lineBorder, right: lineBorder };
  const scaleColors = ["E5484D", "F2711C", "E0A100", "7DB843", "2E9E62"];
  const scaleW = Math.floor((HALF - 480) / 5);
  const scale = table(Array(5).fill(scaleW), [scaleColors.map((c, i) => cell([
    para(run(String(i + 1), { font: DISPLAY, size: 24, color: "FFFFFF" }), { align: AlignmentType.CENTER, after: 0, line: 240 }),
    para(run(["Usikker", "", "Litt sikker", "", "Helt sikker"][i], { size: 12, bold: true, color: "FFFFFF" }), { align: AlignmentType.CENTER, after: 0 }),
  ], scaleW, { fill: "#" + c, pad: 60, padX: 40, borders: { top: none, bottom: none, left: { style: BorderStyle.SINGLE, size: 24, color: "FFFFFF" }, right: { style: BorderStyle.SINGLE, size: 24, color: "FFFFFF" } } }))]);
  const tips = table([HALF, 200, HALF], [[
    cell([
      para(run("Exit-lapp på 1 minutt", { font: DISPLAY, size: 22 }), { after: 60 }),
      para([run("Elevene viser med fingrene, eller skriver på en lapp: ", { size: 18 }), run("Hvor sikker er du på teknikken i markløft?", { size: 18, bold: true }), run(" Bytt gjerne ut øvelsen fra time til time.", { size: 18 })], { after: 100 }),
      scale,
    ], HALF, { borders: box, pad: 180, padX: 240 }),
    cell([para([])], 200, { pad: 0, padX: 0 }),
    cell([
      para(run("Slik kan du bruke arket", { font: DISPLAY, size: 22 }), { after: 60 }),
      ...["Spør i par, ta svar i plenum.", "Be elevene vise bevegelsen mens de forklarer.", "Ta med muskelkartet: «Pek på musklene som jobbet.»", "Bruk svarene til å velge fokus neste time."]
        .map((t) => para(run(t, { size: 18 }), { numbering: { reference: "tips", level: 0 }, after: 40 })),
    ], HALF, { borders: box, pad: 180, padX: 240 }),
  ]]);
  return [header, stripes, spacer(200), qgrid, spacer(220), tips];
}

/* ---------- Sett sammen dokumentet ---------- */
// Hvert ark er en egen seksjon, så det alltid starter på en ny side
const sheets = [...data.ex.map((e, i) => exerciseSheet(e, i + 1)), reflectionSheet()];
const pageProps = { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: 560, left: MARGIN, right: MARGIN } } };
const doc = new Document({
  creator: "Sara",
  title: "Styrkestasjoner",
  styles: { default: { document: { run: { font: FONT, size: 19, color: INK } } } },
  numbering: { config: numbering },
  sections: sheets.map((children) => ({ properties: pageProps, children })),
});
const out = path.join(here, "Stasjonsark.docx");
writeFileSync(out, await Packer.toBuffer(doc));
console.log("Skrev", out);
