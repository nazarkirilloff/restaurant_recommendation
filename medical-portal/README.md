# Lab Results Portal

A one-page dashboard for blood, urine and stool test results. Upload a spreadsheet and see
what is in range, what is off, and how each marker trends over time — against standard
medical ranges or tighter "biohacker" (Attia / Outlive) targets.

**Privacy:** the file is read inside your browser. Nothing is uploaded, stored, or sent
anywhere; reloading the page clears it. The built page makes no network requests.

> Educational visualization only — not medical advice.

## Use it

```bash
npm install
npm run build        # → dist/index.html (one self-contained file, ~1 MB)
```

Open `dist/index.html` in any browser (double-click works, no server needed) and drop in
your `.xlsx` or `.csv`. Every CI run also attaches the built file as the
`lab-results-portal` artifact.

For development: `npm run dev`.

## File format

One sheet per test type (e.g. `Blood`, `Urine`, `Stool`). Each row is a marker; each
date column holds the results from that day:

| Marker EN | Marker UA | Category | Reference | Biohacker Range | 2024-03-11 | 2025-05-19 |
|---|---|---|---|---|---|---|
| ALT | АЛТ | Liver & Pancreas | <41 U/L (men) | <25 U/L (Attia) | 36 | 27 |
| Urine Protein | Білок у сечі | Routine | Negative | N/A | trace | negative |

- **Required:** a marker-name column (`Marker EN`, `Test Name`, `Analyte`…) and at least
  one date column (`2024-03-11`, `11.03.2024`, or a real Excel date).
- **Optional:** `Marker UA`, `Category`, `Reference`, `Biohacker Range`.
- **Ranges:** `3.9–5.6 mmol/L`, `<5.0`, `≥75 nmol/L`, `Negative`, `Not detected`,
  `Light yellow to yellow`, `Constant per individual`, `N/A`. Text in parentheses is kept
  as a note.
- **Values:** numbers, detection limits (`<9.0`, `>500`), or text (`trace`, `negative`, `A`).
- Sheets without this layout (e.g. `README`) are shown under "About this dataset".
- Apple Numbers: export to Excel or CSV first (File → Export To).

`fixtures/sample_lab_results.xlsx` is a complete synthetic example
(regenerate with `npm run fixture`).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + single-file build to `dist/index.html` |
| `npm test` | Parser and flagging unit tests (Vitest) |
| `npm run typecheck` | TypeScript only |
| `npm run fixture` | Rebuild the sample workbook |

## Layout

- `src/lib/` — file parsing, reference-range parsing, status flagging (no React)
- `src/components/` — UI
- `src/data/markerExplanations.ts` — plain-language marker descriptions
