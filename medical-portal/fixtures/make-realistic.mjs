// Regenerates the "real-world" fixtures: the same master template, but with
// the mess real exports carry. Synthetic values; no real patient data.
//
//   realistic_lab_results.xlsx   multi-sheet workbook (see QUIRKS below)
//   realistic_blood_cp1251.csv   Blood sheet as Excel's ";"-separated CSV in Windows-1251
//   realistic_urine.numbers      Urine sheet saved as Apple Numbers
//
// Run: npm run fixture
//
// QUIRKS covered
//   - title + blank rows above the header row
//   - header dates as real Excel date cells (dd.mm.yyyy) mixed with ISO and
//     dd.mm.yyyy text; one column out of chronological order; one empty
//     "planned" column; a free-text comment column after the dates
//   - section-label rows ("ЛІПІДИ / LIPIDS") between markers
//   - decimal commas, numbers stored as text, values with units, float noise
//     (4.859999999999999), formula cells with cached values
//   - "-" / "—" / "N/A" for "not done"; Ukrainian qualitative results
//   - Ukrainian-style ranges: "до 5,0", "від 1,0", "3,9 - 5,6 ммоль/л"
//   - stray whitespace and non-breaking spaces in names
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx/xlsx.mjs"; // ESM build: exports SSF (date formats)
import XLSX_ZAHL from "xlsx/dist/xlsx.zahl.mjs";
import * as cptable from "xlsx/dist/cpexcel.full.mjs";

const _ = null;
const HEAD = ["Marker EN", "Marker UA", "Category", "Reference", "Biohacker Range"];

/** Excel serial for a calendar date. */
function serial(y, m, d) {
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
}
const xlDate = (y, m, d) => ({ t: "n", v: serial(y, m, d), z: "dd.mm.yyyy" });
const formula = (v, f) => ({ t: "n", v, f });

// Columns (in sheet order): 06.02.2024 | 17.09.2024 | "2025-03-04" | "18.11.2025"
// | 01.07.2025 (inserted later, out of order) | 29.09.2026 (planned, empty) | Comment
const BLOOD_DATES = [
  xlDate(2024, 2, 6),
  xlDate(2024, 9, 17),
  "2025-03-04",
  "18.11.2025",
  xlDate(2025, 7, 1),
  xlDate(2026, 9, 29),
];

// prettier-ignore
const BLOOD = [
  ["ЛІПІДИ / LIPIDS"],
  ["Total Cholesterol", "Загальний холестерин", "Lipids & CV", "до 5,0 ммоль/л", "4.0–5.0 mmol/L", 5.9, "5,62", 5.21, 4.859999999999999, 5.04, _, ""],
  ["LDL Cholesterol", "ЛПНЩ", "Lipids & CV", "<3.0 mmol/L", "<1.8 mmol/L (Attia)", 3.88, 3.61, "3,02", 2.47, 2.71, _, "statin started 03.2025"],
  ["HDL Cholesterol", "ЛПВЩ", "Lipids & CV", "від 1,0 ммоль/л", ">1.3 mmol/L (higher = better)", 1.08, 1.11, 1.22, 1.36, 1.29, _, ""],
  ["Triglycerides", "Тригліцериди", "Lipids & CV", "< 1,7 ммоль/л", "<0.9 mmol/L", 1.92, "1.64 mmol/L", 1.21, 0.88, 1.02, _, ""],
  ["ApoB", "Аполіпопротеїн B", "Lipids & CV", "<1.0 g/L", "<0.65 g/L", 1.18, "-", 0.94, 0.68, _, _, "not in panel 09.2024"],
  ["Lp(a)", "Ліпопротеїн (а)", "Lipids & CV", "<75 nmol/L", "<50 nmol/L (lifetime measure)", 44, _, _, _, _, _, "once in a lifetime"],
  [],
  ["ГЛЮКОЗА / GLUCOSE"],
  ["Glucose (Fasting)", "Глюкоза (натщесерце)", "Glucose-Insulin", "3,9 - 5,6 ммоль/л", "4.4–4.9 mmol/L", 5.8, 5.6, "5,3", 4.9, 5.1, _, ""],
  ["Insulin (Fasting)", "Інсулін (натщесерце)", "Glucose-Insulin", "2.6–24.9 µU/mL", "2.6–6.0 µU/mL", 12.4, 9.8, 7.2, 5.6, 6.3, _, ""],
  ["HOMA-IR", "Індекс HOMA", "Glucose-Insulin", "<2.0", "0.5–1.0", formula(3.2, "F12*F13/22.5"), formula(2.44, "G12*G13/22.5"), formula(1.7, "H12*H13/22.5"), formula(1.22, "I12*I13/22.5"), formula(1.46, "J12*J13/22.5"), _, "calculated"],
  ["HbA1c", "Глікований гемоглобін", "Glucose-Insulin", "<5.7%", "<5.4% (Attia)", "5,9 %", _, 5.5, 5.3, _, _, ""],
  [],
  ["ПЕЧІНКА / LIVER"],
  ["  ALT ", "АЛТ", "Liver & Pancreas", "до 41 Од/л", "<25 U/L (Attia: men)", 52, 44, 33, 21, 26, _, ""],
  ["AST", "АСТ", "Liver & Pancreas", "до 40 Од/л", "<25 U/L", 38, 31, 26, 19, 22, _, ""],
  ["GGT", "ГГТП", "Liver & Pancreas", "<60 U/L (men)", "<25 U/L", 61, 49, 35, 20, 27, _, ""],
  ["Total Bilirubin", "Білірубін загальний", "Liver & Pancreas", "5–21 µmol/L", "8–21 µmol/L", 17.2, 15.9, "—", 13.4, 14.1, _, ""],
  [],
  ["НИРКИ / KIDNEY"],
  ["Creatinine", "Креатинін", "Kidney", "62–115 µmol/L (men)", "75–95 µmol/L", "94 мкмоль/л", 91, 89, 90, 92, _, ""],
  ["GFR (CKD-EPI)", "ШКФ", "Kidney", ">90 mL/min/1.73 m²", ">90 (higher = better)", 88, 91, 93, 95, 94, _, ""],
  [],
  ["ГОРМОНИ / HORMONES"],
  ["TSH", "ТТГ", "Thyroid", "0,4 – 4,0 мМО/л", "0.5–2.0 mIU/L", 2.31, 2.02, _, 1.74, 1.88, _, ""],
  ["Anti-TPO", "АТ-ТПО", "Thyroid", "<34 IU/mL", "<9 IU/mL", "<5,0", _, _, "< 5.0", _, _, "below detection"],
  ["Testosterone Total", "Тестостерон загальний", "Hormones", "8.6–29.0 nmol/L (men)", "15–25 nmol/L", 12.1, 14.9, 16.8, 19.2, 18.1, _, ""],
  ["Vitamin D 25-OH", "25-гідроксивітамін Д", "Vitamins", "≥75 nmol/L", "100–150 nmol/L", 51, 83, 112, 126, 119, _, "D3 4000 IU since 02.2024"],
  ["Ferritin", "Феритин", "Iron", "30–400 ng/mL (men)", "100–200 ng/mL", 298, 241, 198, 161, 176, _, ""],
  [],
  ["ЗАГАЛЬНИЙ АНАЛІЗ / CBC"],
  ["WBC", "Лейкоцити", "CBC", "4,0 - 10,0 ×10⁹/л", "4.5–6.5 ×10⁹/L", 7.1, 6.4, 5.9, 5.5, 5.7, _, ""],
  ["Hemoglobin", "Гемоглобін", "CBC", "135–175 g/L (men)", "145–160 g/L", 152, 155, 154, 157, 156, _, ""],
  ["Platelets", "Тромбоцити", "CBC", "150–400 ×10⁹/L", "200–300 ×10⁹/L", 244, 231, 252, 239, 247, _, ""],
  ["Neutrophils %", "Нейтрофіли (%)", "CBC", "40–70%", "45–60%", 61.2, 57.4, 53.1, 50.2, 51.6, _, ""],
  ["ESR", "ШОЕ", "CBC", "до 15 мм/год", "<8 mm/h", 14, 11, "N/A", 7, 8, _, ""],
  [],
  ["ЗАПАЛЕННЯ / INFLAMMATION"],
  ["hs-CRP", "С-реактивний білок (hs)", "Inflammation & Immunology", "<3.0 mg/L", "<0.5 mg/L", 3.6, 2.4, 1.1, "0,42", 0.58, _, "cold in 07.2025?"],
  ["H. pylori IgG", "H. pylori IgG", "Antibodies", "<16 RU/mL (negative)", "N/A (must be negative)", 31.5, _, 4.2, _, _, _, "eradication 10.2024"],
  ["Blood Group ABO", "Група крові", "Blood Group", "Constant per individual", "N/A", "A (II)", _, _, _, _, _, ""],
  [],
  [],
];

const URINE_DATES = [xlDate(2024, 2, 6), "2025-03-04", "18.11.2025"];
// prettier-ignore
const URINE = [
  ["Urine Color", "Колір", "Routine", "Light yellow to yellow", "N/A", "солом'яно-жовтий", "yellow", "pale yellow"],
  ["Urine Transparency", "Прозорість", "Routine", "Clear", "N/A", "clear", "slightly cloudy", "clear"],
  ["Urine Specific Gravity", "Питома вага", "Routine", "1.005–1.025", "1.015–1.025", 1.027, "1,020", 1.018],
  ["Urine pH", "pH", "Routine", "5,5 - 7,0", "6.0–7.0", 5.5, 6, 6.5],
  ["Urine Protein (qual.)", "Білок", "Routine", "Negative", "N/A", "сліди", "негативний", "не виявлено"],
  ["Urine Glucose", "Глюкоза", "Routine", "Not detected", "N/A", "не виявлено", "не виявлено", "negative"],
  ["Urine Ketones", "Кетони", "Routine", "Not detected", "N/A", "not detected", "0.5 mmol/L (+)", "not detected"],
  ["Urine Leukocytes (micro.)", "Лейкоцити (мікроскопія)", "Microscopy", "0–10/HPF", "N/A", "4", "2–3 per HPF", "1"],
  ["Urine Bacteria", "Бактерії", "Microscopy", "Not detected", "N/A", "не виявлено", "single per HPF", "не виявлено"],
];

const NOTES = [
  ["Лабораторні результати — робоча копія (синтетичні дані)"],
  ["Labs: Synevo (2024), Dila (2025)"],
  ["Ranges copied from the lab report; biohacker targets per Outlive."],
];

function dataSheet(title, dates, rows) {
  const aoa = [
    [title],
    [],
    [...HEAD, ...dates, "Comment"],
    ...rows,
  ];
  const plain = aoa.map((row) => row.map((v) => (v && typeof v === "object" ? v.v : v)));
  const ws = XLSX.utils.aoa_to_sheet(plain);
  // aoa_to_sheet drops number formats and formulas; put the full cells back.
  aoa.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v && typeof v === "object") ws[XLSX.utils.encode_cell({ r, c })] = { ...v };
    }),
  );
  return ws;
}

export function buildRealisticWorkbook() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, dataSheet("Аналіз крові / Blood — patient #0042 (synthetic)", BLOOD_DATES, BLOOD), "Blood");
  XLSX.utils.book_append_sheet(wb, dataSheet("Аналіз сечі / Urine (synthetic)", URINE_DATES, URINE.map((r) => [...r, ""])), "Urine");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(NOTES), "Notes");
  return wb;
}

/** Writes and reads back, so every consumer sees what a real .xlsx round-trip yields. */
export function realisticXlsxBuffer() {
  return XLSX.write(buildRealisticWorkbook(), { type: "buffer", bookType: "xlsx" });
}

export function realisticCsvCp1251() {
  const wb = XLSX.read(realisticXlsxBuffer(), { type: "buffer", cellNF: true });
  const ws = wb.Sheets.Blood;
  // Excel exports what the cell displays: "06.02.2024", not the serial 45328.
  for (const [addr, cell] of Object.entries(ws)) {
    if (!addr.startsWith("!") && cell.t === "n" && typeof cell.z === "string" && XLSX.SSF.is_date(cell.z)) {
      const d = XLSX.SSF.parse_date_code(cell.v); // SSF.format can't handle "dd.mm.yyyy"
      cell.w = `${String(d.d).padStart(2, "0")}.${String(d.m).padStart(2, "0")}.${d.y}`;
    }
  }
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
  return Buffer.from(cptable.utils.encode(1251, csv.replace(/\n/g, "\r\n")));
}

export function realisticNumbersBuffer() {
  const wb = XLSX.read(realisticXlsxBuffer(), { type: "buffer", cellNF: true });
  const only = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(only, wb.Sheets.Urine, "Urine");
  return XLSX.write(only, { type: "buffer", bookType: "numbers", numbers: XLSX_ZAHL });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = dirname(fileURLToPath(import.meta.url));
  const files = {
    "realistic_lab_results.xlsx": realisticXlsxBuffer(),
    "realistic_blood_cp1251.csv": realisticCsvCp1251(),
    "realistic_urine.numbers": realisticNumbersBuffer(),
  };
  for (const [name, buf] of Object.entries(files)) {
    writeFileSync(join(dir, name), buf);
    console.log(`Wrote ${name} (${buf.length} bytes)`);
  }
}
