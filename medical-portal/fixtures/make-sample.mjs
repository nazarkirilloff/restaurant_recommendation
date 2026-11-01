// Regenerates fixtures/sample_lab_results.xlsx — a synthetic, depersonalized
// copy of the master lab-results template (same sheets, columns and value
// formats). Run: npm run fixture
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const _ = null;
const HEAD = ["Marker EN", "Marker UA", "Category", "Reference", "Biohacker Range"];

const README = [
  ["Master Lab Results — Example (Synthetic)"],
  [],
  ["Patient: M (born 1978-04-12)"],
  ["Date range: 2023-01-19 → 2026-04-22"],
  [],
  ["Sheets: Blood / Urine / Stool"],
  [],
  ["Columns:"],
  ["  A  Marker EN"],
  ["  B  Marker UA"],
  ["  C  Category"],
  ["  D  Reference (medical adult-male)"],
  ["  E  Biohacker Range"],
  ["  F+ Sample dates (YYYY-MM-DD)"],
  [],
  ["Biohacker source: Peter Attia (Outlive) + tunings:"],
  ["  • Lipids: ApoB-centric, LDL-C aggressive targets"],
  ["  • Glucose: HbA1c <5.4, fasting glucose 4.4–4.9"],
  ["  • ALT/AST <25 (Attia signature for men)"],
  ["  • hs-CRP <0.5 (anti-inflammatory priority)"],
  ["  • Testosterone: mid-upper of age-adjusted range"],
  [],
  ["Note: This file is a depersonalized template/example."],
  ["All values and the patient identity are synthetic."],
  ["N/A = no biohacker target (qualitative or constant marker)."],
];

const BLOOD_DATES = ["2023-01-19", "2023-08-14", "2023-11-30", "2024-03-11", "2024-07-22", "2024-10-15", "2025-05-19", "2025-12-14", "2026-04-22"];
const BLOOD = [
  ["Total Cholesterol", "Загальний холестерин", "Lipids & CV", "<5.0 mmol/L", "4.0–5.0 mmol/L (Attia focuses on ApoB)", 6.12, 5.84, _, 5.5, _, 5.32, 5.08, 4.86, 4.74],
  ["LDL Cholesterol", "ЛПНЩ (Холестерин ЛПНЩ)", "Lipids & CV", "<3.0 mmol/L", "<1.8 mmol/L (Attia: aggressive, <70 mg/dL)", 4.05, 3.78, _, 3.42, _, 3.15, 2.78, 2.45, 2.21],
  ["HDL Cholesterol", "ЛПВЩ (Холестерин ЛПВЩ)", "Lipids & CV", ">1.0 mmol/L (men)", ">1.3 mmol/L (higher = better)", 1.05, 1.12, _, 1.18, _, 1.21, 1.25, 1.3, 1.34],
  ["Triglycerides", "Тригліцериди", "Lipids & CV", "<1.7 mmol/L", "<0.9 mmol/L (metabolic-health proxy)", 2.08, 1.84, _, 1.52, _, 1.31, 1.08, 0.94, 0.87],
  ["Non-HDL Cholesterol", "Не-ЛПВЩ холестерин", "Lipids & CV", "<3.8 mmol/L", "<2.6 mmol/L", 5.07, 4.72, _, 4.32, _, 4.11, 3.83, 3.56, 3.4],
  ["ApoB", "Аполіпопротеїн B (ApoB)", "Lipids & CV", "<1.0 g/L", "<0.65 g/L (Attia: <60 mg/dL primary marker)", 1.28, _, _, 1.08, _, _, 0.86, _, 0.71],
  ["Lp(a)", "Ліпопротеїн (а)", "Lipids & CV", "<75 nmol/L (<30 mg/dL)", "<50 nmol/L (lifetime measure)", 42, _, _, _, _, _, _, _, _],
  ["Homocysteine", "Гомоцистеїн", "Lipids & CV", "<10 µmol/L", "<8 µmol/L", 13.4, _, _, 10.8, _, _, 8.2, _, 7.6],
  ["Glucose (Fasting)", "Глюкоза (натщесерце)", "Glucose-Insulin", "3.9–5.6 mmol/L", "4.4–4.9 mmol/L", 5.7, 5.5, _, 5.4, _, 5.2, 5, 4.9, 4.8],
  ["HbA1c", "Глікований гемоглобін (HbA1c)", "Glucose-Insulin", "<5.7%", "<5.4% (Attia)", 5.8, _, _, 5.6, _, _, 5.3, _, 5.2],
  ["Insulin (Fasting)", "Інсулін (натщесерце)", "Glucose-Insulin", "2.6–24.9 µU/mL", "2.6–6.0 µU/mL", 11.8, _, _, 8.4, _, _, 6.1, _, 5.3],
  ["HOMA-IR", "Індекс інсулінорезистентності HOMA", "Glucose-Insulin", "<2.0", "0.5–1.0", 2.99, _, _, 2.01, _, _, 1.36, _, 1.13],
  ["Uric Acid", "Сечова кислота", "Glucose-Insulin", "210–420 µmol/L (men)", "240–350 µmol/L", 438, _, _, 402, _, _, 358, _, 332],
  ["TSH", "Тиреотропний гормон (ТТГ)", "Thyroid", "0.4–4.0 mIU/L", "0.5–2.0 mIU/L", 2.15, _, 1.92, _, 1.78, _, 1.84, _, 1.71],
  ["Anti-TPO", "Антитіла до ТПО (АТ-ТПО)", "Thyroid", "<34 IU/mL", "<9 IU/mL (essentially absent)", "<9.0", _, _, _, _, _, "<9.0", _, _],
  ["Free T4 (FT4)", "Вільний тироксин (FT4)", "Thyroid", "12–22 pmol/L", "15–19 pmol/L", 14.8, _, _, _, 15.3, _, _, _, 16.1],
  ["Free T3 (FT3)", "Вільний трийодтиронін (FT3)", "Thyroid", "3.1–6.8 pmol/L", "4.5–6.5 pmol/L", 4.62, _, _, _, 4.81, _, _, _, 5.04],
  ["Testosterone Total", "Тестостерон загальний", "Hormones", "8.6–29.0 nmol/L (men)", "15–25 nmol/L (mid-upper)", 11.2, _, 12.4, _, 14.6, _, 17.1, _, 18.3],
  ["Free Testosterone", "Тестостерон вільний", "Hormones", "180–740 pmol/L (men)", "300–500 pmol/L", 218, _, _, _, 305, _, _, _, 372],
  ["SHBG", "ГЗСГ (SHBG)", "Hormones", "18.3–54.1 nmol/L (men)", "25–45 nmol/L", 28.4, _, _, _, 34.1, _, _, _, 38.2],
  ["Estradiol", "Естрадіол", "Hormones", "<160 pmol/L (men)", "70–130 pmol/L (mid)", 142, _, _, _, 118, _, _, _, 96],
  ["DHEAS", "ДГЕА-сульфат (DHEAS)", "Hormones", "80–560 µg/dL (men 40–50)", "200–400 µg/dL (mid-upper)", 168, _, _, _, 195, _, _, _, 224],
  ["Cortisol (Morning)", "Кортизол (ранковий)", "Hormones", "166–507 nmol/L (8–10am)", "300–500 nmol/L (HPA balanced)", 412, _, _, _, 378, _, _, _, 345],
  ["Prolactin", "Пролактин", "Hormones", "86–324 µIU/mL (men)", "<250 µIU/mL (basal AM)", 215, _, _, _, 184, _, _, _, _],
  ["PSA Total", "ПСА загальний", "Hormones", "<4.0 ng/mL (men <50)", "<1.0 ng/mL (low = better)", 0.92, _, _, _, 0.88, _, _, 1.08, 1.04],
  ["Free PSA / Total PSA", "Вільний/загальний ПСА", "Hormones", ">25% (low cancer risk)", ">25%", _, _, _, _, _, _, _, 28.5, _],
  ["Total Bilirubin", "Білірубін загальний", "Liver & Pancreas", "5–21 µmol/L", "8–21 µmol/L (mild antioxidant)", 16.4, _, _, 14.2, _, _, 12.8, _, 13.1],
  ["ALT", "АЛТ (Аланінамінотрансфераза)", "Liver & Pancreas", "<41 U/L (men)", "<25 U/L (Attia: men)", 48, 42, _, 36, _, 31, 27, 22, 19],
  ["AST", "АСТ (Аспартатамінотрансфераза)", "Liver & Pancreas", "<40 U/L (men)", "<25 U/L (Attia)", 34, 30, _, 28, _, 25, 23, 21, 20],
  ["ALP (Alkaline Phosphatase)", "Лужна фосфатаза", "Liver & Pancreas", "40–129 U/L (men)", "50–90 U/L", 78, _, _, 72, _, _, _, _, 68],
  ["GGT", "Гамма-глутамілтранспептидаза (ГГТП)", "Liver & Pancreas", "<60 U/L (men)", "<25 U/L (oxidative-stress proxy)", 54, 46, _, 38, _, 32, 26, 22, 19],
  ["Total Protein", "Загальний білок", "Liver & Pancreas", "64–83 g/L", "70–80 g/L", 72, _, _, 74, _, _, _, _, 75],
  ["Albumin", "Альбумін", "Liver & Pancreas", "35–52 g/L", "45–50 g/L (high-normal)", 44, _, _, 46, _, _, _, _, 47],
  ["Pancreatic Amylase", "Панкреатична амілаза", "Liver & Pancreas", "<53 U/L", "20–40 U/L", _, _, _, 34, _, _, _, _, _],
  ["Creatinine", "Креатинін", "Kidney", "62–115 µmol/L (men)", "75–95 µmol/L", 92, _, _, 88, _, _, 91, _, 89],
  ["Urea", "Сечовина", "Kidney", "3.0–9.2 mmol/L", "4.0–6.5 mmol/L", 5.4, _, _, 5.8, _, _, _, _, 5.2],
  ["GFR (CKD-EPI)", "ШКФ за CKD-EPI", "Kidney", ">90 mL/min/1.73 m²", ">90 (higher = better)", 92, _, _, 96, _, _, 94, _, 97],
  ["Iron (Serum)", "Залізо (сироватка)", "Iron", "10.6–28.3 µmol/L (men)", "15–25 µmol/L", 22.4, _, _, 19.8, _, _, _, _, 20.6],
  ["Ferritin", "Феритин", "Iron", "30–400 ng/mL (men)", "100–200 ng/mL (men: too high = inflammation)", 312, _, _, 268, _, 224, 189, 165, 152],
  ["Transferrin", "Трансферин", "Iron", "2.0–3.6 g/L", "2.2–3.0 g/L", 2.48, _, _, _, _, _, _, _, 2.62],
  ["TIBC", "Загальна залізозв'язуюча здатність (ЗЗЗ)", "Iron", "45–72 µmol/L", "50–65 µmol/L", 58.2, _, _, _, _, _, _, _, 61.4],
  ["Vitamin D 25-OH", "25-гідроксивітамін Д", "Vitamins", "≥75 nmol/L", "100–150 nmol/L (40–60 ng/mL)", 48, _, 72, _, 108, _, 124, _, 118],
  ["Vitamin B12", "Вітамін В12", "Vitamins", "200–900 pg/mL", "500–900 pg/mL", 348, _, _, _, 612, _, _, _, 728],
  ["Folate (Folic Acid)", "Фолієва кислота", "Vitamins", "3–17 ng/mL", "10–20 ng/mL", 6.4, _, _, _, 13.2, _, _, _, 15.8],
  ["Magnesium (Serum)", "Магній (сироватка)", "Vitamins", "0.66–1.07 mmol/L", "0.85–1.00 mmol/L", 0.78, _, _, _, 0.86, _, _, _, 0.92],
  ["Zinc (Serum)", "Цинк (сироватка)", "Vitamins", "10.7–17.5 µmol/L", "13–17 µmol/L", _, _, _, _, 12.4, _, _, _, 14.1],
  ["WBC", "Лейкоцити", "CBC", "4.0–10.0 ×10⁹/L", "4.5–6.5 ×10⁹/L", 6.84, 6.42, _, 5.91, _, 5.78, 5.52, 5.41, 5.38],
  ["RBC", "Еритроцити", "CBC", "4.3–5.7 ×10¹²/L (men)", "4.7–5.3 ×10¹²/L", 5.08, _, _, 5.12, _, _, 5.05, _, 5.11],
  ["Hemoglobin", "Гемоглобін", "CBC", "135–175 g/L (men)", "145–160 g/L", 154, _, _, 156, _, _, 152, _, 155],
  ["Hematocrit", "Гематокрит", "CBC", "39–50% (men)", "42–47%", 45.8, _, _, 46.2, _, _, 45.4, _, 45.9],
  ["Platelets", "Тромбоцити", "CBC", "150–400 ×10⁹/L", "200–300 ×10⁹/L", 248, _, _, 232, _, _, 256, _, 241],
  ["MCV", "Середній об'єм еритроцитів", "CBC", "80–100 fL", "85–92 fL", 90.1, _, _, 90.4, _, _, 89.9, _, 89.8],
  ["MCH", "Середній вміст гемоглобіну в еритроциті", "CBC", "27–32 pg", "28–32 pg", 30.3, _, _, 30.5, _, _, 30.1, _, 30.3],
  ["MCHC", "Середня концентрація гемоглобіну", "CBC", "320–360 g/L", "330–350 g/L", 336, _, _, 338, _, _, 335, _, 338],
  ["RDW-CV", "Ширина розподілення еритроцитів (CV)", "CBC", "11.5–14.5%", "<12.5%", 12.8, _, _, 12.4, _, _, 12.1, _, 12.2],
  ["MPV", "Середній об'єм тромбоцитів", "CBC", "5.9–9.9 fL", "7.5–9.5 fL", 9.4, _, _, 9.1, _, _, _, _, 8.8],
  ["Neutrophils %", "Нейтрофіли (%)", "CBC", "40–70%", "45–60%", 58.4, _, _, 54.2, _, _, 51.8, _, 49.6],
  ["Neutrophils #", "Нейтрофіли (абс.)", "CBC", "2.0–7.0 ×10⁹/L", "2.5–5.0 ×10⁹/L", 3.99, _, _, 3.2, _, _, 2.86, _, 2.67],
  ["Lymphocytes %", "Лімфоцити (%)", "CBC", "20–40%", "25–40%", 30.2, _, _, 33.8, _, _, 36.4, _, 38.2],
  ["Lymphocytes #", "Лімфоцити (абс.)", "CBC", "1.0–3.0 ×10⁹/L", "1.5–2.5 ×10⁹/L", 2.06, _, _, 2, _, _, 2.01, _, 2.05],
  ["Monocytes %", "Моноцити (%)", "CBC", "2–10%", "4–8%", 7.8, _, _, 7.1, _, _, 6.8, _, 6.9],
  ["Monocytes #", "Моноцити (абс.)", "CBC", "0.2–1.0 ×10⁹/L", "0.3–0.7 ×10⁹/L", 0.53, _, _, 0.42, _, _, 0.38, _, 0.37],
  ["Eosinophils %", "Еозинофіли (%)", "CBC", "1–6%", "1–4%", 2.9, _, _, 4.2, _, _, 4.5, _, 4.7],
  ["Eosinophils #", "Еозинофіли (абс.)", "CBC", "0.02–0.5 ×10⁹/L", "0.05–0.30 ×10⁹/L", 0.2, _, _, 0.25, _, _, 0.25, _, 0.25],
  ["Basophils %", "Базофіли (%)", "CBC", "0–1%", "<1%", 0.7, _, _, 0.7, _, _, _, _, 0.6],
  ["Basophils #", "Базофіли (абс.)", "CBC", "0–0.2 ×10⁹/L", "<0.10 ×10⁹/L", 0.05, _, _, 0.04, _, _, _, _, 0.03],
  ["ESR", "ШОЕ (Швидкість осідання еритроцитів)", "CBC", "<15 mm/h (men)", "<8 mm/h", 12, _, _, 9, _, _, _, _, 6],
  ["hs-CRP", "Високочутливий С-реактивний білок (hs-CRP)", "Inflammation & Immunology", "<3.0 mg/L (low CV risk)", "<0.5 mg/L (Attia: <0.2 ideal)", 3.2, _, _, 2.1, _, 1.4, 0.92, 0.61, 0.48],
  ["IgE (total)", "Імуноглобулін Е (IgE загальний)", "Inflammation & Immunology", "<100 IU/mL", "<50 IU/mL", 78.4, _, _, _, _, _, _, _, 62.1],
  ["H. pylori IgG", "Антитіла до Helicobacter pylori IgG", "Antibodies", "<16 RU/mL (negative)", "N/A (must be negative)", 28.4, _, _, _, 3.1, _, _, _, _],
  ["HSV 1/2 IgG", "Герпес 1/2 типу IgG", "Antibodies", "<0.9 S/CO (negative)", "N/A (past infection — immunity)", 38.4, _, _, _, _, _, _, _, _],
  ["CMV IgG", "Цитомегаловірус IgG", "Antibodies", "<6 IU/mL (negative)", "N/A (past infection)", 11.2, _, _, _, _, _, _, _, _],
  ["CMV IgM", "Цитомегаловірус IgM", "Antibodies", "<0.85 S/CO (negative)", "N/A (must be negative)", 0.18, _, _, _, _, _, _, _, _],
  ["EBV VCA IgG", "Епштейн-Барр VCA IgG", "Antibodies", "<0.9 S/CO (negative)", "N/A (past EBV)", 41.6, _, _, _, _, _, _, _, _],
  ["EBV EBNA IgG", "Епштейн-Барр EBNA IgG", "Antibodies", "<0.9 S/CO (negative)", "N/A (past EBV)", 12.4, _, _, _, _, _, _, _, _],
  ["Rubella IgG", "Краснуха IgG", "Antibodies", "≥10 IU/mL (immune)", "N/A (immunity proof)", 56.2, _, _, _, _, _, _, _, _],
  ["Blood Group ABO", "Група крові (AB0)", "Blood Group", "Constant per individual", "N/A (constant per individual)", "A", _, _, _, _, _, _, _, _],
  ["Rh Factor", "Резус-фактор (Rh)", "Blood Group", "Constant per individual", "N/A (constant)", "+ (positive)", _, _, _, _, _, _, _, _],
];

const URINE_DATES = ["2023-01-19", "2024-07-22", "2026-04-22"];
const URINE = [
  ["Urine Color", "Колір сечі", "Routine", "Light yellow to yellow", "N/A (visual)", "yellow", "straw", "pale yellow"],
  ["Urine Transparency", "Прозорість сечі", "Routine", "Clear", "N/A (visual)", "clear", "clear", "clear"],
  ["Urine Specific Gravity", "Питома вага сечі", "Routine", "1.005–1.025", "1.015–1.025", 1.028, 1.02, 1.018],
  ["Urine pH", "pH сечі", "Routine", "5.5–7.0", "6.0–7.0", 5.5, 6, 6.5],
  ["Urine Nitrites", "Нітрити в сечі", "Routine", "Negative", "N/A (must be absent)", "not detected", "not detected", "not detected"],
  ["Urine Protein (qual.)", "Білок у сечі (якісно)", "Routine", "Negative", "N/A (must be absent)", "trace", "negative", "negative"],
  ["Urine Glucose", "Глюкоза в сечі", "Routine", "Not detected", "N/A (must be absent)", "not detected", "not detected", "not detected"],
  ["Urine Ketones", "Кетонові тіла в сечі", "Routine", "Not detected", "N/A (situational; expect on keto/fasting)", "not detected", "not detected", "0.5 mmol/L (+)"],
  ["Urine Urobilinogen", "Уробіліноген у сечі", "Routine", "0–16 µmol/L", "N/A", "≤16", "normal", "normal"],
  ["Urine Bilirubin", "Білірубін у сечі", "Routine", "Not detected", "N/A (must be absent)", "not detected", "not detected", "not detected"],
  ["Urine Leukocytes (chem.)", "Лейкоцити у сечі (хімічно)", "Routine", "Not detected", "N/A (must be absent)", "not detected", "not detected", "not detected"],
  ["Urine RBC/Hb", "Еритроцити/Гемоглобін у сечі", "Routine", "Not detected", "N/A (must be absent)", "not detected", "not detected", "not detected"],
  ["Urine Leukocytes (micro.)", "Лейкоцити у сечі (мікроскопія; в п/з)", "Microscopy", "0–10/HPF", "N/A", "2–3 per HPF", _, "single per HPF"],
  ["Urine RBC (micro.)", "Еритроцити у сечі (мікроскопія)", "Microscopy", "Not detected", "N/A", "not detected", _, "not detected"],
  ["Urine Squamous Epithelium", "Клітини плоского епітелію", "Microscopy", "Single in prep.", "N/A", "single in prep.", _, "single in prep."],
  ["Urine Bacteria", "Бактерії у сечі", "Microscopy", "Not detected", "N/A", "single per HPF", _, "not detected"],
];

const STOOL_DATES = ["2024-07-22", "2026-04-22"];
const STOOL = [
  ["Fecal Elastase", "Панкреатична еластаза в калі", "Stool", "≥200 µg/g", ">500 µg/g", ">500", _],
  ["Calprotectin (Fecal)", "Кальпротектин (фекальний)", "Stool", "<50 µg/g", "<30 µg/g", 38, 24],
  ["Fecal Occult Blood (FIT)", "Прихована кров у калі (FIT)", "Stool", "Negative", "N/A (must be negative)", "negative", "negative"],
];

export function buildSampleWorkbook() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(README), "README");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[...HEAD, ...BLOOD_DATES], ...BLOOD]), "Blood");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[...HEAD, ...URINE_DATES], ...URINE]), "Urine");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[...HEAD, ...STOOL_DATES], ...STOOL]), "Stool");
  return wb;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(dirname(fileURLToPath(import.meta.url)), "sample_lab_results.xlsx");
  writeFileSync(out, XLSX.write(buildSampleWorkbook(), { type: "buffer", bookType: "xlsx" }));
  console.log(`Wrote ${out}`);
}
