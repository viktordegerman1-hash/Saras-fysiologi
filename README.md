# Kroppen i bevegelse

En fargerik innføring i fysiologi og trening, på bokmål.

Den ferdige boka ligger i **`Kroppen-i-bevegelse.pdf`**.

## Bygge PDF-en på nytt

Krever Node.js, Playwright (Chromium) og `pdftotext` (poppler-utils).

```
node build.mjs
```

- `src/kapitler/` – ett HTML-dokument per kapittel (settes sammen i filnavn-rekkefølge)
- `src/style.css` – design og utskriftsoppsett (A4)
- `src/fonts/` – typesnittene Baloo 2 og Nunito (SIL Open Font License)

## Stasjonsark for styrketimen

`stasjonsark/Stasjonsark.pdf` – åtte A4-ark klare til utskrift: ett informasjonsark per stasjon (markløft, benkpress, nedtrekk, beinpress, skulderpress, utfall, roing med manual) og ett ark med refleksjonsspørsmål til slutten av timen.

- `stasjonsark/stasjonsark.html` – kilden (innhold, illustrasjoner og design)
- `stasjonsark/web/index.html` – frittstående nettversjon med innebygde typesnitt
- Bygg på nytt med `node stasjonsark/build.mjs`
