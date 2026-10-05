// Bygger stasjonsarkene:
//   node stasjonsark/build.mjs
// → stasjonsark/Stasjonsark.pdf   (8 A4-sider: 7 øvelser + refleksjon)
// → stasjonsark/web/index.html    (frittstående nettside med innebygde typesnitt)
// Skriver også ut en advarsel hvis innholdet på et ark ikke får plass.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const here = path.dirname(new URL(import.meta.url).pathname);
const srcFile = path.join(here, "stasjonsark.html");
const fontsDir = path.join(here, "..", "src", "fonts");

// Frittstående versjon: typesnittene legges inn som data-URI-er
const html = readFileSync(srcFile, "utf8");
const fontsCss = readFileSync(path.join(here, "..", "src", "fonts.css"), "utf8")
  .replace(/url\(fonts\/([^)]+)\)/g, (_, f) =>
    `url(data:font/woff2;base64,${readFileSync(path.join(fontsDir, f)).toString("base64")})`);
const fragment = html.split("<!-- START -->")[1].split("<!-- END -->")[0]
  .replace("</head>\n<body>\n", "")
  .replace("<style>", `<style>\n${fontsCss}\n`);
mkdirSync(path.join(here, "web"), { recursive: true });
writeFileSync(path.join(here, "web", "index.html"), fragment);

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
await page.goto("file://" + srcFile, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

await page.emulateMedia({ media: "print" });
const overflow = await page.evaluate(() => [...document.querySelectorAll(".sheet")].map((s) => {
  const inner = s.querySelector(".in"), body = s.querySelector(".body");
  const kids = [...body.children];
  const bottom = Math.max(...kids.map((k) => k.getBoundingClientRect().bottom));
  const over = [...s.querySelectorAll(".body *")].some((el) => el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflow !== "visible");
  return { id: s.id, spare: Math.round(s.getBoundingClientRect().bottom - bottom), innerOver: inner.scrollHeight - inner.clientHeight, over };
}));
console.table(overflow);

await page.pdf({ path: path.join(here, "Stasjonsark.pdf"), preferCSSPageSize: true, printBackground: true });
if (process.argv.includes("--shots")) {
  await page.emulateMedia({ media: "screen" });
  const sheets = await page.$$(".sheet");
  for (const [i, s] of sheets.entries()) await s.screenshot({ path: path.join(process.argv.at(-1), `ark-${i + 1}.png`) });
}
await browser.close();
console.log("Skrev Stasjonsark.pdf og web/index.html");
