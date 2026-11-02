import { useEffect, useMemo, useState } from "react";
import { Disclaimer } from "./components/Disclaimer";
import { TopBar } from "./components/TopBar";
import { FileUpload } from "./components/FileUpload";
import { ReadmePanel } from "./components/ReadmePanel";
import { SHEET_PANEL_ID, SheetTabs, sheetTabId } from "./components/SheetTabs";
import { Summary, type FilterKey } from "./components/Summary";
import { CategorySection } from "./components/CategorySection";
import { Footer } from "./components/Footer";
import { isOutOfRange, latestStatus } from "./lib/ranges";
import { matchesQuery, searchByCategory } from "./lib/search";
import { SearchBox } from "./components/SearchBox";
import { Report } from "./components/Report";
import { useI18n } from "./i18n/I18n";
import { LanguageToggle } from "./components/LanguageToggle";
import type { Marker, ParsedWorkbook, RangeMode } from "./types";

function useTheme(): ["light" | "dark", () => void] {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

export default function App() {
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [mode, setMode] = useState<RangeMode>("standard");
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"dashboard" | "report">("dashboard");
  const [theme, toggleTheme] = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    if (workbook && !activeSheet && workbook.data[0]) {
      setActiveSheet(workbook.data[0].name);
    }
  }, [workbook, activeSheet]);

  const measurementCount = useMemo(() => {
    if (!workbook) return 0;
    return workbook.data.reduce(
      (acc, s) => acc + s.markers.reduce((a, m) => a + m.measurements.length, 0),
      0,
    );
  }, [workbook]);

  const currentSheet =
    workbook?.data.find((s) => s.name === activeSheet) ?? workbook?.data[0];

  // Whether the query should also match category names (see searchByCategory).
  const byCategory = useMemo(
    () => !!workbook && searchByCategory(workbook.data.flatMap((s) => s.markers), query),
    [workbook, query],
  );

  const filteredCategories = useMemo(() => {
    if (!currentSheet) return [];
    const out: { category: string; markers: Marker[]; outOfRangeCount: number }[] = [];
    for (const category of currentSheet.categories) {
      const inCat = currentSheet.markers.filter((m) => m.category === category);
      const decorated = inCat.map((m) => ({ m, status: latestStatus(m, mode) }));
      const visible = decorated.filter(({ m, status }) => {
        if (!matchesQuery(m, query, byCategory)) return false;
        if (filter === "outOfRange") return isOutOfRange(status);
        if (filter === "qualitativeFail") return status === "mismatch";
        return true;
      });
      if (visible.length === 0) continue;
      out.push({
        category,
        markers: visible.map((d) => d.m),
        outOfRangeCount: decorated.filter(({ status }) => isOutOfRange(status)).length,
      });
    }
    return out;
  }, [currentSheet, filter, mode, query, byCategory]);

  const matchCount = filteredCategories.reduce((n, c) => n + c.markers.length, 0);
  const matchesElsewhere = useMemo(() => {
    if (!workbook || !currentSheet || query.trim() === "") return [];
    return workbook.data
      .filter((s) => s.name !== currentSheet.name)
      .map((s) => ({
        sheet: s.name,
        count: s.markers.filter((m) => matchesQuery(m, query, byCategory)).length,
      }))
      .filter((x) => x.count > 0);
  }, [workbook, currentSheet, query, byCategory]);

  if (!workbook) {
    return (
      <div className="min-h-screen">
        <Disclaimer />
        <main className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center gap-8 px-4 py-12">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <LanguageToggle />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {t.app.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 md:text-base">
              {t.app.intro}
            </p>
          </div>
          <FileUpload onLoaded={setWorkbook} />
        </main>
        <Footer />
      </div>
    );
  }

  if (view === "report") {
    return <Report workbook={workbook} mode={mode} onBack={() => setView("dashboard")} />;
  }

  return (
    <div className="min-h-screen">
      <Disclaimer />
      <TopBar
        fileName={workbook.fileName}
        measurementCount={measurementCount}
        mode={mode}
        onModeChange={setMode}
        onReset={() => {
          setWorkbook(null);
          setActiveSheet(null);
          setFilter(null);
          setQuery("");
          setView("dashboard");
        }}
        theme={theme}
        onThemeToggle={toggleTheme}
        onReport={() => setView("report")}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="space-y-6">
          <ReadmePanel info={workbook.info} />

          {workbook.data.length > 1 && (
            <SheetTabs
              sheets={workbook.data}
              active={activeSheet ?? workbook.data[0].name}
              onChange={(name) => {
                setActiveSheet(name);
                setFilter(null);
              }}
            />
          )}

          {currentSheet && (
            <div
              className="space-y-6"
              {...(workbook.data.length > 1
                ? {
                    role: "tabpanel",
                    id: SHEET_PANEL_ID,
                    "aria-labelledby": sheetTabId(currentSheet.name),
                  }
                : {})}
            >
              <Summary
                sheet={currentSheet}
                mode={mode}
                filter={filter}
                onFilter={setFilter}
              />

              <SearchBox
                value={query}
                onChange={setQuery}
                count={matchCount}
                elsewhere={matchesElsewhere}
                onJump={(name) => {
                  setActiveSheet(name);
                  setFilter(null);
                }}
              />

              {filter && (
                <div
                  aria-live="polite"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  {t.app.filtered}{" "}
                  <span className="font-medium">
                    {filter === "outOfRange" ? t.app.filterOutOfRange : t.app.filterUnexpected}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilter(null)}
                    className="ml-2 text-teal-700 hover:underline dark:text-teal-300"
                  >
                    {t.app.clear}
                  </button>
                </div>
              )}

              <div className="space-y-6">
                {filteredCategories.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {t.app.nothingMatches}
                  </div>
                ) : (
                  filteredCategories.map(({ category, markers, outOfRangeCount }) => (
                    <CategorySection
                      key={category}
                      category={category}
                      markers={markers}
                      mode={mode}
                      outOfRangeCount={outOfRangeCount}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
