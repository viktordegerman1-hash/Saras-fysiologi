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
