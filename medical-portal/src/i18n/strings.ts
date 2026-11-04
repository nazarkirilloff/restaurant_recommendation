import type { ParseErrorCode, Status } from "../types";
import type { Trend } from "../lib/trend";

export type Lang = "en" | "uk";

/** Picks the plural form: Ukrainian has one / few / many ("1 дата", "3 дати", "5 дат"). */
function plural(lang: Lang, n: number, forms: { one: string; few?: string; many: string }): string {
  const rule = new Intl.PluralRules(lang === "uk" ? "uk" : "en").select(n);
  if (rule === "one") return forms.one;
  if (rule === "few") return forms.few ?? forms.many;
  return forms.many;
}

const en = {
  locale: "en-GB",
  langName: "English",
  switchLangLabel: "Українська",
  app: {
    title: "Lab Results Portal",
    intro:
      "Upload a spreadsheet of blood, urine, or stool results to see what's in range, what's off, and how it's trending over time.",
    filtered: "Filtered:",
    filterOutOfRange: "Out-of-range markers",
    filterUnexpected: "Unexpected results",
    clear: "Clear",
    nothingMatches: "Nothing matches the current filter.",
  },
  disclaimer: {
    strong: "Educational visualization only.",
    rest: "Not medical advice. Reference ranges are illustrative — consult your physician.",
    dismiss: "Dismiss disclaimer",
  },
  upload: {
    title: "Upload your lab results",
    reading: "Reading your file…",
    hint: "Drag a file here or click to browse.",
    formats: "Excel (.xlsx), Apple Numbers (.numbers) or CSV",
    privacy: "Your data stays in your browser. Nothing is uploaded or stored.",
    privacyRemembered:
      "Your data stays in your browser. Nothing is uploaded; your last file is kept encrypted on this device because you chose to.",
  },
  remember: {
    optIn: "Remember my last file on this device (encrypted)",
    help: "Encrypted with your passphrase and kept only in this browser. Never uploaded. Off by default.",
    setTitle: "Choose a passphrase",
    passphrase: "Passphrase",
    confirm: "Repeat passphrase",
    setButton: "Turn on",
    tooShort: (n: number) => `Use at least ${n} characters.`,
    mismatch: "The passphrases don't match.",
    noRecovery:
      "A forgotten passphrase can't be recovered — you'd forget the saved copy and open the file again.",
    armed: "On. The next file you open is saved encrypted on this device.",
    lockedTitle: "A saved file is on this device (encrypted)",
    unlock: "Open saved file",
    unlocking: "Unlocking…",
    wrong: "Wrong passphrase, or the saved copy was changed.",
    forget: "Forget it",
    forgetTitle: "Delete the saved copy from this device",
  },
  errors: {
    unsupportedType: (ext?: string) => ({
      message: `Unsupported file type${ext ? ` “.${ext}”` : ""}.`,
      detail: "Upload an .xlsx, .numbers or .csv file.",
    }),
    tooLarge: () => ({
      message: "This file is too large.",
      detail: "Lab result files are usually well under 20 MB.",
    }),
    unreadable: () => ({ message: "Could not read this file.", detail: undefined }),
    numbersUnreadable: () => ({
      message: "Could not read this Numbers file.",
      detail: "In Numbers choose File → Export To → Excel…, then upload that file.",
    }),
    noResultSheets: () => ({
      message: "No result sheets found in this file.",
      detail:
        "Expected a header row with a marker-name column (e.g. “Marker EN”) followed by date columns such as 2024-03-11, one row per marker.",
    }),
  } satisfies Record<ParseErrorCode, (ext?: string) => { message: string; detail?: string }>,
  topBar: {
    measurements: (n: number) =>
      `${n.toLocaleString("en-GB")} ${plural("en", n, { one: "measurement", many: "measurements" })}`,
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
    newFile: "New file",
    language: "Interface language",
  },
  mode: {
    group: "Reference ranges",
    standard: "Standard medical",
    biohacker: "Biohacker",
  },
  tabs: { group: "Result sheets" },
  units: {
    group: "Units",
    si: "SI",
    us: "US",
    siTitle: "SI units, as in your file (mmol/L, µmol/L)",
    usTitle: "US conventional units (mg/dL, ng/mL)",
  },
  summary: {
    markers: "Markers",
    testDates: (n: number) => `${n} test ${plural("en", n, { one: "date", many: "dates" })}`,
    outOfRange: "Out of range",
    vsStandard: "vs Standard range",
    vsBiohacker: "vs Biohacker target",
    useStandard: (n: number) => `${n} use Standard (no target)`,
    unexpected: "Unexpected",
    qualitative: "Qualitative results",
    latestTest: "Latest test",
  },
  category: {
    toggle: (name: string) => `Show or hide ${name}`,
    off: (n: number) => `${n} off`,
  },
  row: {
    noBiohackerTarget: "Standard · no biohacker target",
    standard: "Standard:",
    biohacker: "Biohacker:",
    latest: "Latest:",
    noTarget: "no target",
    date: "Date",
    value: "Value",
    status: "Status",
  },
  status: {
    low: "Low",
    high: "High",
    normal: "In range",
    match: "As expected",
    mismatch: "Unexpected",
    borderline: "Borderline",
    info: "Info",
    unknown: "No verdict",
  } satisfies Record<Status, string>,
  statusAria: (label: string) => `Status: ${label}`,
  trend: (t: Trend) =>
    `${t.direction === "up" ? "Up" : "Down"} ${t.amount} since previous result` +
    (t.crossing === "into"
      ? " — now within range"
      : t.crossing === "outOf"
        ? " — now outside range"
        : t.tone === "better"
          ? " — moving toward range"
          : t.tone === "worse"
            ? " — moving away from range"
            : ""),
  chart: {
    noNumeric: "No numeric measurements to chart.",
    activeRange: "Active range",
    otherRange: "Other range",
    detectionLimit: "Detection limit (true value is beyond it)",
    belowLimit: "Below the lab's detection limit — plotted at the limit",
    aboveLimit: "Above the lab's measurable limit — plotted at the limit",
  },
  explanation: {
    whatItIs: "What it is.",
    aboveRange: "Above range.",
    belowRange: "Below range.",
    standardNote: "Standard note:",
    biohackerNote: "Biohacker note:",
  },
  readme: { about: "About this dataset" },
  search: {
    label: "Search markers",
    placeholder: "Search markers (English or Ukrainian)…",
    shortcut: "Press / to search",
    clear: "Clear search",
    results: (n: number) =>
      n === 0 ? "No markers match" : `${n} ${plural("en", n, { one: "marker", many: "markers" })}`,
    alsoIn: "Also in:",
  },
  report: {
    open: "Report",
    openTitle: "Doctor report — print or save as PDF",
    title: "Lab results summary",
    file: "File",
    prepared: "Prepared",
    ranges: "Judged against",
    latestTest: "Latest test",
    attention: "Needs attention",
    backInRange: "Back in range since the previous test",
    noAttention: "Nothing out of range or unexpected in the latest results.",
    okCount: (n: number) =>
      `${n} other ${plural("en", n, { one: "marker is", many: "markers are" })} within range.`,
    otherCount: (n: number) =>
      `${n} ${plural("en", n, { one: "marker has", many: "markers have" })} no range to judge against (informational).`,
    marker: "Marker",
    latest: "Latest",
    previous: "Previous",
    change: "Change",
    range: "Range",
    status: "Status",
    fallback: "standard range (no biohacker target)",
    back: "Back to dashboard",
    print: "Print / save as PDF",
    disclaimer:
      "Prepared from the patient's own spreadsheet with Lab Results Portal. An educational summary, not a diagnosis; reference ranges are those given in the file.",
  },
  footer: {
    privacy: "Your data stays in your browser. Nothing is uploaded or stored.",
    version: "Lab Results Portal · v0.1",
  },
};

export type Strings = typeof en;

const uk: Strings = {
  locale: "uk-UA",
  langName: "Українська",
  switchLangLabel: "English",
  app: {
    title: "Портал результатів аналізів",
    intro:
      "Завантажте таблицю з результатами аналізів крові, сечі чи калу, щоб побачити, що в нормі, що поза нею і як показники змінюються з часом.",
    filtered: "Фільтр:",
    filterOutOfRange: "Показники поза нормою",
    filterUnexpected: "Неочікувані результати",
    clear: "Скинути",
    nothingMatches: "Нічого не відповідає поточному фільтру.",
  },
  disclaimer: {
    strong: "Лише для ознайомлення.",
    rest: "Це не медична порада. Референтні діапазони орієнтовні — проконсультуйтеся з лікарем.",
    dismiss: "Закрити попередження",
  },
  upload: {
    title: "Завантажте результати аналізів",
    reading: "Читаю файл…",
    hint: "Перетягніть файл сюди або натисніть, щоб вибрати.",
    formats: "Excel (.xlsx), Apple Numbers (.numbers) або CSV",
    privacy: "Дані залишаються у вашому браузері. Нічого не завантажується і не зберігається.",
    privacyRemembered:
      "Дані залишаються у вашому браузері. Нічого не завантажується; останній файл зберігається зашифрованим на цьому пристрої, бо ви так обрали.",
  },
  remember: {
    optIn: "Запам'ятати останній файл на цьому пристрої (зашифровано)",
    help: "Шифрується вашою парольною фразою і зберігається лише в цьому браузері. Ніколи не завантажується. За замовчуванням вимкнено.",
    setTitle: "Оберіть парольну фразу",
    passphrase: "Парольна фраза",
    confirm: "Повторіть парольну фразу",
    setButton: "Увімкнути",
    tooShort: (n: number) => `Щонайменше ${n} символів.`,
    mismatch: "Парольні фрази не збігаються.",
    noRecovery:
      "Забуту парольну фразу неможливо відновити — доведеться забути збережену копію й відкрити файл знову.",
    armed: "Увімкнено. Наступний відкритий файл буде збережено зашифрованим на цьому пристрої.",
    lockedTitle: "На цьому пристрої є збережений файл (зашифровано)",
    unlock: "Відкрити збережений файл",
    unlocking: "Розшифровую…",
    wrong: "Неправильна парольна фраза або збережену копію змінено.",
    forget: "Забути",
    forgetTitle: "Видалити збережену копію з цього пристрою",
  },
  errors: {
    unsupportedType: (ext?: string) => ({
      message: `Непідтримуваний тип файлу${ext ? ` «.${ext}»` : ""}.`,
      detail: "Завантажте файл .xlsx, .numbers або .csv.",
    }),
    tooLarge: () => ({
      message: "Файл завеликий.",
      detail: "Файли з результатами аналізів зазвичай значно менші за 20 МБ.",
    }),
    unreadable: () => ({ message: "Не вдалося прочитати файл.", detail: undefined }),
    numbersUnreadable: () => ({
      message: "Не вдалося прочитати файл Numbers.",
      detail: "У Numbers виберіть Файл → Експортувати в → Excel…, потім завантажте цей файл.",
    }),
    noResultSheets: () => ({
      message: "У файлі не знайдено аркушів із результатами.",
      detail:
        "Очікується рядок заголовків зі стовпцем назви показника (напр. «Marker EN») і стовпцями дат, як-от 2024-03-11; один рядок на показник.",
    }),
  },
  topBar: {
    measurements: (n: number) =>
      `${n.toLocaleString("uk-UA")} ${plural("uk", n, { one: "вимірювання", few: "вимірювання", many: "вимірювань" })}`,
    toLight: "Світла тема",
    toDark: "Темна тема",
    newFile: "Інший файл",
    language: "Мова інтерфейсу",
  },
  mode: {
    group: "Референтні діапазони",
    standard: "Медична норма",
    biohacker: "Біохакер",
  },
  tabs: { group: "Аркуші з результатами" },
  units: {
    group: "Одиниці",
    si: "SI",
    us: "US",
    siTitle: "Одиниці SI, як у файлі (ммоль/л, мкмоль/л)",
    usTitle: "Американські одиниці (мг/дл, нг/мл)",
  },
  summary: {
    markers: "Показники",
    testDates: (n: number) => `${n} ${plural("uk", n, { one: "дата", few: "дати", many: "дат" })} аналізів`,
    outOfRange: "Поза нормою",
    vsStandard: "за медичною нормою",
    vsBiohacker: "за ціллю біохакера",
    useStandard: (n: number) => `${n} — за медичною нормою (цілі немає)`,
    unexpected: "Неочікувані",
    qualitative: "Якісні результати",
    latestTest: "Останній аналіз",
  },
  category: {
    toggle: (name: string) => `Показати або сховати: ${name}`,
    off: (n: number) => `${n} поза нормою`,
  },
  row: {
    noBiohackerTarget: "Медична норма · цілі біохакера немає",
    standard: "Норма:",
    biohacker: "Біохакер:",
    latest: "Останній:",
    noTarget: "немає цілі",
    date: "Дата",
    value: "Значення",
    status: "Статус",
  },
  status: {
    low: "Низький",
    high: "Високий",
    normal: "У нормі",
    match: "Як очікувалось",
    mismatch: "Неочікувано",
    borderline: "Межовий",
    info: "Інфо",
    unknown: "Без оцінки",
  },
  statusAria: (label: string) => `Статус: ${label}`,
  trend: (t: Trend) =>
    `${t.direction === "up" ? "Зріс на" : "Знизився на"} ${t.amount.replace(".", ",")} від попереднього результату` +
    (t.crossing === "into"
      ? " — тепер у нормі"
      : t.crossing === "outOf"
        ? " — тепер поза нормою"
        : t.tone === "better"
          ? " — наближається до норми"
          : t.tone === "worse"
            ? " — віддаляється від норми"
            : ""),
  chart: {
    noNumeric: "Немає числових значень для графіка.",
    activeRange: "Активний діапазон",
    otherRange: "Інший діапазон",
    detectionLimit: "Межа виявлення (справжнє значення за нею)",
    belowLimit: "Нижче межі виявлення лабораторії — показано на межі",
    aboveLimit: "Вище межі вимірювання лабораторії — показано на межі",
  },
  explanation: {
    whatItIs: "Що це.",
    aboveRange: "Вище норми.",
    belowRange: "Нижче норми.",
    standardNote: "Примітка до норми:",
    biohackerNote: "Примітка біохакера:",
  },
  readme: { about: "Про ці дані" },
  search: {
    label: "Пошук показників",
    placeholder: "Пошук показників (українською чи англійською)…",
    shortcut: "Натисніть / для пошуку",
    clear: "Очистити пошук",
    results: (n: number) =>
      n === 0
        ? "Нічого не знайдено"
        : `${n} ${plural("uk", n, { one: "показник", few: "показники", many: "показників" })}`,
    alsoIn: "Також у:",
  },
  report: {
    open: "Звіт",
    openTitle: "Звіт для лікаря — друк або збереження в PDF",
    title: "Підсумок результатів аналізів",
    file: "Файл",
    prepared: "Складено",
    ranges: "Оцінено за",
    latestTest: "Останній аналіз",
    attention: "Потребує уваги",
    backInRange: "Повернулися в норму з попереднього аналізу",
    noAttention: "В останніх результатах немає показників поза нормою чи неочікуваних.",
    okCount: (n: number) =>
      `Ще ${n} ${plural("uk", n, { one: "показник", few: "показники", many: "показників" })} у нормі.`,
    otherCount: (n: number) =>
      `${n} ${plural("uk", n, { one: "показник не має", few: "показники не мають", many: "показників не мають" })} діапазону для оцінки (довідково).`,
    marker: "Показник",
    latest: "Останній",
    previous: "Попередній",
    change: "Зміна",
    range: "Діапазон",
    status: "Статус",
    fallback: "медична норма (цілі біохакера немає)",
    back: "До панелі",
    print: "Друк / зберегти в PDF",
    disclaimer:
      "Складено з власної таблиці пацієнта за допомогою Порталу результатів аналізів. Ознайомчий підсумок, не діагноз; референтні діапазони взято з файлу.",
  },
  footer: {
    privacy: "Дані залишаються у вашому браузері. Нічого не завантажується і не зберігається.",
    version: "Портал результатів аналізів · v0.1",
  },
};

export const STRINGS: Record<Lang, Strings> = { en, uk };
