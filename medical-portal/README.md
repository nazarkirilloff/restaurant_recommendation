# Lab Results Portal

A one-page dashboard for blood, urine and stool test results. Upload a spreadsheet and see
what is in range, what is off, and how each marker trends over time — against standard
medical ranges or tighter "biohacker" (Attia / Outlive) targets.

**Privacy:** the file is read inside your browser. Nothing is uploaded or sent anywhere,
and the built page makes no network requests. By default nothing is stored either —
reloading clears it.

The opt-in "Remember my last file on this device (encrypted)" keeps a copy in this
browser's IndexedDB, **encrypted with your passphrase** (AES-GCM-256, key from
PBKDF2-SHA256 with 600,000 iterations; file name and date are inside the encryption).
This matters because on `file://` — and on shared hosts such as `*.github.io` — other
pages share the same storage and could otherwise read it; now they only see ciphertext,
and a modified copy fails to open. The passphrase is never stored and can't be
recovered: "Forget it", or turning the option off, deletes the copy. A plaintext copy
left by an earlier version is deleted on startup.

> Educational visualization only — not medical advice.

### Keeping real data out of this (public) repository

- `.gitignore` blocks spreadsheets, CSVs, Numbers files and PDFs everywhere except
  `fixtures/`.
- `fixtures/` holds only generated synthetic files; `src/lib/fixtures.test.ts` fails CI
  if a data file there isn't marked "synthetic".
- Keep your real results outside the repository folder.

## Features

- Tabs per sheet (Blood / Urine / Stool), categories in file order, status pill per marker
- **Standard ⇄ Biohacker** ranges; markers without a biohacker target are judged by the
  standard range and labelled so
- **SI ⇄ US units** (mmol/L ↔ mg/dL etc.) for 22 common markers; statuses never change
- Trend arrows colored by direction relative to the range; charts with the active range
  band, the other range as dashed lines, hollow dots for detection-limit values (`<9.0`)
- **Search** by English or Ukrainian name (`/` to focus, Esc to clear)
- **Doctor report**: what needs attention, what came back into range, previous values
  and changes — print or save as PDF (A4)
- **English / Українська** interface, including explanations; dark mode; keyboard
  accessible

## Use it

```bash
npm install
npm run build        # → dist/index.html (one self-contained file, ~1 MB)
```

Open `dist/index.html` in any browser (double-click works, no server needed) and drop in
your `.xlsx`, `.numbers` or `.csv`. Every CI run also attaches the built file as the
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
- Apple Numbers files are read directly (multi-table sheets: the first table is used).
- CSV: comma or semicolon separated, UTF-8 or Windows-1251 (Excel's default "CSV" on Ukrainian Windows).
- Ukrainian range wording works too: `до 5,0 ммоль/л`, `від 1,0`, `від 3 до 5`.
- Title rows above the header, section-label rows (`ЛІПІДИ / LIPIDS`), comment columns, and `-` / `N/A` for "not done" are all fine.

Test fixtures (synthetic data, regenerate with `npm run fixture`):

- `fixtures/sample_lab_results.xlsx`: the clean master template
- `fixtures/realistic_lab_results.xlsx`: the same template with real-world mess (see the
  QUIRKS list in `fixtures/make-realistic.mjs`)
- `fixtures/realistic_blood_cp1251.csv`: its Blood sheet as Excel's `;` CSV in Windows-1251
- `fixtures/realistic_urine.numbers`: its Urine sheet as an Apple Numbers file

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + single-file build to `dist/index.html` |
| `npm test` | Unit and fixture tests (Vitest) |
| `npm run typecheck` | TypeScript only |
| `npm run fixture` | Rebuild the sample workbook |

## Layout

- `src/lib/` — parsing, ranges, flagging, trends, units, search, report (no React; tested)
- `src/components/` — UI
- `src/i18n/strings.ts` — all interface text, English and Ukrainian (typed: a missing
  translation fails the build)
- `src/data/markerExplanations*.ts` — plain-language marker descriptions (EN, UK)

## Dependencies

SheetJS (`xlsx`) is installed from the official SheetJS CDN (0.20.3, checksum pinned in
`package-lock.json`), because the npm registry copy (0.18.5) has known security issues.
`npm install` therefore needs access to `cdn.sheetjs.com`.
