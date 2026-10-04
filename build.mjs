// Bygger boka: setter sammen src/kapitler/*.html til én HTML-fil
// og skriver den ut til PDF med Chromium (Playwright).
//
//   node build.mjs            → Kroppen-i-bevegelse.pdf
//
// Innholdsfortegnelsen får sidetall i to omganger: først skrives en PDF,
// så leses sidetallene ut med pdftotext, og til slutt skrives PDF-en på nytt.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const root = path.dirname(new URL(import.meta.url).pathname);
const src = path.join(root, "src");
const out = path.join(root, "Kroppen-i-bevegelse.pdf");
const htmlOut = path.join(src, "bok.html");

const chapters = readdirSync(path.join(src, "kapitler"))
  .filter((f) => f.endsWith(".html"))
  .sort()
  .map((f) => readFileSync(path.join(src, "kapitler", f), "utf8"));

function assemble(pages = {}) {
  let body = chapters.join("\n");
  body = body.replace(/<span class="pg" data-kap="(\d+)"><\/span>/g,
    (_, k) => `<span class="pg" data-kap="${k}">${pages[k] ?? ""}</span>`);
  return `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<title>Kroppen i bevegelse</title>
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="style.css">
</head>
<body>
${body}
</body>
</html>`;
}

async function render(html, browser) {
  writeFileSync(htmlOut, html);
  const page = await browser.newPage();
  await page.goto("file://" + htmlOut, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  await page.close();
}

// Finn sidetallet der hvert kapittel starter ved å lete etter markøren "KAPITTEL n"
function findPages() {
  const text = execFileSync("pdftotext", ["-layout", out, "-"], { encoding: "utf8" });
  const pages = text.split("\f");
  const found = {};
  pages.forEach((p, i) => {
    const m = p.match(/KAPITTEL\s+(\d+)/);
    if (m && !(m[1] in found)) found[m[1]] = i + 1;
  });
  return found;
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: "/opt/pw-browsers/chromium" });
await render(assemble(), browser);
const pages = findPages();
await render(assemble(pages), browser);
await browser.close();
console.log("Skrev", out, "– kapittelstart:", pages);
