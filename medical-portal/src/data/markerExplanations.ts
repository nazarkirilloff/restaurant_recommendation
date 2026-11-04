import { markerKey } from "../lib/markerKey";
import { ENTRIES_UK } from "./markerExplanations.uk";

export interface Explanation {
  summary: string;
  high?: string;
  low?: string;
}

const ENTRIES = {
  "total cholesterol": {
    summary:
      "Sum of all cholesterol-carrying particles in the blood. A broad screening number; individual fractions (LDL, HDL, ApoB) tell more.",
    high: "Elevated total cholesterol can indicate higher cardiovascular risk, especially when driven by LDL.",
    low: "Very low totals are uncommon and usually reflect malnutrition or liver issues.",
  },
  "ldl cholesterol": {
    summary:
      "\"Bad\" cholesterol — carries cholesterol into artery walls. The single most modifiable lipid for heart-disease risk.",
    high: "Higher LDL means more lipoprotein particles depositing in artery walls — the main driver of atherosclerosis.",
  },
  "hdl cholesterol": {
    summary:
      "\"Good\" cholesterol — carries cholesterol away from tissues to the liver for disposal.",
    low: "Low HDL is associated with higher cardiovascular risk; usually reflects metabolic dysfunction.",
  },
  triglycerides: {
    summary:
      "Circulating fat. High triglycerides are a metabolic-health red flag often tied to insulin resistance and excess refined carbs/alcohol.",
    high: "Often reflects insulin resistance, fatty liver, or recent food/alcohol intake.",
  },
  "non hdl cholesterol": {
    summary:
      "Total minus HDL — captures every atherogenic particle (LDL, VLDL, remnants). Better than LDL alone for risk.",
  },
  apob: {
    summary:
      "Apolipoprotein B counts the actual number of atherogenic lipoprotein particles. Considered the primary cardiovascular-risk marker by many cardiologists.",
    high: "Elevated ApoB drives plaque formation regardless of LDL-C; a key target for lipid-lowering therapy.",
  },
  "lp a": {
    summary:
      "Lipoprotein(a) is a largely genetic, lifetime risk factor for heart disease. Measure once in life; very high values warrant aggressive risk-factor control.",
  },
  homocysteine: {
    summary:
      "An amino acid tied to cardiovascular and cognitive risk. Often elevated by B-vitamin (B12, folate, B6) deficiency.",
    high: "Consider B12 / folate / B6 status, kidney function, and methylation support.",
  },
  "glucose fasting": {
    summary:
      "Blood sugar after an overnight fast. The simplest screen for diabetes and prediabetes.",
    high: "Fasting glucose 5.6–6.9 mmol/L (100–125 mg/dL) suggests prediabetes; ≥7.0 mmol/L (≥126 mg/dL) is in the diabetic range.",
  },
  hba1c: {
    summary:
      "Average blood-sugar exposure over ~3 months. Less sensitive to one-off meals than fasting glucose.",
    high: "5.7–6.4% suggests prediabetes; ≥6.5% is diabetic territory.",
  },
  "insulin fasting": {
    summary:
      "Hormone that drives glucose into cells. High fasting insulin is an early sign of insulin resistance, often years before glucose rises.",
    high: "Elevated fasting insulin suggests insulin resistance and metabolic syndrome.",
  },
  "homa ir": {
    summary:
      "Derived index of insulin resistance = (fasting glucose × fasting insulin) / 22.5. <1 is excellent; ≥2 suggests resistance.",
  },
  "uric acid": {
    summary:
      "Byproduct of purine metabolism. Elevated levels are linked to gout, kidney stones, hypertension, and metabolic syndrome.",
    high: "Often driven by fructose, alcohol, red meat, dehydration, or insulin resistance.",
  },
  tsh: {
    summary:
      "Pituitary signal that tells the thyroid to produce more hormone. The first-line thyroid screening test.",
    high: "Elevated TSH typically means underactive thyroid (hypothyroidism); pair with free T4.",
    low: "Suppressed TSH points to an overactive thyroid (hyperthyroidism).",
  },
  "anti tpo": {
    summary:
      "Antibody against thyroid peroxidase. Marker of autoimmune thyroid disease (Hashimoto's, Graves').",
  },
  "free t4 ft4": {
    summary:
      "The unbound, active form of thyroxine — the main thyroid hormone in circulation.",
  },
  "free t3 ft3": {
    summary:
      "The unbound, active form of triiodothyronine — the metabolically dominant thyroid hormone at the tissue level.",
  },
  "testosterone total": {
    summary:
      "Primary male sex hormone (also present at lower levels in women). Drives muscle, bone, libido, mood, and metabolic health.",
    low: "Low testosterone affects energy, libido, body composition, mood. Confirm with morning sample and free testosterone.",
  },
  "free testosterone": {
    summary:
      "Testosterone not bound to SHBG/albumin — the fraction actually available to tissues.",
  },
  shbg: {
    summary:
      "Sex Hormone Binding Globulin — protein that binds testosterone and estradiol, reducing their bioavailability.",
  },
  estradiol: {
    summary:
      "The most active estrogen. Important in both sexes; men need a small amount for bone, brain, and libido.",
  },
  dheas: {
    summary:
      "Adrenal precursor hormone, declines with age. Sometimes supplemented for hormonal support.",
  },
  "cortisol morning": {
    summary:
      "Stress and circadian-rhythm hormone, peaks in the morning. High values can reflect chronic stress; low can suggest adrenal insufficiency.",
  },
  prolactin: {
    summary:
      "Pituitary hormone. Elevated levels can suppress sex hormones and may indicate a pituitary issue, hypothyroidism, or medication effect.",
  },
  "psa total": {
    summary:
      "Prostate Specific Antigen — screening marker for prostate disease in men (cancer, BPH, prostatitis).",
    high: "Discuss with a urologist; values can rise with infection, BPH, or cancer.",
  },
  "total bilirubin": {
    summary:
      "Hemoglobin breakdown product. Mild elevations (Gilbert's syndrome) are common and benign and may even be antioxidant.",
  },
  alt: {
    summary:
      "Alanine aminotransferase — liver enzyme, sensitive marker of liver-cell injury (fatty liver, alcohol, viral hepatitis, drugs).",
    high: "Most common cause today is nonalcoholic fatty liver disease (NAFLD).",
  },
  ast: {
    summary:
      "Aspartate aminotransferase — liver enzyme also present in muscle. Ratio with ALT helps differentiate causes.",
  },
  "alp alkaline phosphatase": {
    summary:
      "Enzyme from liver, bone, and intestine. Elevated levels suggest bile-duct issues or increased bone turnover.",
  },
  ggt: {
    summary:
      "Gamma-glutamyl transferase — sensitive marker of bile-duct/liver stress and oxidative load, often the first liver enzyme to rise with alcohol or fatty liver.",
  },
  "total protein": { summary: "Sum of albumin and globulins in the blood." },
  albumin: {
    summary:
      "Main blood protein. Reflects nutritional status, liver synthesis, and inflammation. Higher-normal is desirable for healthy aging.",
  },
  creatinine: {
    summary:
      "Muscle metabolism byproduct cleared by the kidneys. Used to estimate kidney filtration (GFR).",
  },
  urea: {
    summary:
      "Nitrogen waste from protein metabolism. Affected by protein intake, hydration, kidney function.",
  },
  "gfr ckd epi": {
    summary:
      "Estimated kidney filtration rate. >90 is normal; chronic decline below 60 defines CKD.",
  },
  "iron serum": {
    summary:
      "Circulating iron level — fluctuates daily. Interpreted with ferritin and transferrin saturation.",
  },
  ferritin: {
    summary:
      "Storage form of iron — and an acute-phase inflammation marker. High ferritin with normal iron often signals inflammation, not iron overload.",
    high: "Can indicate iron overload (hemochromatosis), fatty liver, or systemic inflammation.",
    low: "Low ferritin is the earliest sign of iron-deficiency anemia.",
  },
  transferrin: {
    summary: "Iron-transport protein. Rises with iron deficiency, falls with overload or inflammation.",
  },
  tibc: {
    summary: "Total Iron-Binding Capacity — capacity of transferrin to carry iron.",
  },
  "vitamin d 25 oh": {
    summary:
      "25-hydroxyvitamin D — the storage form, best measure of vitamin D status. Affects bone, immune, and mood.",
    low: "Levels below 50 nmol/L (20 ng/mL) are considered deficient; supplementation often needed.",
  },
  "vitamin b12": {
    summary:
      "Essential for nerve function, methylation, and red-blood-cell production. Falls with age, vegan diet, PPI/metformin use.",
  },
  "folate folic acid": {
    summary: "B-vitamin essential for DNA synthesis and methylation. Works with B12.",
  },
  "magnesium serum": {
    summary:
      "Mineral involved in 300+ enzyme reactions. Serum level is a rough proxy; tissue stores can be low even when serum is normal.",
  },
  "zinc serum": {
    summary: "Essential trace mineral for immunity, taste, hormone production, wound healing.",
  },
  wbc: {
    summary:
      "White blood cell count. Rises with infection, inflammation, stress; falls with viral illness, autoimmune meds, marrow issues.",
  },
  rbc: { summary: "Red blood cell count." },
  hemoglobin: {
    summary:
      "Oxygen-carrying protein in red blood cells. Low = anemia; high = polycythemia or dehydration.",
  },
  hematocrit: {
    summary: "Percentage of blood volume occupied by red blood cells.",
  },
  platelets: {
    summary:
      "Cell fragments that drive clotting. Low platelets bleed; high platelets clot.",
  },
  mcv: { summary: "Average size of a red blood cell. Helps classify anemia (micro/macrocytic)." },
  mch: { summary: "Average hemoglobin content per red blood cell." },
  mchc: { summary: "Average hemoglobin concentration in red cells." },
  "rdw cv": {
    summary:
      "Variation in red-cell size. Elevated RDW often appears before frank anemia and is a general health signal.",
  },
  mpv: { summary: "Mean platelet volume." },
  "neutrophils percent": {
    summary:
      "Main bacterial-infection-fighting white cell, percentage of total WBCs.",
  },
  "neutrophils number": { summary: "Absolute neutrophil count." },
  "lymphocytes percent": {
    summary: "Viral / chronic-infection / immune cells, percentage of total WBCs.",
  },
  "lymphocytes number": { summary: "Absolute lymphocyte count." },
  "monocytes percent": { summary: "Large immune cells, clean-up crew." },
  "monocytes number": { summary: "Absolute monocyte count." },
  "eosinophils percent": {
    summary: "Allergy / parasite white cells. Often elevated with asthma, allergies, parasites.",
  },
  "eosinophils number": { summary: "Absolute eosinophil count." },
  "basophils percent": { summary: "Least common WBC; allergy/inflammation involvement." },
  "basophils number": { summary: "Absolute basophil count." },
  esr: {
    summary:
      "Erythrocyte sedimentation rate — broad, slow-changing inflammation marker.",
  },
  "hs crp": {
    summary:
      "High-sensitivity C-reactive protein — the most useful general inflammation marker, also a cardiovascular-risk signal.",
    high: "Suggests active inflammation (infection, autoimmune, obesity, smoking, recent injury).",
  },
  "ige total": {
    summary: "Total immunoglobulin E. Elevated in allergic disease and parasitic infection.",
  },
} satisfies Record<string, Explanation>;

export type ExplanationKey = keyof typeof ENTRIES;

/** Plain-language text for a marker, in English or Ukrainian. */
export function getExplanation(nameEn: string, lang: "en" | "uk" = "en"): Explanation | null {
  const key = markerKey(nameEn);
  if (!(key in ENTRIES)) return null;
  return lang === "uk" ? ENTRIES_UK[key as ExplanationKey] : ENTRIES[key as ExplanationKey];
}
